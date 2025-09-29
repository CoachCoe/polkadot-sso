import crypto, { createHash } from 'crypto';
import { RequestHandler } from 'express';
import { Database } from 'sqlite';
import { AuditService } from '../../services/auditService.js';
import { ChallengeService } from '../../services/challengeService.js';
import { TokenService } from '../../services/token.js';
import { Client } from '../../types/auth.js';
import { createLogger, logError, logRequest } from '../../utils/logger.js';
import { validateAuthRequest, validateClientCredentials } from '../../utils/validation.js';
import { verifySignature as cryptoVerifySignature } from '../../utils/crypto.js';

const logger = createLogger('auth-handlers');

interface AuthCode {
  code: string;
  address: string;
  client_id: string;
  created_at: number;
  expires_at: number;
  used: number;
}

function generateCodeChallenge(verifier: string): string {
  const hash = createHash('sha256');
  hash.update(verifier);
  return hash.digest('base64url');
}

function verifySignature(message: string, signature: string, address: string): boolean {
  return cryptoVerifySignature(message, signature, address);
}

export const createLoginHandler = (
  _tokenService: TokenService,
  challengeService: ChallengeService,
  auditService: AuditService,
  clients: Map<string, Client>,
  _db: Database
): RequestHandler => {
  return async (req, res) => {
    try {
      logRequest(req, 'Login attempt', { address: req.query.address });
      const validation = validateAuthRequest(req);
      if (!validation.isValid) {
        logError(req, new Error(validation.error || 'Validation failed'));
        return res.status(400).json({ error: validation.error });
      }

      const { client_id, wallet } = req.query;
      const client = clients.get(client_id as string);

      if (!client) {
        logError(req, new Error('Invalid client'));
        return res.status(400).json({ error: 'Invalid client' });
      }

      const challenge = await challengeService.generateChallenge(
        client_id as string,
        req.query.address as string
      );

      await auditService.log({
        type: 'AUTH_ATTEMPT',
        user_address: req.query.address as string,
        client_id: client_id as string,
        action: 'challenge_generated',
        status: 'success',
        details: { wallet },
        ip_address: req.ip || 'unknown',
        user_agent: req.get('User-Agent'),
      });

      return res.json({
        challenge_id: challenge.id,
        message: challenge.message,
        code_verifier: challenge.code_verifier,
        state: challenge.state,
        expires_at: challenge.expires_at,
      });
    } catch (error) {
      logError(req, error as Error);
      return res.status(500).json({ error: 'Login failed' });
    }
  };
};

