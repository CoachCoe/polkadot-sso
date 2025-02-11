"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAuthRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../config/auth");
const util_crypto_1 = require("@polkadot/util-crypto");
const validation_1 = require("../utils/validation");
const createAuthRouter = (tokenService, challengeService, clients) => {
    const router = (0, express_1.Router)();
    router.get('/login', auth_1.authLimiter, async (req, res) => {
        try {
            const validation = (0, validation_1.validateAuthRequest)(req);
            if (!validation.isValid) {
                return res.status(400).send(validation.error);
            }
            const { client_id } = req.query;
            const client = clients.get(client_id);
            if (!client) {
                return res.status(400).send('Invalid client');
            }
            const escapedClientId = JSON.stringify(client_id);
            res.send(`
      <html>
        <head>
          <title>Login with Polkadot</title>
          <link rel="stylesheet" href="/styles/main.css">
          <link rel="icon" type="image/x-icon" href="/favicon.ico">
        </head>
        <body>
          <div class="container">
            <h1>Login with Polkadot</h1>
            <div id="status">Ready to connect...</div>
            <button id="connectButton">
              <span id="buttonText">Connect Wallet</span>
              <span id="loadingSpinner" class="loading" style="display: none;"></span>
            </button>
          </div>
          <script>
            window.SSO_CONFIG = {
              clientId: ${escapedClientId},
              appName: "Polkadot SSO Demo"
            };
          </script>
          <script type="module" src="/js/client/login.js"></script>
        </body>
      </html>
    `);
        }
        catch (error) {
            console.error('Login error:', error);
            res.status(500).send('Authentication failed');
        }
    });
    router.get('/challenge', auth_1.authLimiter, async (req, res) => {
        try {
            const { address, client_id } = req.query;
            const client = clients.get(client_id);
            if (!client) {
                return res.status(400).send('Invalid client');
            }
            if (!address) {
                return res.status(400).send('Address is required');
            }
            const challenge = challengeService.generateChallenge(client_id);
            await challengeService.storeChallenge(challenge);
            res.send(`
      <html>
        <head>
          <title>Sign Message</title>
          <link rel="stylesheet" href="/styles/main.css">
          <link rel="icon" type="image/x-icon" href="/favicon.ico">
          <script src="https://cdn.jsdelivr.net/npm/@polkadot/util@12.6.2/bundle-polkadot-util.min.js"></script>
          <script src="https://cdn.jsdelivr.net/npm/@polkadot/extension-dapp@0.46.6/bundle-polkadot-extension-dapp.min.js"></script>
        </head>
        <body>
          <div class="container">
            <h2>Sign Message</h2>
            <div class="message-box">
              <p><strong>Message:</strong> ${challenge.message}</p>
              <p><strong>Address:</strong> ${address}</p>
            </div>
            <div id="status"></div>
            <button id="signButton">
              <span id="buttonText">Sign with Wallet</span>
              <span id="loadingSpinner" class="loading" style="display: none;"></span>
            </button>
          </div>
          <script>
            window.CHALLENGE_DATA = {
              address: ${JSON.stringify(address)},
              message: ${JSON.stringify(challenge.message)},
              challengeId: ${JSON.stringify(challenge.id)}
            };
          </script>
          <script src="/js/client/challenge.js"></script>
        </body>
      </html>
    `);
        }
        catch (error) {
            console.error('Challenge error:', error);
            res.status(500).send('Challenge generation failed');
        }
    });
    router.get('/verify', auth_1.authLimiter, async (req, res) => {
        try {
            const { signature, challenge_id, address } = req.query;
            if (!signature || !challenge_id || !address) {
                return res.status(400).send('Missing required parameters');
            }
            const sigValidation = (0, validation_1.validateSignature)(signature);
            if (!sigValidation.isValid) {
                return res.status(400).send(sigValidation.error);
            }
            const challenge = await challengeService.getChallenge(challenge_id);
            if (!challenge) {
                return res.status(400).send('Invalid or used challenge');
            }
            if (Date.now() > challenge.expires_at) {
                return res.status(401).send('Challenge expired');
            }
            await (0, util_crypto_1.cryptoWaitReady)();
            const { isValid } = (0, util_crypto_1.signatureVerify)(challenge.message, signature, address);
            if (!isValid) {
                return res.status(401).send('Invalid signature');
            }
            await challengeService.markChallengeUsed(challenge_id);
            const tokens = tokenService.generateTokens(address, challenge.client_id);
            const client = clients.get(challenge.client_id);
            res.redirect(`${client.redirect_url}?` +
                `access_token=${tokens.accessToken}&` +
                `refresh_token=${tokens.refreshToken}&` +
                `fingerprint=${tokens.fingerprint}`);
        }
        catch (error) {
            console.error('Verification error:', error);
            res.status(500).send('Verification failed');
        }
    });
    return router;
};
exports.createAuthRouter = createAuthRouter;
