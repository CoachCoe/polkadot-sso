import { cryptoWaitReady, signatureVerify } from '@polkadot/util-crypto';
import crypto, { createHash } from 'crypto';
import { RequestHandler, Router } from 'express';
import { Database } from 'sqlite';
import { z } from 'zod';
import { createRateLimiters } from '../middleware/rateLimit';
import { sanitizeRequest, validateBody } from '../middleware/validation';
import { AuditService } from '../services/auditService';
import { ChallengeService } from '../services/challengeService';
import { TokenService } from '../services/token';
import { Challenge, Client } from '../types/auth';
import { secureQueries } from '../utils/db';
import { logError, logRequest } from '../utils/logger';
import { escapeHtml } from '../utils/sanitization';
import { validateAuthRequest, validateClientCredentials } from '../utils/validation';

const loginSchema = z.object({
  query: z.object({
    client_id: z.string().min(1),
  }),
});

const tokenSchema = z.object({
  body: z.object({
    code: z.string().min(32).max(64),
    client_id: z.string().min(1),
    client_secret: z.string().min(32),
  }),
});

const challengeSchema = z.object({
  query: z.object({
    address: z.string().min(1),
    client_id: z.string().min(1),
  }),
});

const verifySchema = z.object({
  query: z.object({
    signature: z.string(),
    challenge_id: z.string(),
    address: z.string(),
  }),
});

