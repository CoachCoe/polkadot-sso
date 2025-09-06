"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.polkadotAuth = polkadotAuth;
exports.requireAuth = requireAuth;
exports.optionalAuth = optionalAuth;
const express_1 = require("express");
function polkadotAuth(config = {}) {
    const router = (0, express_1.Router)();
    const finalConfig = {
        basePath: '/auth',
        routes: {
            signIn: '/signin',
            signOut: '/signout',
            callback: '/callback',
            challenge: '/challenge',
            verify: '/verify',
        },
        cors: {
            origin: true,
            credentials: true,
        },
        ...config,
    };
    if (finalConfig.cors) {
        const cors = require('cors');
        router.use(cors(finalConfig.cors));
    }
    router.get(finalConfig.routes.challenge, async (req, res) => {
        try {
            const { client_id, address, chain_id } = req.query;
            if (!client_id) {
                return res.status(400).json({ error: 'client_id is required' });
            }
            const challenge = {
                message: `Sign this message to authenticate with Polkadot SSO\n\nClient: ${client_id}\nAddress: ${address || '0x...'}\nChain: ${chain_id || 'polkadot'}\nNonce: ${Math.random().toString(36).substring(2)}`,
                id: Math.random().toString(36).substring(2),
                nonce: Math.random().toString(36).substring(2),
                expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
            };
            res.json({
                challenge: challenge.message,
                challenge_id: challenge.id,
                nonce: challenge.nonce,
                expires_at: challenge.expiresAt,
            });
        }
        catch (error) {
            console.error('Error creating challenge:', error);
            res.status(500).json({ error: 'Failed to create challenge' });
        }
    });
    router.post(finalConfig.routes.verify, async (req, res) => {
        try {
            const { challenge_id, signature, address, message } = req.body;
            if (!challenge_id || !signature || !address || !message) {
                return res.status(400).json({
                    error: 'challenge_id, signature, address, and message are required',
                });
            }
            res.json({
                success: true,
                message: 'Authentication successful',
                session: {
                    id: Math.random().toString(36).substring(2),
                    address: address,
                    accessToken: Math.random().toString(36).substring(2),
                },
            });
        }
        catch (error) {
            console.error('Error verifying signature:', error);
            res.status(500).json({ error: 'Failed to verify signature' });
        }
    });
    router.get(finalConfig.routes.signIn, (req, res) => {
        const providers = [
            {
                id: 'polkadot-js',
                name: 'Polkadot.js Extension',
                description: 'Official Polkadot browser extension',
            },
            { id: 'talisman', name: 'Talisman', description: 'Talisman wallet extension' },
            { id: 'subwallet', name: 'SubWallet', description: 'SubWallet extension' },
            {
                id: 'nova',
                name: 'Nova Wallet',
                description: 'Nova Wallet mobile app with browser bridge',
            },
        ];
        const chains = [
            { id: 'polkadot', name: 'Polkadot' },
            { id: 'kusama', name: 'Kusama' },
            { id: 'westend', name: 'Westend' },
            { id: 'rococo', name: 'Rococo' },
        ];
        res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Sign in with Polkadot</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
            .provider { margin: 10px 0; padding: 10px; border: 1px solid #ddd; border-radius: 5px; cursor: pointer; }
            .provider:hover { background-color: #f5f5f5; }
            .chain-select { margin: 10px 0; }
            select { padding: 5px; margin: 5px; }
          </style>
        </head>
        <body>
          <h1>Sign in with Polkadot</h1>

          <div class="chain-select">
            <label>Select Chain:</label>
            <select id="chainSelect">
              ${chains.map((chain) => `<option value="${chain.id}">${chain.name}</option>`).join('')}
            </select>
          </div>

          <h2>Available Wallets:</h2>
          ${providers
            .map((provider) => `
            <div class="provider" onclick="connectWallet('${provider.id}')">
              <strong>${provider.name}</strong>
              ${provider.description ? `<br><small>${provider.description}</small>` : ''}
            </div>
          `)
            .join('')}

          <script>
            async function connectWallet(providerId) {
              try {
                const chainId = document.getElementById('chainSelect').value;

                // Get challenge
                const challengeResponse = await fetch('/auth/challenge?client_id=default&chain_id=' + chainId);
                const challengeData = await challengeResponse.json();

                if (!challengeData.challenge) {
                  alert('Failed to get challenge');
                  return;
                }

                // TODO: Connect to wallet and sign message
                console.log('Connecting to', providerId);
                console.log('Challenge:', challengeData.challenge);

                // For now, just show the challenge
                alert('Challenge: ' + challengeData.challenge);

              } catch (error) {
                console.error('Error:', error);
                alert('Failed to connect wallet');
              }
            }
          </script>
        </body>
      </html>
    `);
    });
    router.post(finalConfig.routes.signOut, async (req, res) => {
        try {
            res.json({ success: true, message: 'Signed out successfully' });
        }
        catch (error) {
            console.error('Error signing out:', error);
            res.status(500).json({ error: 'Failed to sign out' });
        }
    });
    router.get(finalConfig.routes.callback, (req, res) => {
        res.json({ message: 'Callback endpoint - implement as needed' });
    });
    return router;
}
function requireAuth() {
    return async (req, res, next) => {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return res.status(401).json({ error: 'No valid authorization header' });
            }
            const token = authHeader.substring(7);
            req.user = {
                address: 'mock-address',
                session: { id: 'mock-session' },
            };
            next();
        }
        catch (error) {
            console.error('Auth middleware error:', error);
            res.status(401).json({ error: 'Authentication failed' });
        }
    };
}
function optionalAuth() {
    return async (req, res, next) => {
        try {
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                const token = authHeader.substring(7);
                req.user = {
                    address: 'mock-address',
                    session: { id: 'mock-session' },
                };
            }
            next();
        }
        catch (error) {
            console.error('Optional auth middleware error:', error);
            next();
        }
    };
}
exports.default = polkadotAuth;
//# sourceMappingURL=index.js.map