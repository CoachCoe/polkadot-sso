"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAuthRouter = void 0;
const util_crypto_1 = require("@polkadot/util-crypto");
const crypto_1 = __importStar(require("crypto"));
const express_1 = require("express");
const zod_1 = require("zod");
// Import from modular structure
const modules_1 = require("../modules");
const db_1 = require("../utils/db");
const logger_1 = require("../utils/logger");
const sanitization_1 = require("../utils/sanitization");
const validation_1 = require("../utils/validation");
const loginSchema = zod_1.z.object({
    query: zod_1.z.object({
        client_id: zod_1.z.string().min(1),
    }),
});
const tokenSchema = zod_1.z.object({
    code: zod_1.z.string().min(32).max(64),
    client_id: zod_1.z.string().min(1),
    client_secret: zod_1.z.string().min(32),
});
const challengeSchema = zod_1.z.object({
    query: zod_1.z.object({
        address: zod_1.z.string().min(1),
        client_id: zod_1.z.string().min(1),
    }),
});
const verifySchema = zod_1.z.object({
    query: zod_1.z.object({
        signature: zod_1.z.string(),
        challenge_id: zod_1.z.string(),
        address: zod_1.z.string(),
    }),
});
async function generateCodeChallenge(verifier) {
    const hash = (0, crypto_1.createHash)('sha256');
    hash.update(verifier);
    return hash.digest('base64url');
}
const createAuthRouter = (tokenService, challengeService, auditService, clients, db) => {
    const router = (0, express_1.Router)();
    const rateLimiters = (0, modules_1.createRateLimiters)(auditService);
    const loginHandler = async (req, res) => {
        try {
            (0, logger_1.logRequest)(req, 'Login attempt', { address: req.query.address });
            const validation = (0, validation_1.validateAuthRequest)(req);
            if (!validation.isValid) {
                (0, logger_1.logError)(req, new Error(validation.error || 'Validation failed'));
                return res.status(400).json({ error: validation.error });
            }
            const { client_id } = req.query;
            const client = clients.get(client_id);
            if (!client) {
                (0, logger_1.logError)(req, new Error(`Invalid client_id: ${String(client_id)}`));
                return res.status(400).json({ error: 'Invalid client' });
            }
            const escapedClientId = JSON.stringify(client_id);
            const escapedAppName = JSON.stringify(client.name);
            await auditService.log({
                type: 'AUTH_ATTEMPT',
                client_id: client_id,
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
              <span id="loadingSpinner" class="loading" style="display: none;"></span>
            </button>
          </div>
          <script src="/js/client/login.js"></script>
        </body>
      </html>
    `);
        }
        catch (error) {
            (0, logger_1.logError)(req, error);
            await auditService.log({
                type: 'AUTH_ATTEMPT',
                client_id: req.query.client_id || 'unknown',
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
    const challengeHandler = async (req, res) => {
        try {
            const { address, client_id } = req.query;
            const client = clients.get(client_id);
            if (!client) {
                (0, logger_1.logError)(req, new Error(`Invalid client_id: ${String(client_id)}`));
                return res.status(400).json({ error: 'Invalid client' });
            }
            if (!address) {
                (0, logger_1.logError)(req, new Error('Address is required'));
                return res.status(400).json({ error: 'Address is required' });
            }
            const challenge = await challengeService.generateChallenge(client_id);
            await challengeService.storeChallenge(challenge);
            res.send(`
      <html>
        <head>
          <title>${(0, sanitization_1.escapeHtml)(client.name)}</title>
          <link rel="stylesheet" href="/styles/main.css">
          <script nonce="${res.locals.nonce}">
            window.CHALLENGE_DATA = {
              address: "${(0, sanitization_1.escapeHtml)(address)}",
              message: "${(0, sanitization_1.escapeHtml)(challenge.message)}",
              challengeId: "${(0, sanitization_1.escapeHtml)(challenge.id)}",
              codeVerifier: "${(0, sanitization_1.escapeHtml)(challenge.code_verifier)}",
              state: "${(0, sanitization_1.escapeHtml)(challenge.state)}"
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
              <p><strong>Message:</strong> ${(0, sanitization_1.escapeHtml)(challenge.message)}</p>
              <p><strong>Address:</strong> ${(0, sanitization_1.escapeHtml)(address)}</p>
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
        }
        catch (error) {
            (0, logger_1.logError)(req, error);
            console.error('Challenge error:', error);
            res.status(500).json({ error: 'Challenge generation failed' });
        }
    };
    const verifyHandler = async (req, res) => {
        try {
            const { signature, challenge_id, address, code_verifier, state } = req.query;
            if (!signature || !challenge_id || !address || !code_verifier || !state) {
                return res.status(400).send('Missing required parameters');
            }
            const challenge = await challengeService.getChallenge(challenge_id);
            if (!challenge || challenge.state !== state) {
                return res.status(400).send('Invalid challenge or state mismatch');
            }
            const code_challenge = await generateCodeChallenge(code_verifier);
            if (code_challenge !== challenge.code_challenge) {
                return res.status(400).send('Invalid code verifier');
            }
            await (0, util_crypto_1.cryptoWaitReady)();
            const { isValid } = (0, util_crypto_1.signatureVerify)(challenge.message, signature, address);
            if (!isValid) {
                return res.status(401).send('Invalid signature');
            }
            await challengeService.markChallengeUsed(challenge_id);
            const authCode = crypto_1.default.randomBytes(32).toString('hex');
            await db.run(`INSERT INTO auth_codes (
         code, address, client_id, created_at, expires_at
       ) VALUES (?, ?, ?, ?, ?)`, [authCode, address, challenge.client_id, Date.now(), Date.now() + 5 * 60 * 1000]);
            const client = clients.get(challenge.client_id);
            res.redirect(`${client.redirect_url}?` + `code=${authCode}&` + `state=${state}`);
        }
        catch (error) {
            (0, logger_1.logError)(req, error);
            console.error('Verify error:', error);
            res.status(500).json({ error: 'Verification failed' });
        }
    };
    const tokenHandler = async (req, res) => {
        try {
            const { code, client_id } = req.body;
            const client = await (0, validation_1.validateClientCredentials)();
            if (!client) {
                return res.status(401).send('Invalid client credentials');
            }
            const authCode = await db_1.secureQueries.authCodes.verify(db, String(code), String(client_id));
            if (!authCode || Date.now() > authCode.expires_at) {
                return res.status(400).send('Invalid or expired authorization code');
            }
            await db_1.secureQueries.authCodes.markUsed(db, String(code));
            const tokens = tokenService.generateTokens(String(authCode.address), String(client_id));
            res.json({
                access_token: tokens.accessToken,
                refresh_token: tokens.refreshToken,
                token_type: 'Bearer',
                expires_in: 900,
            });
        }
        catch (error) {
            console.error('Token exchange error:', error);
            res.status(500).send('Token exchange failed');
        }
    };
    router.get('/login', rateLimiters.login, (0, modules_1.sanitizeRequest)(), (0, modules_1.validateBody)(loginSchema), loginHandler);
    router.get('/challenge', rateLimiters.challenge, (0, modules_1.sanitizeRequest)(), (0, modules_1.validateBody)(challengeSchema), challengeHandler);
    router.get('/verify', rateLimiters.verify, (0, modules_1.sanitizeRequest)(), (0, modules_1.validateBody)(verifySchema), verifyHandler);
    router.post('/token', rateLimiters.token, (0, modules_1.sanitizeRequest)(), (0, modules_1.validateBody)(tokenSchema), tokenHandler);
    return router;
};
exports.createAuthRouter = createAuthRouter;
//# sourceMappingURL=auth.js.map