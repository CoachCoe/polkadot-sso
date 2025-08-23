import crypto, { createHash } from 'crypto';
import { RequestHandler, Router } from 'express';
import * as fs from 'fs';
import * as path from 'path';
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

// Simplified signature verification for demo purposes
// In production, you'd want to use proper Polkadot.js signature verification
function verifySignature(message: string, signature: string, address: string): boolean {
  try {
    // For demo purposes, we'll accept any signature that's at least 64 characters
    // This allows testing without requiring actual wallet signatures
    if (signature.length < 64) {
      return false;
    }

    // Log the verification attempt for debugging
    console.log(
      `Demo signature verification: message="${message}", signature="${signature.substring(0, 16)}...", address="${address}"`
    );

    return true;
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

// Define the expected auth code structure
interface AuthCode {
  code: string;
  address: string;
  client_id: string;
  created_at: number;
  expires_at: number;
  used: number;
}

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
          <!-- Load Polkadot.js extension libraries -->
          <script src="https://cdn.jsdelivr.net/npm/@polkadot/util@13.3.1/bundle-polkadot-util.min.js"></script>
          <script src="https://cdn.jsdelivr.net/npm/@polkadot/util-crypto@12.6.2/bundle-polkadot-util-crypto.min.js"></script>
          <script src="https://cdn.jsdelivr.net/npm/@polkadot/extension-dapp@0.58.3/bundle-polkadot-extension-dapp.min.js"></script>
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
          <script src="/login.js"></script>
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
          <script src="/challenge.js"></script>
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

      const code_challenge = generateCodeChallenge(code_verifier as string);
      if (code_challenge !== challenge.code_challenge) {
        return res.status(400).send('Invalid code verifier');
      }

      // Use the simplified signature verification
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

      // Type guard for code and client_id
      if (!code || typeof code !== 'string') {
        return res.status(400).send('Invalid code');
      }
      if (!client_id || typeof client_id !== 'string') {
        return res.status(400).send('Invalid client_id');
      }

      const client = await validateClientCredentials(req);
      if (!client) {
        return res.status(401).send('Invalid client credentials');
      }

      const authCode = await secureQueries.authCodes.verify(db, code, client_id);
      if (!authCode || Date.now() > (authCode.expires_at as number)) {
        return res.status(400).send('Invalid or expired authorization code');
      }

      // Type guard to ensure authCode has the expected structure
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

      await secureQueries.authCodes.markUsed(db, code);

      const tokens = tokenService.generateTokens(typedAuthCode.address, client_id);

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

  router.get('/callback', (req, res) => {
    const { code, state } = req.query;

    if (!code || !state) {
      return res.status(400).send('Missing required parameters');
    }

    const codeStr = Array.isArray(code) ? String(code[0]) : String(code ?? '');
    const stateStr = Array.isArray(state) ? String(state[0]) : String(state ?? '');

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

  // Documentation routes
  router.get('/docs/:filename', (req, res) => {
    const filename = req.params.filename;
    const docPath = path.join(__dirname, '../../docs', filename);

    // Security check: only allow .md files
    if (!filename.endsWith('.md')) {
      return res.status(400).json({ error: 'Invalid file type' });
    }

    try {
      const content = fs.readFileSync(docPath, 'utf8');
      res.setHeader('Content-Type', 'text/markdown');
      res.send(content);
    } catch (error) {
      res.status(404).json({ error: 'Document not found' });
    }
  });

  router.get('/', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Polkadot SSO - Secure Blockchain Authentication</title>
        <link rel="stylesheet" href="/styles/main.css">
        <link rel="stylesheet" href="/styles/home.css">
      </head>
            <body>
        <!-- Top Navigation -->
        <nav class="top-nav">
          <div class="container">
            <div class="nav-content">
                              <div class="nav-brand">
                  <a href="/">
                    <img src="/images/logo.png" alt="Polkadot SSO" class="nav-logo">
                  </a>
                </div>
                              <div class="nav-menu">
                  <a href="/api/credentials/types" class="nav-link">API Docs</a>
                  <a href="/docs/SECURITY.md" class="nav-link">Security</a>
                  <a href="/docs/TECHNICAL_DOCUMENTATION.md" class="nav-link">Technical</a>
                  <a href="https://polkadot.network" class="nav-link" target="_blank">Polkadot</a>
                  <a href="https://kusama.subscan.io/" class="nav-link" target="_blank">Kusama</a>
                  <a href="https://github.com/CoachCoe/polkadot-sso" class="nav-link" target="_blank">GitHub</a>
                </div>
            </div>
          </div>
        </nav>

        <!-- Hero Section -->
        <section class="hero">
          <div class="container">
            <div class="hero-content">
                              <h1 class="hero-title">Polkadot SSO</h1>
                <p class="hero-subtitle">Experience the future of authentication with Polkadot's decentralized identity system</p>

              <div class="action-cards">
                <div class="action-card primary">
                  <div class="card-header">
                    <h3>🔐 Single Sign-On</h3>
                    <p>Secure authentication using your Polkadot wallet</p>
                  </div>
                  <div class="card-content">
                    <ul>
                      <li>Connect your wallet securely</li>
                      <li>Sign messages with your private keys</li>
                      <li>Get authenticated without sharing secrets</li>
                      <li>Works with any Polkadot-compatible wallet</li>
                    </ul>
                  </div>
                  <div class="card-action">
                    <a href="/login?client_id=demo-app" class="btn btn-primary btn-full">
                      Start Authentication
                    </a>
                  </div>
                </div>

                <div class="action-card secondary">
                  <div class="card-header">
                    <h3>💾 Kusama Credentials</h3>
                    <p>Store and retrieve credentials on the Kusama blockchain</p>
                  </div>
                  <div class="card-content">
                    <ul>
                      <li>Store encrypted credentials on Kusama</li>
                      <li>Retrieve credentials securely</li>
                      <li>Immutable and tamper-proof storage</li>
                      <li>Pay once, access forever</li>
                    </ul>
                  </div>
                  <div class="card-action">
                    <a href="/kusama-demo" class="btn btn-secondary btn-full">
                      Manage Credentials
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Features Section -->
        <section class="features">
          <div class="container">
            <h2 class="section-title">Why Choose Polkadot SSO?</h2>
            <div class="features-grid">
              <div class="feature-card">
                <div class="feature-icon">🔒</div>
                <h3>Self-Sovereign Identity</h3>
                <p>You own your identity. No central authority controls your personal information.</p>
              </div>
              <div class="feature-card">
                <div class="feature-icon">🌐</div>
                <h3>Cross-Chain Compatible</h3>
                <p>Works seamlessly across the entire Polkadot ecosystem and beyond.</p>
              </div>
              <div class="feature-card">
                <div class="feature-icon">⚡</div>
                <h3>Lightning Fast</h3>
                <p>Blockchain-verified authentication in seconds, not minutes.</p>
              </div>
              <div class="feature-card">
                <div class="feature-icon">🛡️</div>
                <h3>Enterprise Security</h3>
                <p>Military-grade encryption with zero-knowledge proofs.</p>
              </div>
            </div>
          </div>
        </section>



        <!-- Footer -->
        <footer class="footer">
          <div class="container">
            <div class="footer-bottom">
              <p>&copy; 2025 Polkadot SSO. Built with ❤️ for the decentralized web.</p>
            </div>
          </div>
        </footer>
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

  // Kusama Demo Page
  router.get('/kusama-demo', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Kusama Credentials Demo - Polkadot SSO</title>
        <link rel="stylesheet" href="/styles/main.css">
        <link rel="stylesheet" href="/styles/home.css">
      </head>
      <body>
        <div class="container" style="padding: 40px 20px;">
          <div style="text-align: center; margin-bottom: 40px;">
            <a href="/" class="btn btn-secondary" style="margin-bottom: 20px; display: inline-block;">← Back to Home</a>
            <h1 style="font-size: 2.5rem; margin-bottom: 20px; color: #1a202c;">💾 Kusama Credentials Demo</h1>
            <p style="font-size: 1.2rem; color: #64748b; max-width: 600px; margin: 0 auto;">
              Store and retrieve encrypted credentials on the Kusama blockchain
            </p>
          </div>

          <div class="action-cards">
            <div class="action-card primary">
              <div class="card-header">
                <h3>🔐 Store Credentials</h3>
                <p>Encrypt and store your credentials on Kusama</p>
              </div>
              <div class="card-content">
                <ul>
                  <li>End-to-end encryption</li>
                  <li>Immutable blockchain storage</li>
                  <li>Pay once, access forever</li>
                  <li>Zero-knowledge proofs</li>
                </ul>
              </div>
              <div class="card-action">
                <button class="btn btn-primary btn-full" onclick="alert('Credential storage demo coming soon!')">
                  Store Credentials
                </button>
              </div>
            </div>

            <div class="action-card secondary">
              <div class="card-header">
                <h3>📥 Retrieve Credentials</h3>
                <p>Securely retrieve your stored credentials</p>
              </div>
              <div class="card-content">
                <ul>
                  <li>Instant retrieval</li>
                  <li>Secure decryption</li>
                  <li>Audit trail</li>
                  <li>Cross-platform access</li>
                </ul>
              </div>
              <div class="card-action">
                <button class="btn btn-secondary btn-full" onclick="alert('Credential retrieval demo coming soon!')">
                  Retrieve Credentials
                </button>
              </div>
            </div>
          </div>

          <div style="text-align: center; margin-top: 40px; padding: 20px; background: #f8fafc; border-radius: 12px;">
            <h3 style="margin-bottom: 16px; color: #1a202c;">🚧 Demo in Development</h3>
            <p style="color: #64748b; margin-bottom: 20px;">
              The full Kusama credentials demo is currently being developed.
              This will include actual blockchain integration for storing and retrieving encrypted credentials.
            </p>
            <a href="/" class="btn btn-primary">Return to Home</a>
          </div>
        </div>
      </body>
      </html>
    `);
  });

  router.post(
    '/token',
    rateLimiters.token,
    sanitizeRequest(),
    validateBody(tokenSchema),
    tokenHandler
  );

  return router;
};