function generateCodeChallenge(verifier: string): string {
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
  const rateLimiters = createRateLimiters(auditService);

  const loginHandler: RequestHandler = async (req, res) => {
    try {
      logRequest(req, 'Login attempt', { address: req.query.address });
      const validation = validateAuthRequest(req);
      if (!validation.isValid) {
        logError(req, new Error(validation.error || 'Validation failed'));
        return res.status(400).json({ error: validation.error });
      }

      const { client_id } = req.query;
      const client = clients.get(client_id as string);

      if (!client) {
        logError(req, new Error(`Invalid client_id: ${String(client_id)}`));
        return res.status(400).json({ error: 'Invalid client' });
      }

      const escapedClientId = JSON.stringify(client_id ?? '');
      const escapedAppName = JSON.stringify(client.name ?? '');

      await auditService.log({
        type: 'AUTH_ATTEMPT',
        client_id: client_id as string,
        action: 'LOGIN_INITIATED',
        status: 'success',
        ip_address: req.ip || 'unknown',
        user_agent: req.get('user-agent') || 'unknown',
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
              <span id="loadingSpinner" class="loading"></span>
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
        user_agent: req.get('user-agent') || 'unknown',
      });
      console.error('Login error:', error);
      res.status(500).json({ error: 'Authentication failed' });
    }
  };

  const challengeHandler: RequestHandler = async (req, res) => {
    try {
      const { address, client_id } = req.query;
      const client = clients.get(client_id as string);

      if (!client) {
        logError(req, new Error(`Invalid client_id: ${String(client_id)}`));
        return res.status(400).json({ error: 'Invalid client' });
      }

      if (!address) {
        logError(req, new Error('Address is required'));
        return res.status(400).json({ error: 'Address is required' });
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
              address: "${escapeHtml(String(address ?? ''))}",
              message: "${escapeHtml(challenge.message)}",
              challengeId: "${escapeHtml(challenge.id)}",
              codeVerifier: "${escapeHtml(challenge.code_verifier)}",
              state: "${escapeHtml(challenge.state)}"
            };
          </script>
          <script src="https://cdn.jsdelivr.net/npm/@polkadot/util@13.3.1/bundle-polkadot-util.min.js"></script>
          <script src="https://cdn.jsdelivr.net/npm/@polkadot/util-crypto@12.6.2/bundle-polkadot-util-crypto.min.js"></script>
          <script src="https://cdn.jsdelivr.net/npm/@polkadot/extension-dapp@0.58.3/bundle-polkadot-extension-dapp.min.js"></script>
        </head>
        <body>
          <div class="container">
            <h2>Sign Message</h2>
            <div class="message-box">
              <p><strong>Message:</strong> ${escapeHtml(challenge.message)}</p>
              <p><strong>Address:</strong> ${escapeHtml(String(address ?? ''))}</p>
            </div>
            <div id="status"></div>
            <button id="signButton">
              <span id="buttonText">Sign with Wallet</span>
              <span id="loadingSpinner" class="loading"></span>
            </button>
          </div>
          <script src="/js/client/challenge.js"></script>
        </body>
      </html>
    `);
    } catch (error) {
      logError(req, error as Error);
      console.error('Challenge error:', error);
      res.status(500).json({ error: 'Challenge generation failed' });
    }
  };

  const verifyHandler: RequestHandler = async (req, res) => {
    try {
      const { signature, challenge_id, address, code_verifier, state } = req.query;

      console.log('Verification request:', {
        signature:
          signature && typeof signature === 'string'
            ? `${signature.substring(0, 20)}...`
            : 'undefined',
        challenge_id,
        address,
        code_verifier:
          code_verifier && typeof code_verifier === 'string'
            ? `${code_verifier.substring(0, 20)}...`
            : 'undefined',
        state,
      });

      if (!signature || !challenge_id || !address || !code_verifier || !state) {
        return res.status(400).send('Missing required parameters');
      }

      const challenge = await challengeService.getChallenge(challenge_id as string);

      console.log('Retrieved challenge:', {
        id: challenge?.id,
        message: challenge?.message,
        state: challenge?.state,
        expected_state: state,
        used: challenge?.used,
      });

      if (!challenge || challenge.state !== state) {
        return res.status(400).send('Invalid challenge or state mismatch');
      }

      const code_challenge = await generateCodeChallenge(code_verifier as string);
      if (code_challenge !== challenge.code_challenge) {
        return res.status(400).send('Invalid code verifier');
      }

      await cryptoWaitReady();

      // For signRaw with type: 'bytes', we need to handle the signature differently
      // The signature from signRaw is already in the correct format for verification
      try {
        const { isValid } = signatureVerify(
          challenge.message,
          signature as string,
          address as string
        );

        if (!isValid) {
          return res.status(401).send('Invalid signature');
        }
      } catch (verifyError) {
        console.error('Signature verification error:', verifyError);
        return res.status(401).send('Signature verification failed');
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
      res.redirect(`${client.redirect_url}?code=${authCode}&state=${state}`);
    } catch (error) {
      logError(req, error as Error);
      console.error('Verify error:', error);
      res.status(500).json({ error: 'Verification failed' });
    }
  };

  const tokenHandler: RequestHandler = async (req, res) => {
    try {
      const { code, client_id } = req.body;

      const client = await validateClientCredentials(req);
      if (!client) {
        return res.status(401).send('Invalid client credentials');
      }

      const authCode = await secureQueries.authCodes.verify(db, code, client_id);
      if (!authCode || Date.now() > authCode.expires_at) {
        return res.status(400).send('Invalid or expired authorization code');
      }

      await secureQueries.authCodes.markUsed(db, code);

      const tokens = tokenService.generateTokens(authCode.address, client_id);

      res.json({
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        token_type: 'Bearer',
        expires_in: 900,
      });
    } catch (error) {
      console.error('Token exchange error:', error);
      res.status(500).send('Token exchange failed');
    }
  };

  // Callback route - handle OAuth callback
  router.get('/callback', (req, res) => {
    const { code, state } = req.query;

    if (!code || !state) {
      return res.status(400).send('Missing required parameters');
    }

    const codeStr: string = Array.isArray(code) ? code[0] : String(code ?? '');
    const stateStr: string = Array.isArray(state) ? state[0] : String(state ?? '');

    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Authentication Successful - Polkadot SSO</title>
        <link rel="stylesheet" href="/styles/main.css">
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Authentication Successful!</h1>
            <p class="subtitle">You have successfully authenticated with Polkadot SSO</p>
          </div>

          <div class="success-card">
            <div class="card-icon">✅</div>
            <h2>Welcome to Polkadot SSO</h2>
            <p>Your wallet signature has been verified and you're now authenticated.</p>
          </div>

          <div class="info-card">
            <h3>🔑 Authorization Details</h3>
            <div class="detail-group">
              <label>Authorization Code:</label>
              <div class="code-display">${codeStr}</div>
            </div>
            <div class="detail-group">
              <label>State:</label>
              <div class="code-display">${stateStr}</div>
            </div>
            <p class="info-text">This authorization code can now be exchanged for access tokens.</p>
          </div>

          <div class="action-card">
            <h3>🧪 Test Token Exchange</h3>
            <p>Test the complete OAuth flow by exchanging your code for tokens:</p>
            <div class="code-block">
              <code>curl -X POST http://localhost:3000/token \\</code><br>
              <code>&nbsp;&nbsp;-H "Content-Type: application/json" \\</code><br>
              <code>&nbsp;&nbsp;-d '{"code": "${codeStr}", "client_id": "demo-app"}'</code>
            </div>
            <div class="button-group">
              <a href="/" class="btn btn-secondary">← Back to Home</a>
              <button class="btn btn-primary" onclick="copyCode()">Copy Code</button>
            </div>
          </div>
        </div>

        <script src="/js/callback.js"></script>
      </body>
      </html>
    `);
  });

  // Root route - serve a simple landing page
  router.get('/', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Polkadot SSO Service</title>
        <link rel="stylesheet" href="/styles/main.css">
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚀 Polkadot SSO Service</h1>
            <p class="subtitle">Secure Single Sign-On using Polkadot blockchain authentication</p>
          </div>

          <div class="status-card">
            <div class="card-icon">✅</div>
            <h2>Service Status</h2>
            <p>The SSO service is running successfully and ready for authentication!</p>
          </div>

          <div class="info-card">
            <h3>🔗 Available Endpoints</h3>
            <div class="endpoint-list">
              <div class="endpoint-item">
                <span class="endpoint-method">GET</span>
                <span class="endpoint-path">/api/credentials/types</span>
                <span class="endpoint-desc">List credential types</span>
              </div>
              <div class="endpoint-item">
                <span class="endpoint-method">GET</span>
                <span class="endpoint-path">/login?client_id=demo-app</span>
                <span class="endpoint-desc">Start authentication</span>
              </div>
              <div class="endpoint-item">
                <span class="endpoint-method">GET</span>
                <span class="endpoint-path">/challenge</span>
                <span class="endpoint-desc">Get authentication challenge</span>
              </div>
              <div class="endpoint-item">
                <span class="endpoint-method">GET</span>
                <span class="endpoint-path">/verify</span>
                <span class="endpoint-desc">Verify signature</span>
              </div>
              <div class="endpoint-item">
                <span class="endpoint-method">POST</span>
                <span class="endpoint-path">/token</span>
                <span class="endpoint-desc">Exchange auth code for tokens</span>
              </div>
            </div>
          </div>

          <div class="action-card">
            <h3>🧪 Quick Testing</h3>
            <div class="button-group">
              <a href="/api/credentials/types" class="btn btn-secondary">View Credential Types</a>
              <a href="/login?client_id=demo-app" class="btn btn-primary">Try Authentication</a>
            </div>
            <div class="test-info">
              <p><strong>API Testing:</strong> Run <code>npm run test:api</code> in your terminal</p>
              <p><strong>Demo Scripts:</strong> Use <code>npm run demo:credentials</code> for full testing</p>
            </div>
          </div>

          <div class="info-card">
            <h3>📚 Documentation</h3>
            <p>Check the <code>docs/</code> directory for comprehensive guides and testing instructions.</p>
            <div class="doc-links">
              <a href="/docs/KUSAMA_QUICKSTART.md" class="doc-link">Kusama Quickstart</a>
              <a href="/docs/SECURITY.md" class="doc-link">Security Guide</a>
              <a href="/docs/TECHNICAL_DOCUMENTATION.md" class="doc-link">Technical Docs</a>
            </div>
          </div>
        </div>
      </body>
      </html>
    `);
  });

  router.get(
    '/login',
    rateLimiters.login,
    sanitizeRequest(),
    validateBody(loginSchema),
    loginHandler
  );

  router.get(
    '/challenge',
    rateLimiters.challenge,
    sanitizeRequest(),
    validateBody(challengeSchema),
    challengeHandler
  );

  router.get(
    '/verify',
    rateLimiters.verify,
    sanitizeRequest(),
    validateBody(verifySchema),
    verifyHandler
  );

  router.post(
    '/token',
    rateLimiters.token,
    sanitizeRequest(),
    validateBody(tokenSchema),
    tokenHandler
  );

  return router;
};