export const createVerifyHandler = (
  challengeService: ChallengeService,
  auditService: AuditService,
  clients: Map<string, Client>,
  db: Database
): RequestHandler => {
  return async (req, res) => {
    try {
      const { signature, challenge_id, address, code_verifier, state } = req.query;

      logger.info('Verification request received', {
        signaturePreview:
          signature && typeof signature === 'string' ? signature.substring(0, 20) : 'undefined',
        challenge_id,
        address,
        codeVerifierPreview:
          code_verifier && typeof code_verifier === 'string'
            ? code_verifier.substring(0, 20)
            : 'undefined',
        state,
      });

      if (!signature || !challenge_id || !address || !code_verifier || !state) {
        return res.status(400).send('Missing required parameters');
      }

      const challenge = await challengeService.getChallenge(challenge_id as string);

      logger.info('Challenge retrieved', {
        id: challenge?.id,
        messageLength: challenge?.message?.length,
        state: challenge?.state,
        expectedState: state,
        used: challenge?.used,
      });

      if (!challenge || challenge.state !== state) {
        return res.status(400).send('Invalid challenge or state mismatch');
      }

      const code_challenge = generateCodeChallenge(code_verifier as string);

      let storedChallenge = challenge.code_challenge;
      let calculatedChallengeHex = Buffer.from(code_challenge, 'base64url').toString('hex');

      const isHex = /^[a-f0-9]+$/.test(storedChallenge);

      logger.info('Code verifier validation', {
        providedVerifier: code_verifier,
        calculatedChallenge: code_challenge,
        calculatedChallengeHex,
        storedChallenge: challenge.code_challenge,
        storedVerifier: challenge.code_verifier,
        isStoredHex: isHex,
        matches: isHex ? (calculatedChallengeHex === storedChallenge) : (code_challenge === storedChallenge)
      });

      const matches = isHex
        ? (calculatedChallengeHex === storedChallenge)
        : (code_challenge === storedChallenge);

      if (!matches) {
        return res.status(400).send('Invalid code verifier');
      }

      if (!verifySignature(challenge.message, signature as string, String(address))) {
        return res.status(401).send('Invalid signature');
      }

      await challengeService.markChallengeUsed(challenge_id as string);

      const authCode = crypto.randomBytes(32).toString('hex');
      await db.run(
        `INSERT INTO auth_codes (
         code, address, client_id, created_at, expires_at
       ) VALUES (?, ?, ?, ?, ?)`,
        [authCode, address, challenge.client_id, Date.now(), Date.now() + 5 * 60 * 1000]
      );

      const client = clients.get(challenge.client_id);
      if (!client) {
        return res.status(400).send('Invalid client');
      }

      await auditService.log({
        type: 'CHALLENGE_VERIFIED',
        user_address: address as string,
        client_id: challenge.client_id,
        action: 'signature_verified',
        status: 'success',
        details: { challenge_id },
        ip_address: req.ip || 'unknown',
        user_agent: req.get('User-Agent'),
      });

      const redirectUrl = `${client.redirect_url}?code=${authCode}&state=${state}`;

      if (req.headers.accept?.includes('application/json')) {
        return res.json({ success: true, redirectUrl });
      }

      return res.redirect(redirectUrl);
    } catch (error) {
      logError(req, error as Error);
      logger.error('Verification handler error', {
        error: error instanceof Error ? error.message : String(error),
      });
      return res.status(500).json({ error: 'Verification failed' });
    }
  };
};

export const createTokenHandler = (
  tokenService: TokenService,
  auditService: AuditService,
  db: Database,
  clients: Map<string, Client>
): RequestHandler => {
  return async (req, res) => {
    try {
      const { code, client_id } = req.body;

      if (!code || typeof code !== 'string') {
        return res.status(400).send('Invalid code');
      }
      if (!client_id || typeof client_id !== 'string') {
        return res.status(400).send('Invalid client_id');
      }

      const client = await validateClientCredentials(req, clients);
      if (!client) {
        return res.status(401).send('Invalid client credentials');
      }

      const authCode = await db.get('SELECT * FROM auth_codes WHERE code = ? AND client_id = ? AND used = 0', [code, client_id]);
      if (!authCode || Date.now() > (authCode.expires_at as number)) {
        return res.status(400).send('Invalid or expired authorization code');
      }

      if (
        !authCode ||
        typeof authCode !== 'object' ||
        !('address' in authCode) ||
        !('expires_at' in authCode)
      ) {
        return res.status(400).send('Invalid authorization code format');
      }

      const typedAuthCode = authCode as AuthCode;
      if (Date.now() > typedAuthCode.expires_at) {
        return res.status(400).send('Authorization code expired');
      }

      const session = await tokenService.createSession(typedAuthCode.address, client_id);
      if (!session) {
        return res.status(500).send('Failed to create session');
      }

      await auditService.log({
        type: 'TOKEN_EXCHANGE',
        user_address: typedAuthCode.address,
        client_id,
        action: 'token_issued',
        status: 'success',
        details: { code },
        ip_address: req.ip || 'unknown',
        user_agent: req.get('User-Agent'),
      });

      return res.json({
        access_token: session.access_token,
        token_type: 'Bearer',
        expires_in: 900,  
        refresh_token: session.refresh_token,
      });
    } catch (error) {
      logError(req, error as Error);
      return res.status(500).json({ error: 'Token exchange failed' });
    }
  };
};
