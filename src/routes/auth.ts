import { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import { TokenService } from '../services/token';
import { ChallengeService } from '../services/challengeService';
import { authLimiter } from '../config/auth';
import { Client, Challenge } from '../types/auth';
import { cryptoWaitReady, signatureVerify } from '@polkadot/util-crypto';
import { validateAuthRequest, validateSignature, validateClientCredentials } from '../utils/validation';
import crypto from 'crypto';
import { Database } from 'sqlite';
import { createHash } from 'crypto';
import { sanitizeRequest } from '../middleware/validation';
import { AuditService } from '../services/auditService';
import { escapeHtml } from '../utils/sanitization';
import { rateLimiters } from '../middleware/rateLimit';
import { secureQueries } from '../utils/db';
import { z } from 'zod';
import { validateBody } from '../middleware/validation';
import { logRequest, logError } from '../utils/logger';

// Add schemas at the top of the file
const loginSchema = z.object({
  address: z.string().min(1),
  client_id: z.string().min(1)
});

const tokenSchema = z.object({
  code: z.string().min(32).max(64),
  client_id: z.string().min(1),
  client_secret: z.string().min(32)
});

async function generateCodeChallenge(verifier: string): Promise<string> {
  const hash = createHash('sha256');
  hash.update(verifier);
  return hash.digest('base64url');
}

export const createAuthRouter = (
 tokenService: TokenService,
 challengeService: ChallengeService & { generateChallenge(client_id: string): Promise<Challenge> },
 auditService: AuditService,
 clients: Map<string, Client>,
 db: Database
) => {
 const router = Router();

 const loginHandler: RequestHandler = async (req, res) => {
   try {
     logRequest(req, 'Login attempt', { address: req.query.address });
     const validation = validateAuthRequest(req);
     if (!validation.isValid) {
       return res.status(400).send(validation.error);
     }

     const { client_id } = req.query;
     const client = clients.get(client_id as string);
     
     if (!client) {
       return res.status(400).send('Invalid client');
     }
     
     const escapedClientId = JSON.stringify(client_id);
     const escapedAppName = JSON.stringify(client.name);
     
     await auditService.log({
       type: 'AUTH_ATTEMPT',
       client_id: client_id as string,
       action: 'LOGIN_INITIATED',
       status: 'success',
       ip_address: req.ip || 'unknown',
       user_agent: req.get('user-agent') || 'unknown'
     });

     res.send(`
      <html>
        <head>
          <title>${client.name}</title>
          <link rel="stylesheet" href="/styles/main.css">
          <link rel="icon" type="image/x-icon" href="/favicon.ico">
          <script nonce="${res.locals.nonce}">
            window.SSO_CONFIG = {
              clientId: ${escapedClientId},
              appName: ${escapedAppName}
            };
          </script>
        </head>
        <body>
          <header class="app-header">
            <h1>${client.name}</h1>
            <p class="subtitle">A secure authentication service using Polkadot wallets</p>
          </header>
          <div class="container">
            <div id="status">Ready to connect...</div>
            <button id="connectButton">
              <span id="buttonText">Connect Wallet</span>
              <span id="loadingSpinner" class="loading" style="display: none;"></span>
            </button>
          </div>
          <script src="/js/client/login.js"></script>
        </body>
      </html>
    `);
   } catch (error) {
     logError(req, error as Error);
     await auditService.log({
       type: 'AUTH_ATTEMPT',
       client_id: (req.query.client_id as string) || 'unknown',
       action: 'LOGIN_FAILED',
       status: 'failure',
       details: { error: error instanceof Error ? error.message : 'Unknown error' },
       ip_address: req.ip || 'unknown',
       user_agent: req.get('user-agent') || 'unknown'
     });
     console.error('Login error:', error);
     res.status(500).send('Authentication failed');
   }
 };

 const challengeHandler: RequestHandler = async (req, res) => {
   try {
     const { address, client_id } = req.query;
     const client = clients.get(client_id as string);
     
     if (!client) {
       return res.status(400).send('Invalid client');
     }

     if (!address) {
       return res.status(400).send('Address is required');
     }

     const challenge = await challengeService.generateChallenge(client_id as string);
     await challengeService.storeChallenge(challenge);
     
     res.send(`
      <html>
        <head>
          <title>${escapeHtml(client.name)}</title>
          <link rel="stylesheet" href="/styles/main.css">
          <script nonce="${res.locals.nonce}">
            window.CHALLENGE_DATA = {
              address: "${escapeHtml(address as string)}",
              message: "${escapeHtml(challenge.message)}",
              challengeId: "${escapeHtml(challenge.id)}",
              codeVerifier: "${escapeHtml(challenge.code_verifier)}",
              state: "${escapeHtml(challenge.state)}"
            };
          </script>
          <script src="https://cdn.jsdelivr.net/npm/@polkadot/util@12.6.2/bundle-polkadot-util.min.js"></script>
          <script src="https://cdn.jsdelivr.net/npm/@polkadot/util-crypto@12.6.2/bundle-polkadot-util-crypto.min.js"></script>
          <script src="https://cdn.jsdelivr.net/npm/@polkadot/extension-dapp@0.46.6/bundle-polkadot-extension-dapp.min.js"></script>
        </head>
        <body>
          <div class="container">
            <h2>Sign Message</h2>
            <div class="message-box">
              <p><strong>Message:</strong> ${escapeHtml(challenge.message)}</p>
              <p><strong>Address:</strong> ${escapeHtml(address as string)}</p>
            </div>
            <div id="status"></div>
            <button id="signButton">
              <span id="buttonText">Sign with Wallet</span>
              <span id="loadingSpinner" class="loading" style="display: none;"></span>
            </button>
          </div>
          <script src="/js/client/challenge.js"></script>
        </body>
      </html>
    `);
   } catch (error) {
     console.error('Challenge error:', error);
     res.status(500).send('Challenge generation failed');
   }
 };

 const verifyHandler: RequestHandler = async (req, res) => {
   try {
     const { signature, challenge_id, address, code_verifier, state } = req.query;
     
     // Validate all required parameters
     if (!signature || !challenge_id || !address || !code_verifier || !state) {
       return res.status(400).send('Missing required parameters');
     }

     const challenge = await challengeService.getChallenge(challenge_id as string);
     
     // Validate challenge and state
     if (!challenge || challenge.state !== state) {
       return res.status(400).send('Invalid challenge or state mismatch');
     }

     // Verify code verifier
     const code_challenge = await generateCodeChallenge(code_verifier as string);
     if (code_challenge !== challenge.code_challenge) {
       return res.status(400).send('Invalid code verifier');
     }

     await cryptoWaitReady();
     const { isValid } = signatureVerify(
       challenge.message,
       signature as string,
       address as string
     );
     
     if (!isValid) {
       return res.status(401).send('Invalid signature');
     }

     await challengeService.markChallengeUsed(challenge_id as string);

     // Instead of redirecting with tokens, return an authorization code
     const authCode = crypto.randomBytes(32).toString('hex');
     await db.run(
       `INSERT INTO auth_codes (
         code, address, client_id, created_at, expires_at
       ) VALUES (?, ?, ?, ?, ?)`,
       [
         authCode,
         address,
         challenge.client_id,
         Date.now(),
         Date.now() + (5 * 60 * 1000)
       ]
     );

     // Redirect with auth code instead of tokens
     const client = clients.get(challenge.client_id);
     res.redirect(
       `${client!.redirect_url}?` +
       `code=${authCode}&` +
       `state=${state}`
     );
   } catch (error) {
     console.error('Verification error:', error);
     res.status(500).send('Verification failed');
   }
 };

 const tokenHandler: RequestHandler = async (req, res) => {
   try {
     const { code, client_id, client_secret } = req.body;

     // Validate client credentials
     const client = await validateClientCredentials(client_id, client_secret);
     if (!client) {
       return res.status(401).send('Invalid client credentials');
     }

     // Get and validate auth code
     const authCode = await secureQueries.authCodes.verify(db, code, client_id);
     if (!authCode || Date.now() > authCode.expires_at) {
       return res.status(400).send('Invalid or expired authorization code');
     }

     // Mark auth code as used
     await secureQueries.authCodes.markUsed(db, code);

     // Generate tokens
     const tokens = tokenService.generateTokens(authCode.address, client_id);

     // Return tokens in response body
     res.json({
       access_token: tokens.accessToken,
       refresh_token: tokens.refreshToken,
       token_type: 'Bearer',
       expires_in: 900
     });
   } catch (error) {
     console.error('Token exchange error:', error);
     res.status(500).send('Token exchange failed');
   }
 };

 router.get('/login', 
   rateLimiters.login,
   sanitizeRequest(),
   validateBody(loginSchema),
   loginHandler
 );

 router.get('/challenge', 
   rateLimiters.challenge,
   sanitizeRequest(),
   validateBody(loginSchema),
   challengeHandler
 );

 router.get('/verify', 
   rateLimiters.verify,
   sanitizeRequest(),
   validateBody(loginSchema),
   verifyHandler
 );

 router.post('/token', 
   rateLimiters.token,
   sanitizeRequest(),
   validateBody(tokenSchema),
   tokenHandler
 );

 return router;
};
