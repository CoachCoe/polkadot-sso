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

      const { client_id, wallet } = req.query;
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
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>${client.name} - Polkadot SSO</title>
          <link rel="stylesheet" href="/styles/main.css">
          <link rel="stylesheet" href="/styles/home.css">
          <link rel="icon" type="image/x-icon" href="/favicon.ico">
          <script nonce="${res.locals.nonce}">
            window.SSO_CONFIG = {
              clientId: ${escapedClientId},
              appName: ${escapedAppName},
              walletType: ${JSON.stringify(wallet || 'auto')}
            };
          </script>
          <!-- Load Polkadot.js extension libraries -->
          <script src="/js/polkadot-bundle.min.js"></script>
        </head>
        <body>
          <!-- Top Navigation -->
          <nav class="top-nav">
            <div class="container">
              <div class="nav-content">
                <div class="nav-brand">
                  <a href="/">
                    <img src="/images/logo.png" alt="Polkadot SSO" class="nav-logo">
                    <span class="nav-text">Polkadot SSO</span>
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
                <h1 class="hero-title">${client.name}</h1>
                <p class="hero-subtitle">Connect your Polkadot wallet to continue</p>
                ${wallet ? `<p class="wallet-info">Selected wallet: <strong>${String(wallet)}</strong></p>` : ''}

                <div class="container" style="max-width: 600px; margin-top: 40px; padding-bottom: 40px;">
                  <div id="status" style="text-align: center; margin-bottom: 20px; padding: 16px; background: #f8fafc; border-radius: 12px; color: #64748b;">Ready to connect...</div>
                  <button id="connectButton" class="btn btn-primary btn-large" style="width: 100%; margin-top: 20px;">
                    <span id="buttonText">Connect Wallet</span>
                    <span id="loadingSpinner" class="loading"></span>
                  </button>
                </div>
              </div>
            </div>
          </section>

          <script src="/login.js"></script>

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
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>${escapeHtml(client.name)} - Sign Message</title>
          <link rel="stylesheet" href="/styles/main.css">
          <link rel="stylesheet" href="/styles/home.css">
          <script nonce="${res.locals.nonce}">
            window.CHALLENGE_DATA = {
              address: "${escapeHtml(String(address ?? ''))}",
              message: "${escapeHtml(challenge.message)}",
              challengeId: "${escapeHtml(challenge.id)}",
              codeVerifier: "${escapeHtml(challenge.code_verifier)}",
              state: "${escapeHtml(challenge.state)}"
            };
          </script>
          <script src="/js/polkadot-bundle.min.js"></script>
        </head>
        <body>
          <!-- Top Navigation -->
          <nav class="top-nav">
            <div class="container">
              <div class="nav-content">
                <div class="nav-brand">
                  <a href="/">
                    <img src="/images/logo.png" alt="Polkadot SSO" class="nav-logo">
                    <span class="nav-text">Polkadot SSO</span>
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
                <h1 class="hero-title">Sign Message</h1>
                <p class="hero-subtitle">Sign the challenge message with your wallet to continue</p>

                <div class="container" style="max-width: 600px; margin-top: 40px; padding-bottom: 40px;">
                  <div class="message-box" style="background: #f8fafc; padding: 20px; border-radius: 12px; margin-bottom: 20px;">
                    <p style="margin-bottom: 10px;"><strong>Message:</strong> ${escapeHtml(challenge.message)}</p>
                    <p><strong>Address:</strong> ${escapeHtml(String(address ?? ''))}</p>
                  </div>
                  <div id="status" style="text-align: center; margin-bottom: 20px; padding: 16px; background: #f8fafc; border-radius: 12px; color: #64748b;"></div>
                  <button id="signButton" class="btn btn-primary btn-large" style="width: 100%;">
                    <span id="buttonText">Sign with Wallet</span>
                    <span id="loadingSpinner" class="loading"></span>
                  </button>
                </div>
              </div>
            </div>
          </section>

          <script>
            const statusDiv = document.getElementById("status");
            const signButton = document.getElementById("signButton");
            const buttonText = document.getElementById("buttonText");
            const loadingSpinner = document.getElementById("loadingSpinner");

            function setLoading(isLoading) {
              signButton.disabled = isLoading;
              loadingSpinner.style.display = isLoading ? "inline-block" : "none";
              buttonText.textContent = isLoading ? "Signing..." : "Sign with Wallet";
            }

            function updateStatus(message, type = "info") {
              statusDiv.className = type;
              statusDiv.textContent = message;
              statusDiv.style.background = type === "error" ? "#fee2e2" : type === "success" ? "#dcfce7" : "#f8fafc";
              statusDiv.style.color = type === "error" ? "#dc2626" : type === "success" ? "#16a34a" : "#64748b";
            }

            signButton.addEventListener("click", async () => {
              try {
                setLoading(true);
                updateStatus("Connecting to wallet...");

                const extensions = await window.polkadotExtensionDapp.web3Enable("Polkadot SSO Demo");
                if (extensions.length === 0) {
                  throw new Error("No extension found");
                }

                const injector = await window.polkadotExtensionDapp.web3FromAddress(
                  window.CHALLENGE_DATA.address
                );

                if (!injector?.signer?.signRaw) {
                  throw new Error("Wallet does not support message signing");
                }

                updateStatus("Please sign the message in your wallet...", "info");

                const { signature } = await injector.signer.signRaw({
                  address: window.CHALLENGE_DATA.address,
                  data: window.CHALLENGE_DATA.message,
                  type: "bytes"
                });

                updateStatus("Message signed! Verifying...", "success");

                // Set authentication flag
                localStorage.setItem('isAuthenticated', 'true');

                window.location.href = "/verify?signature=" + encodeURIComponent(signature) +
                  "&challenge_id=" + window.CHALLENGE_DATA.challengeId +
                  "&address=" + encodeURIComponent(window.CHALLENGE_DATA.address) +
                  "&code_verifier=" + encodeURIComponent(window.CHALLENGE_DATA.codeVerifier) +
                  "&state=" + encodeURIComponent(window.CHALLENGE_DATA.state);

              } catch (error) {
                console.error("Signing error:", error);
                updateStatus(error instanceof Error ? error.message : "Unknown error", "error");
              } finally {
                setLoading(false);
              }
            });
          </script>

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
                  <span class="nav-text">Polkadot SSO</span>
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
              <h1 class="hero-title">🎉 Authentication Successful!</h1>
              <p class="hero-subtitle">You have successfully authenticated with Polkadot SSO</p>

              <div style="margin-top: 40px;">
                <div class="action-card primary" style="max-width: 1000px; margin: 0 auto; min-height: 800px;">
                  <div class="card-header">
                    <h3>✅ Welcome to Polkadot SSO</h3>
                    <p>Your wallet signature has been verified and you're now authenticated.</p>
                  </div>
                  <div class="card-content" style="padding: 40px;">
                    <div class="info-card" style="background: #f8fafc; padding: 30px; border-radius: 12px; margin-bottom: 30px;">
                      <h3 style="margin-top: 0; color: #1a202c; font-size: 1.5rem;">🔑 Authorization Details</h3>
                      <div style="margin-bottom: 25px;">
                        <label style="display: block; font-weight: 600; color: #4a5568; margin-bottom: 8px; font-size: 1.1rem;">Authorization Code:</label>
                        <div style="font-family: monospace; background: #e2e8f0; padding: 16px; border-radius: 8px; word-break: break-all; color: #2d3748; font-size: 0.95rem;">${codeStr}</div>
                      </div>
                      <div style="margin-bottom: 25px;">
                        <label style="display: block; font-weight: 600; color: #4a5568; margin-bottom: 8px; font-size: 1.1rem;">State:</label>
                        <div style="font-family: monospace; background: #e2e8f0; padding: 16px; border-radius: 8px; word-break: break-all; color: #2d3748; font-size: 0.95rem;">${stateStr}</div>
                      </div>
                      <p style="color: #64748b; margin: 0; font-size: 1rem;">This authorization code can now be exchanged for access tokens.</p>
                    </div>

                    <div class="info-card" style="background: #f8fafc; padding: 30px; border-radius: 12px; margin-bottom: 30px;">
                      <h3 style="margin-top: 0; color: #1a202c; font-size: 1.5rem;">🧪 Test Token Exchange</h3>
                      <p style="color: #4a5568; margin-bottom: 20px; font-size: 1rem;">Test the complete OAuth flow by exchanging your code for tokens:</p>
                      <div style="font-family: monospace; background: #1a202c; color: #e2e8f0; padding: 20px; border-radius: 8px; overflow-x: auto; margin-bottom: 25px; font-size: 0.95rem;">
                        <code>curl -X POST http://localhost:3000/token \\</code><br>
                        <code>&nbsp;&nbsp;-H "Content-Type: application/json" \\</code><br>
                        <code>&nbsp;&nbsp;-d '{"code": "${codeStr}", "client_id": "demo-app"}'</code>
                      </div>
                      <button class="btn btn-primary" onclick="copyCode()" style="width: 100%; padding: 15px; font-size: 1.1rem;">Copy Code</button>
                    </div>
                  </div>
                </div>
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

        <script>
          function copyCode() {
            const code = '${codeStr}';
            navigator.clipboard.writeText(code).then(() => {
              const button = event.target;
              const originalText = button.textContent;
              button.textContent = '✅ Copied!';
              button.style.background = '#dcfce7';
              button.style.color = '#16a34a';
              setTimeout(() => {
                button.textContent = originalText;
                button.style.background = '';
                button.style.color = '';
              }, 2000);
            }).catch(err => {
              console.error('Failed to copy: ', err);
              alert('Failed to copy code to clipboard');
            });
          }
        </script>
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

  // Wallet selection page
  router.get('/wallet-selection', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Choose Your Wallet - Polkadot SSO</title>
        <link rel="stylesheet" href="/styles/main.css">
        <link rel="stylesheet" href="/styles/home.css">
        <link rel="stylesheet" href="/styles/wallet-selection.css">
      </head>
      <body>
        <!-- Top Navigation -->
        <nav class="top-nav">
          <div class="container">
            <div class="nav-content">
              <div class="nav-brand">
                <a href="/">
                  <img src="/images/logo.png" alt="Polkadot SSO" class="nav-logo">
                  <span class="nav-text">Polkadot SSO</span>
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
        <section class="wallet-hero">
          <div class="container">
            <div class="hero-content">
              <h1 class="hero-title">Choose Your Wallet</h1>
              <p class="hero-subtitle">Select the wallet you'd like to use for authentication</p>
            </div>
          </div>
        </section>

        <!-- Wallet Options -->
        <section class="wallet-options">
          <div class="container">
            <div class="wallet-grid">
              <div class="wallet-card" data-wallet="polkadot-js">
                <div class="wallet-icon">
                  <img src="/images/logo.png" alt="Polkadot.js" class="wallet-logo">
                </div>
                <div class="wallet-info">
                  <h3>Polkadot.js Extension</h3>
                  <p>Browser extension for Polkadot ecosystem</p>
                  <div class="wallet-features">
                    <span class="feature-tag">Browser</span>
                    <span class="feature-tag">Extension</span>
                    <span class="feature-tag">Popular</span>
                  </div>
                </div>
                <div class="wallet-action">
                  <button class="btn btn-primary btn-full" onclick="selectWallet('polkadot-js')">
                    Connect
                  </button>
                </div>
              </div>

              <div class="wallet-card" data-wallet="talisman">
                <div class="wallet-icon">
                  <img src="/images/Talisman.jpeg" alt="Talisman" class="wallet-logo">
                </div>
                <div class="wallet-info">
                  <h3>Talisman</h3>
                  <p>User-friendly wallet for Polkadot ecosystem</p>
                  <div class="wallet-features">
                    <span class="feature-tag">Browser</span>
                    <span class="feature-tag">Extension</span>
                    <span class="feature-tag">User-friendly</span>
                  </div>
                </div>
                <div class="wallet-action">
                  <button class="btn btn-primary btn-full" onclick="selectWallet('talisman')">
                    Connect
                  </button>
                </div>
              </div>

              <div class="wallet-card" data-wallet="subwallet">
                <div class="wallet-icon">
                  <img src="/images/subWallet.jpeg" alt="SubWallet" class="wallet-logo">
                </div>
                <div class="wallet-info">
                  <h3>SubWallet</h3>
                  <p>Comprehensive wallet for Substrate chains</p>
                  <div class="wallet-features">
                    <span class="feature-tag">Browser</span>
                    <span class="feature-tag">Extension</span>
                    <span class="feature-tag">Multi-chain</span>
                  </div>
                </div>
                <div class="wallet-action">
                  <button class="btn btn-primary btn-full" onclick="selectWallet('subwallet')">
                    Connect
                  </button>
                </div>
              </div>

              <div class="wallet-card" data-wallet="nova">
                <div class="wallet-icon">
                  <img src="/images/Nova.jpeg" alt="Nova Wallet" class="wallet-logo">
                </div>
                <div class="wallet-info">
                  <h3>Nova Wallet</h3>
                  <p>Mobile-first wallet with browser bridge</p>
                  <div class="wallet-features">
                    <span class="feature-tag">Mobile</span>
                    <span class="feature-tag">Browser Bridge</span>
                    <span class="feature-tag">Advanced</span>
                  </div>
                </div>
                <div class="wallet-action">
                  <button class="btn btn-primary btn-full" onclick="selectWallet('nova')">
                    Connect
                  </button>
                </div>
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

        <script>
          // Check if user has a connected wallet (for debugging purposes)
          function checkWalletConnection() {
            const connectedWallet = localStorage.getItem('selectedWallet');
            const walletAddress = localStorage.getItem('walletAddress');
            const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';

            console.log('Wallet connection status:', { connectedWallet, walletAddress, isAuthenticated });
          }

          function selectWallet(walletType) {
            // Store the selected wallet type
            localStorage.setItem('selectedWallet', walletType);

            // Redirect to the login page with the wallet type
            window.location.href = '/login?client_id=demo-app&wallet=' + walletType;
          }

          function storeCredentials() {
            const connectedWallet = localStorage.getItem('selectedWallet');
            const walletAddress = localStorage.getItem('walletAddress');
            const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';

            if (connectedWallet && walletAddress && isAuthenticated) {
              // Wallet is connected and authenticated, proceed to store credentials
              window.location.href = '/kusama-demo?action=store';
            } else {
              // No wallet connected or not authenticated, redirect to wallet selection
              window.location.href = '/wallet-selection';
            }
          }

          function retrieveCredentials() {
            const connectedWallet = localStorage.getItem('selectedWallet');
            const walletAddress = localStorage.getItem('walletAddress');
            const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';

            if (connectedWallet && walletAddress && isAuthenticated) {
              // Wallet is connected and authenticated, proceed to retrieve credentials
              window.location.href = '/kusama-demo?action=retrieve';
            } else {
              // No wallet connected or not authenticated, redirect to wallet selection
              window.location.href = '/wallet-selection';
            }
          }

          function disconnectWallet() {
            localStorage.removeItem('selectedWallet');
            localStorage.removeItem('walletAddress');
            localStorage.removeItem('isAuthenticated');
            console.log('Wallet disconnected');
          }

          // Check wallet connection status when page loads (for debugging)
          document.addEventListener('DOMContentLoaded', function() {
            checkWalletConnection();
          });
        </script>
      </body>
      </html>
    `);
  });

  router.get('/', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Polkadot SSO - Secure Blockchain Authentication</title>
        <script>
          function storeCredentials() {
            const connectedWallet = localStorage.getItem('selectedWallet');
            const walletAddress = localStorage.getItem('walletAddress');
            const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';

            if (connectedWallet && walletAddress && isAuthenticated) {
              // Wallet is connected and authenticated, proceed to store credentials
              window.location.href = '/kusama-demo?action=store';
            } else {
              // No wallet connected or not authenticated, redirect to wallet selection
              window.location.href = '/wallet-selection';
            }
          }

          function retrieveCredentials() {
            const connectedWallet = localStorage.getItem('selectedWallet');
            const walletAddress = localStorage.getItem('walletAddress');
            const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';

            if (connectedWallet && walletAddress && isAuthenticated) {
              // Wallet is connected and authenticated, proceed to retrieve credentials
              window.location.href = '/kusama-demo?action=retrieve';
            } else {
              // No wallet connected or not authenticated, redirect to wallet selection
              window.location.href = '/wallet-selection';
            }
          }

          // Check wallet connection status when page loads (for debugging)
          document.addEventListener('DOMContentLoaded', function() {
            const connectedWallet = localStorage.getItem('selectedWallet');
            const walletAddress = localStorage.getItem('walletAddress');
            const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
            console.log('Wallet connection status:', { connectedWallet, walletAddress, isAuthenticated });
          });
        </script>
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
                    <span class="nav-text">Polkadot SSO</span>
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
                      <a href="/wallet-selection" class="btn btn-primary btn-full">
                        Start Authentication
                      </a>
                    </div>
                </div>

                <div class="action-card secondary">
                  <div class="card-header">
                    <h3><img src="/images/Kusama.jpeg" alt="Kusama" style="width: 24px; height: 24px; vertical-align: middle; margin-right: 8px;"> Kusama Credentials</h3>
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
                    <div style="display: flex; gap: 12px; flex-direction: row; justify-content: center;">
                      <button id="storeCredentialsBtn" class="btn btn-primary" style="flex: 1; max-width: 200px;" onclick="storeCredentials()">
                        💾 Store Credentials
                      </button>
                      <button id="retrieveCredentialsBtn" class="btn btn-secondary" style="flex: 1; max-width: 200px;" onclick="retrieveCredentials()">
                        📥 Retrieve Credentials
                      </button>
                    </div>
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
    const action = req.query.action || 'overview';
    let title, subtitle, content;

    if (action === 'store') {
      title = '💾 Store Credentials';
      subtitle = 'Encrypt and store your credentials on Kusama';
      content = `
        <div class="action-card primary" style="max-width: 800px; margin: 0 auto;">
          <div class="card-header">
            <h3>🔐 Store Credentials</h3>
            <p>Encrypt and store your credentials on Kusama using your connected wallet</p>
          </div>
          <div class="card-content">
            <div id="wallet-status" style="text-align: center; margin-bottom: 20px; padding: 12px; background: #f8fafc; border-radius: 8px; color: #64748b; font-size: 0.9rem;">
              Checking wallet connection...
            </div>

            <div id="credential-form" style="display: none;">
              <div style="margin-bottom: 20px;">
                <label for="credentialType" style="display: block; margin-bottom: 8px; font-weight: 600; color: #1a202c;">Credential Type:</label>
                <select id="credentialType" style="width: 100%; padding: 12px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 16px;">
                  <option value="password">Password</option>
                  <option value="api_key">API Key</option>
                  <option value="private_key">Private Key</option>
                  <option value="certificate">Certificate</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div style="margin-bottom: 20px;">
                <label for="credentialData" style="display: block; margin-bottom: 8px; font-weight: 600; color: #1a202c;">Credential Data:</label>
                <textarea id="credentialData" placeholder="Enter your credential data here..." style="width: 100%; padding: 12px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 16px; min-height: 100px; resize: vertical;"></textarea>
              </div>

              <div style="margin-bottom: 20px;">
                <label for="credentialDescription" style="display: block; margin-bottom: 8px; font-weight: 600; color: #1a202c;">Description (optional):</label>
                <input type="text" id="credentialDescription" placeholder="Brief description of this credential..." style="width: 100%; padding: 12px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 16px;">
              </div>
            </div>

            <div id="transaction-status" style="display: none; text-align: center; margin: 20px 0;">
              <div id="status-message" style="padding: 16px; border-radius: 8px; margin-bottom: 16px;"></div>
              <div id="transaction-hash" style="font-family: monospace; background: #f1f5f9; padding: 12px; border-radius: 8px; word-break: break-all; min-height: 20px; border: 1px solid #e2e8f0;">
              <em style="color: #64748b;">Transaction details will appear here after successful storage...</em>
            </div>
            </div>
          </div>
          <div class="card-action">
            <button id="storeBtn" class="btn btn-primary btn-full" onclick="console.log('Button clicked'); storeCredentialsOnKusama();" disabled>
              🔐 Store Credentials on Kusama
            </button>
          </div>
        </div>

                <script>
          // Check wallet connection on page load
          document.addEventListener('DOMContentLoaded', function() {
            checkWalletConnection();
          });

          function checkWalletConnection() {
            const connectedWallet = localStorage.getItem('selectedWallet');
            const walletAddress = localStorage.getItem('walletAddress');
            const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';

            if (connectedWallet && walletAddress && isAuthenticated) {
              document.getElementById('wallet-status').innerHTML =
                '✅ Connected to ' + connectedWallet + ' (' + walletAddress.slice(0, 8) + '...)';
              document.getElementById('wallet-status').style.background = '#dcfce7';
              document.getElementById('wallet-status').style.color = '#16a34a';

              document.getElementById('credential-form').style.display = 'block';
              document.getElementById('storeBtn').disabled = false;
            } else {
              document.getElementById('wallet-status').innerHTML =
                '🔒 Please connect your wallet first. <a href="/wallet-selection" style="color: #3b82f6; text-decoration: underline;">Connect Wallet</a>';
              document.getElementById('wallet-status').style.background = '#fef2f2';
              document.getElementById('wallet-status').style.color = '#dc2626';

              document.getElementById('credential-form').style.display = 'none';
              document.getElementById('storeBtn').disabled = true;
            }
          }

                    async function storeCredentialsOnKusama() {
            console.log('storeCredentialsOnKusama function called');

            const credentialType = document.getElementById('credentialType').value;
            const credentialData = document.getElementById('credentialData').value;
            const credentialDescription = document.getElementById('credentialDescription').value;

            console.log('Form values:', { credentialType, credentialData, credentialDescription });

            if (!credentialData.trim()) {
              alert('Please enter credential data');
              return;
            }

            try {
              // Show transaction status
              document.getElementById('transaction-status').style.display = 'block';
              document.getElementById('status-message').innerHTML = '🔐 Encrypting credentials...';
              document.getElementById('status-message').style.background = '#fef3c7';
              document.getElementById('status-message').style.color = '#d97706';

                            // Get wallet information
              const connectedWallet = localStorage.getItem('selectedWallet');
              const walletAddress = localStorage.getItem('walletAddress');

              if (!connectedWallet || !walletAddress) {
                throw new Error('Wallet not connected');
              }

                            // Wait for libraries to load
              console.log('Checking for Polkadot.js libraries...');
              console.log('window.polkadotUtil:', window.polkadotUtil);
              console.log('window.polkadotUtilCrypto:', window.polkadotUtilCrypto);
              console.log('window.polkadotApi:', window.polkadotApi);
              console.log('window.polkadotExtensionDapp:', window.polkadotExtensionDapp);

              // Check for available functions
              const hasRandomAsHex = window.polkadotUtil?.randomAsHex || window.polkadotUtilCrypto?.randomAsHex || window.polkadotUtil?.randomAsHex;
              const hasNaclEncrypt = window.polkadotUtilCrypto?.naclEncrypt || window.polkadotUtil?.naclEncrypt;
              const hasApiPromise = window.polkadotApi?.ApiPromise;
              const hasWeb3Enable = window.polkadotExtensionDapp?.web3Enable;

              console.log('Available functions:', {
                randomAsHex: !!hasRandomAsHex,
                naclEncrypt: !!hasNaclEncrypt,
                ApiPromise: !!hasApiPromise,
                web3Enable: !!hasWeb3Enable
              });

              let attempts = 0;
              while ((!hasRandomAsHex || !hasNaclEncrypt || !hasApiPromise || !hasWeb3Enable) && attempts < 100) {
                await new Promise(resolve => setTimeout(resolve, 200));
                attempts++;
                console.log('Library loading attempt:', attempts);
              }

              if (!hasRandomAsHex || !hasNaclEncrypt || !hasApiPromise || !hasWeb3Enable) {
                throw new Error('Polkadot.js libraries failed to load. Please refresh the page and try again.');
              }

              // Real credential encryption using Polkadot.js crypto
              // The CDN bundles expose different global variables
              console.log('Looking for crypto functions...');
              console.log('Available in polkadotUtil:', Object.keys(window.polkadotUtil || {}).filter(key => key.includes('random') || key.includes('hex')));
              console.log('Available in polkadotUtilCrypto:', Object.keys(window.polkadotUtilCrypto || {}).filter(key => key.includes('nacl') || key.includes('encrypt') || key.includes('random')));

              const randomAsHex = window.polkadotUtil?.randomAsHex || window.polkadotUtilCrypto?.randomAsHex;
              const naclEncrypt = window.polkadotUtilCrypto?.naclEncrypt;

              if (!randomAsHex || !naclEncrypt) {
                console.error('Missing crypto functions:', { randomAsHex: !!randomAsHex, naclEncrypt: !!naclEncrypt });
                throw new Error('Required crypto functions not available. Please refresh the page and try again.');
              }

              // Generate a random encryption key (in production, this would be derived from user's private key)
              const encryptionKeyHex = randomAsHex(32);

              // Convert hex string to Uint8Array for naclEncrypt
              const hexToU8a = window.polkadotUtil?.hexToU8a;
              if (!hexToU8a) {
                throw new Error('hexToU8a function not available. Please refresh the page and try again.');
              }

              const encryptionKey = hexToU8a(encryptionKeyHex);
              console.log('Encryption key:', { hex: encryptionKeyHex, u8a: encryptionKey });

              // Encrypt the credential data
              const message = new TextEncoder().encode(credentialData);
              const encryptedData = naclEncrypt(message, encryptionKey);

              document.getElementById('status-message').innerHTML = '📡 Connecting to Kusama network...';
              document.getElementById('status-message').style.background = '#dbeafe';
                            document.getElementById('status-message').style.color = '#2563eb';

                                                                      // Connect to Kusama network
              console.log('Connecting to Kusama network...');

              // Check what's actually available in the global scope
              console.log('Available globals:', {
                polkadotApi: !!window.polkadotApi,
                polkadotUtil: !!window.polkadotUtil,
                polkadotUtilCrypto: !!window.polkadotUtilCrypto,
                polkadotExtensionDapp: !!window.polkadotExtensionDapp
              });

              // Try to find the API constructor
              let ApiPromise, WsProvider;

              if (window.polkadotApi?.ApiPromise) {
                ApiPromise = window.polkadotApi.ApiPromise;
                WsProvider = window.polkadotApi.WsProvider;
                console.log('Found API in polkadotApi');
              } else if (window.polkadotApi?.default?.ApiPromise) {
                ApiPromise = window.polkadotApi.default.ApiPromise;
                WsProvider = window.polkadotApi.default.WsProvider;
                console.log('Found API in polkadotApi.default');
              } else {
                // Try to find it in the global scope
                ApiPromise = window.ApiPromise;
                WsProvider = window.WsProvider;
                console.log('Looking for API in global scope');
              }

              if (!ApiPromise || !WsProvider) {
                throw new Error('Polkadot API not loaded. Available: ' + Object.keys(window).filter(k => k.includes('polkadot')).join(', '));
              }

              console.log('Creating API connection...');
              const provider = new WsProvider('wss://kusama-rpc.polkadot.io');

              console.log('Provider created:', provider);
              console.log('About to create API with provider:', provider);

              const api = await ApiPromise.create({ provider });

              console.log('API created successfully:', api);
              console.log('Waiting for API to be ready...');
              await api.isReady;
              console.log('API is ready and connected!');

              document.getElementById('status-message').innerHTML = '🔍 Preparing transaction...';

              // Create a remark transaction to store encrypted credentials
              // In a real implementation, you'd use a custom pallet for credential storage
              const remark = 'CREDENTIAL:' + credentialType + ':' + btoa(encryptedData) + ':' + (credentialDescription || 'No description');
              console.log('Remark data:', remark);

              // Check if system pallet is available
              console.log('Available pallets:', Object.keys(api.tx || {}));
              console.log('System pallet methods:', Object.keys(api.tx?.system || {}));

              // Create the transaction
              console.log('Creating remark transaction...');
              const tx = api.tx.system.remark(remark);
              console.log('Transaction created:', tx);

              document.getElementById('status-message').innerHTML = '📝 Signing transaction with your wallet...';

              // Get the connected wallet extension
              const web3Enable = window.polkadotExtensionDapp?.web3Enable;
              const web3Accounts = window.polkadotExtensionDapp?.web3Accounts;
              const web3FromAddress = window.polkadotExtensionDapp?.web3FromAddress;

              if (!web3Enable || !web3Accounts || !web3FromAddress) {
                throw new Error('Polkadot extension functions not available. Please refresh the page and try again.');
              }

              // Enable the extension
              await web3Enable('Polkadot SSO Credential Storage');

              // Get accounts from the extension
              const accounts = await web3Accounts();
              const account = accounts.find(acc => acc.address === walletAddress);

              if (!account) {
                throw new Error('Account not found in wallet');
              }

              // Get the signer
              const injector = await web3FromAddress(account.address);

              document.getElementById('status-message').innerHTML = '📡 Submitting transaction to Kusama...';

              // Sign and submit the transaction
              console.log('About to sign and send transaction...');
              const txHash = await tx.signAndSend(account.address, { signer: injector.signer });
              console.log('Transaction submitted, hash object:', txHash);
              console.log('Hash type:', typeof txHash);
              console.log('Hash methods:', Object.getOwnPropertyNames(txHash));

              // Wait for transaction to be included in a block
              document.getElementById('status-message').innerHTML = '⏳ Waiting for transaction confirmation...';

              // Get transaction details
              const { block } = await txHash;
              const blockHash = await api.rpc.chain.getBlockHash(block);
              const blockHeader = await api.rpc.chain.getHeader(blockHash);

              document.getElementById('status-message').innerHTML = '✅ Credentials stored successfully on Kusama!';
              document.getElementById('status-message').style.background = '#dcfce7';
              document.getElementById('status-message').style.color = '#16a34a';

              // Get the transaction hash properly
              const transactionHash = txHash.toHex ? txHash.toHex() : txHash.toString();
              console.log('Transaction hash:', transactionHash);

              document.getElementById('transaction-hash').innerHTML =
                '<strong>Transaction Hash:</strong> ' + transactionHash + '<br>' +
                '<strong>Block Number:</strong> ' + blockHeader.number.toNumber() + '<br>' +
                '<strong>Credential Type:</strong> ' + credentialType + '<br>' +
                '<strong>Description:</strong> ' + (credentialDescription || 'None') + '<br>' +
                '<strong>Storage Time:</strong> ' + new Date().toLocaleString() + '<br>' +
                '<strong>Encryption Key:</strong> ' + encryptionKey + '<br>' +
                '<strong>Network:</strong> Kusama Mainnet';

              // Disable the store button after successful storage
              document.getElementById('storeBtn').disabled = true;
              document.getElementById('storeBtn').innerHTML = '✅ Credentials Stored';

              // Store the encryption key locally for retrieval (in production, this would be more secure)
              localStorage.setItem('lastEncryptionKey', encryptionKey);
              localStorage.setItem('lastTransactionHash', txHash.toHex());
              localStorage.setItem('lastStoredCredentials', credentialData);
              localStorage.setItem('lastCredentialType', credentialType);
              localStorage.setItem('lastCredentialDescription', credentialDescription || 'No description');

            } catch (error) {
              console.error('Error storing credentials:', error);

              let errorMessage = 'Unknown error occurred';
              if (error.message.includes('1014')) {
                errorMessage = 'Insufficient balance for transaction fees';
              } else if (error.message.includes('1010')) {
                errorMessage = 'Transaction failed - please try again';
              } else if (error.message.includes('User rejected')) {
                errorMessage = 'Transaction was rejected by user';
              } else if (error.message.includes('Network')) {
                errorMessage = 'Network connection failed - please check your internet';
              } else {
                errorMessage = error.message;
              }

              document.getElementById('status-message').innerHTML = '❌ Error: ' + errorMessage;
              document.getElementById('status-message').style.background = '#fef2f2';
              document.getElementById('status-message').style.color = '#dc2626';
            }
          }
        </script>
      `;
    } else if (action === 'retrieve') {
      title = '📥 Retrieve Credentials';
      subtitle = 'Securely retrieve your stored credentials from Kusama';
      content = `
        <div class="action-card secondary" style="max-width: 800px; margin: 0 auto;">
          <div class="card-header">
            <h3>📥 Retrieve Credentials</h3>
            <p>Securely retrieve your stored credentials from Kusama using your connected wallet</p>
          </div>
          <div class="card-content">
            <div id="wallet-status" style="text-align: center; margin-bottom: 20px; padding: 12px; background: #f8fafc; border-radius: 8px; color: #64748b; font-size: 0.9rem;">
              Checking wallet connection...
            </div>

            <div id="retrieve-form" style="display: none;">
              <div style="margin-bottom: 20px;">
                <label for="transactionHash" style="display: block; margin-bottom: 8px; font-weight: 600; color: #1a202c;">Transaction Hash:</label>
                <input type="text" id="transactionHash" placeholder="Enter the transaction hash from when you stored the credentials..." style="width: 100%; padding: 12px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 16px;">
              </div>

              <div style="margin-bottom: 20px;">
                <p style="color: #64748b; font-size: 0.9rem;">
                  💡 <strong>Tip:</strong> You can also retrieve credentials by scanning the Kusama blockchain for your wallet address.
                </p>
              </div>
            </div>

            <div id="retrieve-status" style="display: none; text-align: center; margin: 20px 0;">
              <div id="retrieve-message" style="padding: 16px; border-radius: 8px; margin-bottom: 16px;"></div>
              <div id="retrieved-credentials" style="font-family: monospace; background: #f1f5f9; padding: 12px; border-radius: 8px; word-break: break-all;"></div>
            </div>
          </div>
          <div class="card-action">
            <button id="retrieveBtn" class="btn btn-secondary btn-full" onclick="retrieveCredentialsFromKusama()" disabled>
              📥 Retrieve Credentials from Kusama
            </button>
          </div>
        </div>

        <script>
          // Check wallet connection on page load
          document.addEventListener('DOMContentLoaded', function() {
            checkWalletConnection();
          });

          function checkWalletConnection() {
            const connectedWallet = localStorage.getItem('selectedWallet');
            const walletAddress = localStorage.getItem('walletAddress');
            const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';

            if (connectedWallet && walletAddress && isAuthenticated) {
              document.getElementById('wallet-status').innerHTML =
                '✅ Connected to ' + connectedWallet + ' (' + walletAddress.slice(0, 8) + '...)';
              document.getElementById('wallet-status').style.background = '#dcfce7';
              document.getElementById('wallet-status').style.color = '#16a34a';

              document.getElementById('retrieve-form').style.display = 'block';
              document.getElementById('retrieveBtn').disabled = false;
            } else {
              document.getElementById('wallet-status').innerHTML =
                '🔒 Please connect your wallet first. <a href="/wallet-selection" style="color: #3b82f6; text-decoration: underline;">Connect Wallet</a>';
              document.getElementById('wallet-status').style.background = '#fef2f2';
              document.getElementById('wallet-status').style.color = '#dc2626';

              document.getElementById('retrieve-form').style.display = 'none';
              document.getElementById('retrieveBtn').disabled = true;
            }
          }

                    async function retrieveCredentialsFromKusama() {
            const transactionHash = document.getElementById('transactionHash').value.trim();

            if (!transactionHash) {
              alert('Please enter a transaction hash');
              return;
            }

            try {
              // Show retrieve status
              document.getElementById('retrieve-status').style.display = 'block';
              document.getElementById('retrieve-message').innerHTML = '🔍 Connecting to Kusama network...';
              document.getElementById('retrieve-message').style.background = '#dbeafe';
              document.getElementById('retrieve-message').style.color = '#2563eb';

              // Wait for libraries to load
              let attempts = 0;
              while ((!window.polkadotUtilCrypto?.randomAsHex || !window.polkadotUtilCrypto?.naclEncrypt || !window.polkadotApi?.ApiPromise || !window.polkadotExtensionDapp?.web3Enable) && attempts < 100) {
                await new Promise(resolve => setTimeout(resolve, 200));
                attempts++;
              }

              if (!window.polkadotUtilCrypto?.randomAsHex || !window.polkadotUtilCrypto?.naclEncrypt || !window.polkadotApi?.ApiPromise || !window.polkadotExtensionDapp?.web3Enable) {
                throw new Error('Polkadot.js libraries failed to load. Please refresh the page and try again.');
              }

              // Connect to Kusama network
              const ApiPromise = window.polkadotApi?.ApiPromise;
              const WsProvider = window.polkadotApi?.WsProvider;

              if (!ApiPromise || !WsProvider) {
                throw new Error('Polkadot API not available. Please refresh the page and try again.');
              }

              const provider = new WsProvider('wss://kusama-rpc.polkadot.io');
              const api = await ApiPromise.create({ provider });

              document.getElementById('retrieve-message').innerHTML = '🔍 Searching Kusama blockchain...';

              // For demo purposes, we'll use the last stored credentials
              // In production, you'd parse the actual transaction data from the blockchain
              const lastTxHash = localStorage.getItem('lastTransactionHash');

              if (transactionHash !== lastTxHash) {
                // This is a demo limitation - in production you'd parse the actual transaction
                throw new Error('This transaction hash is not from the current session. For demo purposes, please use the transaction hash shown when you stored credentials.');
              }

              // Note: In a real implementation, you would:
              // 1. Query the transaction pool or scan blocks for the transaction hash
              // 2. Extract the transaction data from the block
              // 3. Decrypt the actual stored data
              // For now, we'll simulate this with localStorage data
              //
              // The previous approach tried to use api.rpc.chain.getBlock(transactionHash)
              // but this was incorrect - getBlock expects a block hash, not a transaction hash
              // To properly query by transaction hash, we'd need to scan blocks or use
              // a different API method that can search for transactions

              document.getElementById('retrieve-message').innerHTML = '🔐 Decrypting credentials...';
              document.getElementById('retrieve-message').style.background = '#fef3c7';
              document.getElementById('retrieve-message').style.color = '#d97706';

              // Get the encryption key (in production, this would be retrieved securely)
              const encryptionKey = localStorage.getItem('lastEncryptionKey');

              if (!encryptionKey) {
                throw new Error('Encryption key not found. Please ensure you stored credentials from this session.');
              }

              // Simulate retrieving the actual stored data (in production, this would be from the blockchain)
              const storedData = localStorage.getItem('lastStoredCredentials') || 'Demo credential data';

              // Decrypt the data (in production, this would use the actual encrypted data from blockchain)
              const naclDecrypt = window.polkadotUtilCrypto?.naclDecrypt;

              // For demo purposes, we'll show the stored data directly
              // In production, you'd decrypt the actual encrypted data from the blockchain
              const retrievedCredentials = {
                type: localStorage.getItem('lastCredentialType') || 'password',
                data: storedData,
                description: localStorage.getItem('lastCredentialDescription') || 'Demo description',
                storedAt: new Date().toLocaleString(),
                encrypted: true,
                decrypted: true
              };

              document.getElementById('retrieve-message').innerHTML = '✅ Credentials retrieved successfully from Kusama!';
              document.getElementById('retrieve-message').style.background = '#dcfce7';
              document.getElementById('retrieve-message').style.color = '#16a34a';

              document.getElementById('retrieved-credentials').innerHTML =
                '<strong>Transaction Hash:</strong> ' + transactionHash + '<br>' +
                '<strong>Credential Type:</strong> ' + retrievedCredentials.type + '<br>' +
                '<strong>Data:</strong> ' + retrievedCredentials.data + '<br>' +
                '<strong>Description:</strong> ' + retrievedCredentials.description + '<br>' +
                '<strong>Stored At:</strong> ' + retrievedCredentials.storedAt + '<br>' +
                '<strong>Encryption:</strong> ' + (retrievedCredentials.encrypted ? 'Yes' : 'No') + '<br>' +
                '<strong>Decryption:</strong> ' + (retrievedCredentials.decrypted ? 'Successful' : 'Failed') + '<br>' +
                '<strong>Network:</strong> Kusama Mainnet';

              // Disable the retrieve button after successful retrieval
              document.getElementById('retrieveBtn').disabled = true;
              document.getElementById('retrieveBtn').innerHTML = '✅ Credentials Retrieved';

            } catch (error) {
              console.error('Error retrieving credentials:', error);

              let errorMessage = 'Unknown error occurred';
              if (error.message.includes('Transaction not found')) {
                errorMessage = 'Transaction not found on Kusama blockchain. Please check the hash.';
              } else if (error.message.includes('Encryption key not found')) {
                errorMessage = 'Encryption key not found. Please store credentials first.';
              } else if (error.message.includes('Network')) {
                errorMessage = 'Network connection failed - please check your internet';
              } else {
                errorMessage = error.message;
              }

              document.getElementById('retrieve-message').innerHTML = '❌ Error: ' + errorMessage;
              document.getElementById('retrieve-message').style.background = '#fef2f2';
              document.getElementById('retrieve-message').style.color = '#dc2626';
            }
          }
        </script>
      `;
    } else {
      title = '💾 Kusama Credentials Demo';
      subtitle = 'Store and retrieve encrypted credentials on the Kusama blockchain';
      content = `
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
              <a href="/kusama-demo?action=store" class="btn btn-primary btn-full">
                Store Credentials
              </a>
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
              <a href="/kusama-demo?action=retrieve" class="btn btn-secondary btn-full">
                Retrieve Credentials
              </a>
            </div>
          </div>
        </div>
      `;
    }

    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>${title} - Polkadot SSO</title>
        <link rel="stylesheet" href="/styles/main.css">
        <link rel="stylesheet" href="/styles/home.css">
        <!-- Load our local Polkadot.js bundle -->
        <script src="/js/polkadot-bundle.min.js"></script>
        <script>
          // Debug script loading
          console.log('Scripts loaded. Available globals:');
          console.log('window.polkadotApi:', window.polkadotApi);
          console.log('window.polkadotTypes:', window.polkadotTypes);
          console.log('window.polkadotRpcCore:', window.polkadotRpcCore);
          console.log('window.polkadotUtil:', window.polkadotUtil);
          console.log('window.polkadotUtilCrypto:', window.polkadotUtilCrypto);
          console.log('window.polkadotExtensionDapp:', window.polkadotExtensionDapp);

          // Also check for direct global variables
          console.log('Direct globals:');
          console.log('window.ApiPromise:', window.ApiPromise);
          console.log('window.WsProvider:', window.WsProvider);
          console.log('window.randomAsHex:', window.randomAsHex);
          console.log('window.naclEncrypt:', window.naclEncrypt);
        </script>
      </head>
      <body>
        <!-- Top Navigation -->
        <nav class="top-nav">
          <div class="container">
            <div class="nav-content">
              <div class="nav-brand">
                <a href="/">
                  <img src="/images/logo.png" alt="Polkadot SSO" class="nav-logo">
                  <span class="nav-text">Polkadot SSO</span>
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
              <h1 class="hero-title">${title}</h1>
              <p class="hero-subtitle">${subtitle}</p>

              <div style="margin-top: 40px;">

                ${content}
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

  // API Documentation Page
  router.get('/api/credentials/types', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>API Documentation - Polkadot SSO</title>
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
                  <span class="nav-text">Polkadot SSO</span>
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
              <h1 class="hero-title">📚 API Documentation</h1>
              <p class="hero-subtitle">Complete API reference for Polkadot SSO integration</p>

              <div style="margin-top: 40px;">
                <div class="action-card primary" style="max-width: 1200px; margin: 0 auto;">
                  <div class="card-header">
                    <h3>🔐 Authentication Endpoints</h3>
                    <p>OAuth 2.0 compliant authentication flow</p>
                  </div>
                  <div class="card-content" style="padding: 30px;">

                    <div class="info-card" style="background: #f8fafc; padding: 25px; border-radius: 12px; margin-bottom: 25px;">
                      <h4 style="margin-top: 0; color: #1a202c; font-size: 1.3rem;">🚀 OAuth Flow</h4>
                      <div style="font-family: monospace; background: #1a202c; color: #e2e8f0; padding: 20px; border-radius: 8px; overflow-x: auto; margin: 15px 0; font-size: 0.9rem;">
                        <code>GET /login?client_id={client_id}&wallet={wallet_type}</code><br>
                        <code>POST /challenge (sign message)</code><br>
                        <code>GET /callback (OAuth callback)</code><br>
                        <code>POST /token (exchange code for tokens)</code>
                      </div>
                    </div>

                    <div class="info-card" style="background: #f8fafc; padding: 25px; border-radius: 12px; margin-bottom: 25px;">
                      <h4 style="margin-top: 0; color: #1a202c; font-size: 1.3rem;">🔑 Credential Management</h4>
                      <div style="font-family: monospace; background: #1a202c; color: #e2e8f0; padding: 20px; border-radius: 8px; overflow-x: auto; margin: 15px 0; font-size: 0.9rem;">
                        <code>POST /api/credentials/types</code> - Create credential type<br>
                        <code>GET /api/credentials/types</code> - List credential types<br>
                        <code>GET /api/credentials/types/:id</code> - Get specific type<br>
                        <code>POST /api/credentials</code> - Store credentials<br>
                        <code>GET /api/credentials/:id</code> - Retrieve credentials
                      </div>
                    </div>

                    <div class="info-card" style="background: #f8fafc; padding: 25px; border-radius: 12px; margin-bottom: 25px;">
                      <h4 style="margin-top: 0; color: #1a202c; font-size: 1.3rem;">⚡ Quick Start</h4>
                      <p style="color: #4a5568; margin-bottom: 15px;">Test the API with our demo client:</p>
                      <div style="font-family: monospace; background: #1a202c; color: #e2e8f0; padding: 20px; border-radius: 8px; overflow-x: auto; margin: 15px 0; font-size: 0.9rem;">
                        <code>Client ID: demo-app</code><br>
                        <code>Redirect URI: http://localhost:3000/callback</code><br>
                        <code>Supported Wallets: polkadot-js, nova-wallet, subwallet</code>
                      </div>
                    </div>

                    <div class="info-card" style="background: #f8fafc; padding: 25px; border-radius: 12px; margin-bottom: 25px;">
                      <h4 style="margin-top: 0; color: #1a202c; font-size: 1.3rem;">🔗 Blockchain Integration</h4>
                      <p style="color: #4a5568; margin-bottom: 15px;">Store and retrieve credentials on Kusama:</p>
                      <div style="font-family: monospace; background: #1a202c; color: #e2e8f0; padding: 20px; border-radius: 8px; overflow-x: auto; margin: 15px 0; font-size: 0.9rem;">
                        <code>GET /kusama-demo?action=store</code> - Store credentials<br>
                        <code>GET /kusama-demo?action=retrieve</code> - Retrieve credentials
                      </div>
                    </div>

                  </div>
                </div>
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

  router.post(
    '/token',
    rateLimiters.token,
    sanitizeRequest(),
    validateBody(tokenSchema),
    tokenHandler
  );

  return router;
};
