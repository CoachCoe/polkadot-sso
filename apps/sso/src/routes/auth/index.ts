import { Request, Router } from 'express';
import { Database } from 'sqlite';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { createRateLimiters } from '../../middleware/rateLimit.js';
import { nonceMiddleware } from '../../middleware/security.js';
import { sanitizeRequest, validateBody, validateQuery } from '../../middleware/validation.js';
import { AuditService } from '../../services/auditService.js';
import { ChallengeService } from '../../services/challengeService.js';
import { TokenService } from '../../services/token.js';
import { Client } from '../../types/auth.js';
import { AuthenticationError, NotFoundError, ValidationError } from '../../utils/errors.js';
import { schemas } from '../../utils/schemas.js';
import { createLoginHandler, createTokenHandler, createVerifyHandler } from './handlers.js';
import { generateApiDocsPage, generateAuthSelectionPage, generateChallengePage } from './templates.js';

type RateLimiters = ReturnType<typeof createRateLimiters>;

export const createAuthRouter = (
  tokenService: TokenService,
  challengeService: ChallengeService,
  auditService: AuditService,
  clients: Map<string, Client>,
  db: Database,
  rateLimiters: RateLimiters
) => {
  const router = Router();

  const loginHandler = createLoginHandler(
    tokenService,
    challengeService,
    auditService,
    clients,
    db
  );
  const verifyHandler = createVerifyHandler(challengeService, auditService, clients, db);
  const tokenHandler = createTokenHandler(tokenService, auditService, db, clients);

  router.get(
    '/select',
    rateLimiters.challenge,
    sanitizeRequest(),
    nonceMiddleware,
    validateQuery(schemas.challengeQuery),
    asyncHandler(async (req, res) => {
      const { client_id } = req.query;
      const requestId = (req as Request & { requestId?: string }).requestId;
      const nonce = (req as Request & { nonce?: string }).nonce;

      if (!client_id) {
        throw new ValidationError('client_id is required', undefined, requestId);
      }

      const client = clients.get(client_id as string);
      if (!client) {
        throw new NotFoundError(`Client '${client_id}' not found`, undefined, requestId);
      }

      res.send(generateAuthSelectionPage(client_id as string, nonce || ''));
    })
  );

  router.get(
    '/challenge',
    rateLimiters.challenge,
    sanitizeRequest(),
    nonceMiddleware,
    validateQuery(schemas.challengeQuery),
    asyncHandler(async (req, res) => {
      const { client_id, address } = req.query;
      const requestId = (req as Request & { requestId?: string }).requestId;

      if (!client_id) {
        throw new ValidationError('Client ID is required', { field: 'client_id' }, requestId);
      }

      const client = clients.get(client_id as string);
      if (!client) {
        throw new AuthenticationError('Invalid client', { client_id }, requestId);
      }

      const challenge = await challengeService.generateChallenge(
        client_id as string,
        address as string
      );

      const html = generateChallengePage(
        {
          address: address as string,
          message: challenge.message,
          challengeId: challenge.id,
          codeVerifier: challenge.code_verifier,
          state: challenge.state,
          nonce: res.locals.nonce,
        },
        res.locals.nonce
      );

      res.send(html);
    })
  );

  router.get('/docs', (_req, res) => {
    const html = generateApiDocsPage();
    res.send(html);
  });

  router.get(
    '/status/:challengeId',
    rateLimiters.status,
    sanitizeRequest(),
    asyncHandler(async (req, res) => {
      const { challengeId } = req.params;
      const requestId = (req as Request & { requestId?: string }).requestId;

      if (!challengeId) {
        throw new ValidationError('Challenge ID is required', { field: 'challengeId' }, requestId);
      }

      const challenge = await challengeService.getChallenge(challengeId);

      if (!challenge) {
        throw new NotFoundError('Challenge not found', { challengeId }, requestId);
      }

      const now = Date.now();
      const expiresAt = new Date(challenge.expires_at).getTime();

      if (now > expiresAt) {
        return res.status(200).json({
          status: 'expired',
          message: 'Challenge has expired',
          expiresAt: challenge.expires_at_timestamp
        });
      }

      if (challenge.used) {
        return res.status(200).json({
          status: 'used',
          message: 'Challenge has already been used',
          expiresAt: challenge.expires_at_timestamp
        });
      }

      return res.status(200).json({
        status: 'pending',
        message: 'Challenge is pending verification',
        expiresAt: challenge.expires_at_timestamp,
        challengeId: challenge.id
      });
    })
  );

  router.get(
    '/login',
    rateLimiters.login,
    sanitizeRequest(),
    validateQuery(schemas.challengeQuery),
    loginHandler
  );

  router.get(
    '/verify',
    rateLimiters.verify,
    sanitizeRequest(),
    validateQuery(schemas.verificationQuery),
    verifyHandler
  );

  router.post(
    '/verify',
    rateLimiters.verify,
    sanitizeRequest(),
    validateQuery(schemas.verificationQuery),
    verifyHandler
  );

  router.post(
    '/token',
    rateLimiters.token,
    sanitizeRequest(),
    validateBody(schemas.tokenRequest),
    tokenHandler
  );

  router.get('/callback', (req, res) => {
    const { code, state, error } = req.query;

    if (error) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Authentication Failed</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .error { color: #d32f2f; background: #ffebee; padding: 20px; border-radius: 8px; }
          </style>
        </head>
        <body>
          <h1>Authentication Failed</h1>
          <div class="error">
            <p>Error: ${error}</p>
            <p><a href="/api-docs/">Return to API Documentation</a></p>
          </div>
        </body>
        </html>
      `);
    }

    if (!code || !state) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Authentication Error</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .error { color: #d32f2f; background: #ffebee; padding: 20px; border-radius: 8px; }
          </style>
        </head>
        <body>
          <h1>Authentication Error</h1>
          <div class="error">
            <p>Missing authorization code or state</p>
            <p><a href="/api-docs/">Return to API Documentation</a></p>
          </div>
        </body>
        </html>
      `);
    }

    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Authentication Successful</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
          .success { color: #2e7d32; background: #e8f5e8; padding: 20px; border-radius: 8px; }
          .code { background: #f5f5f5; padding: 10px; border-radius: 4px; font-family: monospace; word-break: break-all; }
        </style>
      </head>
      <body>
        <h1>🎉 Authentication Successful!</h1>
        <div class="success">
          <p>Your Polkadot.js authentication was successful!</p>
          <p><strong>Authorization Code:</strong></p>
          <div class="code">${code}</div>
          <p><strong>State:</strong> ${state}</p>
          <hr>
          <p><strong>Next Steps:</strong></p>
          <p>1. Use the authorization code above to exchange for tokens</p>
          <p>2. Make a POST request to <code>/api/auth/token</code> with the code</p>
          <p>3. Use the returned access token for authenticated requests</p>
          <hr>
          <p><a href="/api-docs/">📚 View API Documentation</a></p>
          <p><a href="/api/auth/challenge?client_id=demo-client&address=5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY">🔄 Try Another Authentication</a></p>
        </div>
      </body>
      </html>
    `);
  });

  router.get('/session', rateLimiters.status, sanitizeRequest(), async (req, res) => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authorization header required' });
      }

      const token = authHeader.substring(7);
      const verificationResult = await tokenService.verifyToken(token, 'access');

      if (!verificationResult.valid || !verificationResult.session) {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }

      const session = verificationResult.session;

      return res.json({
        user: {
          address: session.address,
          chain: 'westend',  
          wallet: 'polkadot-js',  
        },
        accessToken: token,
        refreshToken: session.refresh_token,
        expiresAt: new Date(session.access_token_expires_at).toISOString(),
      });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to get session' });
    }
  });

  router.post('/logout', rateLimiters.logout, sanitizeRequest(), async (req, res) => {
    try {
      const { access_token } = req.body;

      if (!access_token) {
        return res.status(400).json({ error: 'Access token required' });
      }

      await tokenService.invalidateSession(access_token);

      await auditService.log({
        type: 'SECURITY_EVENT',
        user_address: req.body.address,
        client_id: req.body.client_id || 'unknown',
        action: 'session_invalidated',
        status: 'success',
        details: { access_token: access_token.substring(0, 16) + '...' },
        ip_address: req.ip || 'unknown',
        user_agent: req.get('User-Agent'),
      });

      return res.json({ message: 'Logged out successfully' });
    } catch (error) {
      return res.status(500).json({ error: 'Logout failed' });
    }
  });

  return router;
};
