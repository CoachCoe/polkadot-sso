"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateChallengePage = generateChallengePage;
exports.generateApiDocsPage = generateApiDocsPage;
const sanitization_js_1 = require("../../utils/sanitization.js");
function generateChallengePage(data, nonce) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Polkadot SSO - Sign Challenge</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .container {
            background: white;
            border-radius: 12px;
            padding: 40px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            max-width: 500px;
            width: 100%;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 2rem;
            font-weight: bold;
            color: #333;
            margin-bottom: 10px;
        }
        .subtitle {
            color: #666;
            font-size: 1.1rem;
        }
        .challenge-box {
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            font-family: monospace;
            font-size: 0.9rem;
            white-space: pre-wrap;
            word-break: break-all;
        }
        .btn {
            background: #007bff;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 6px;
            font-size: 1rem;
            cursor: pointer;
            width: 100%;
            margin: 10px 0;
            transition: background 0.3s;
        }
        .btn:hover {
            background: #0056b3;
        }
        .btn:disabled {
            background: #6c757d;
            cursor: not-allowed;
        }
        .status {
            padding: 10px;
            border-radius: 6px;
            margin: 10px 0;
            display: none;
        }
        .status.success {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        .status.error {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
        .loading {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 3px solid #f3f3f3;
            border-top: 3px solid #007bff;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-right: 10px;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🔐 Polkadot SSO</div>
            <div class="subtitle">Sign this message to authenticate</div>
        </div>

        <div class="challenge-box">${(0, sanitization_js_1.escapeHtml)(data.message)}</div>

        <button id="signButton" class="btn">
            <span id="buttonText">Sign with Wallet</span>
            <span id="loadingSpinner" class="loading" style="display: none;"></span>
        </button>

        <div id="status" class="status"></div>
    </div>

    <script nonce="${nonce}">
        window.CHALLENGE_DATA = {
            address: "${(0, sanitization_js_1.escapeHtml)(String(data.address ?? ''))}",
            message: ${JSON.stringify(data.message)},
            challengeId: "${(0, sanitization_js_1.escapeHtml)(data.challengeId)}",
            codeVerifier: "${(0, sanitization_js_1.escapeHtml)(data.codeVerifier)}",
            state: "${(0, sanitization_js_1.escapeHtml)(data.state)}",
            nonce: "${(0, sanitization_js_1.escapeHtml)(data.nonce)}"
        };
    </script>

    <script nonce="${nonce}">
        document.addEventListener('DOMContentLoaded', function() {
            const statusDiv = document.getElementById("status");
            const signButton = document.getElementById("signButton");
            const buttonText = document.getElementById("buttonText");
            const loadingSpinner = document.getElementById("loadingSpinner");

            console.log('CHALLENGE_DATA:', window.CHALLENGE_DATA);
            if (!window.CHALLENGE_DATA || !window.CHALLENGE_DATA.address) {
                console.error('CHALLENGE_DATA not properly set:', window.CHALLENGE_DATA);
                updateStatus("Error: Challenge data not loaded", "error");
                return;
            }

            function setLoading(isLoading) {
                signButton.disabled = isLoading;
                buttonText.textContent = isLoading ? "Signing..." : "Sign with Wallet";
                loadingSpinner.style.display = isLoading ? "inline-block" : "none";
            }

            function updateStatus(message, type) {
                statusDiv.textContent = message;
                statusDiv.className = "status " + type;
                statusDiv.style.display = "block";
            }

            signButton.addEventListener("click", async function() {
                setLoading(true);
                updateStatus("Connecting to wallet...", "info");

                try {
                    // Check if Polkadot.js extension is available
                    if (!window.injectedWeb3) {
                        throw new Error("Polkadot.js extension not found. Please install it from https://polkadot.js.org/extension/");
                    }

                    // Get the first available provider
                    const provider = Object.keys(window.injectedWeb3)[0];
                    if (!provider) {
                        throw new Error("No wallet provider found");
                    }

                    // Connect to the wallet
                    const extension = await window.injectedWeb3[provider].enable();
                    const accounts = await extension.accounts.get();

                    if (accounts.length === 0) {
                        throw new Error("No accounts found in wallet");
                    }

                    // Find the account that matches the challenge address
                    const account = accounts.find(acc => acc.address === window.CHALLENGE_DATA.address);
                    if (!account) {
                        throw new Error("Account not found in wallet");
                    }

                    updateStatus("Signing message...", "info");

                    // Sign the message
                    const signature = await extension.signer.signRaw({
                        address: account.address,
                        data: window.CHALLENGE_DATA.message,
                        type: 'bytes'
                    });

                    updateStatus("Verifying signature...", "info");

                    // Submit the signature for verification
                    const response = await fetch('/verify?' + new URLSearchParams({
                        signature: signature.signature,
                        challenge_id: window.CHALLENGE_DATA.challengeId,
                        address: window.CHALLENGE_DATA.address,
                        code_verifier: window.CHALLENGE_DATA.codeVerifier,
                        state: window.CHALLENGE_DATA.state
                    }));

                    if (response.ok) {
                        updateStatus("Authentication successful! Redirecting...", "success");
                        // The server will redirect us
                    } else {
                        const error = await response.text();
                        throw new Error("Verification failed: " + error);
                    }

                } catch (error) {
                    console.error("Authentication error:", error);
                    updateStatus("Error: " + error.message, "error");
                    setLoading(false);
                }
            });
        });
    </script>
</body>
</html>
  `;
}
function generateApiDocsPage() {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Polkadot SSO - API Documentation</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 0;
            background: #f8fafc;
            color: #2d3748;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px 0;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 2.5rem;
            font-weight: bold;
        }
        .header p {
            margin: 10px 0 0 0;
            font-size: 1.2rem;
            opacity: 0.9;
        }
        .content {
            padding: 40px 0;
        }
        .section {
            background: white;
            border-radius: 12px;
            padding: 30px;
            margin: 20px 0;
            box-shadow: 0 4px 6px rgba(0,0,0,0.05);
        }
        .section h2 {
            color: #2d3748;
            margin-top: 0;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 10px;
        }
        .endpoint {
            background: #f7fafc;
            border-left: 4px solid #4299e1;
            padding: 20px;
            margin: 15px 0;
            border-radius: 0 8px 8px 0;
        }
        .endpoint h3 {
            margin: 0 0 10px 0;
            color: #2b6cb0;
        }
        .endpoint pre {
            background: #2d3748;
            color: #e2e8f0;
            padding: 15px;
            border-radius: 6px;
            overflow-x: auto;
            margin: 10px 0;
        }
        .method {
            display: inline-block;
            background: #4299e1;
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.8rem;
            font-weight: bold;
            margin-right: 10px;
        }
        .method.get { background: #48bb78; }
        .method.post { background: #ed8936; }
    </style>
</head>
<body>
    <div class="header">
        <div class="container">
            <h1>📚 API Documentation</h1>
            <p>Complete API reference for Polkadot SSO integration</p>
        </div>
    </div>

    <div class="container">
        <div class="content">
            <div class="section">
                <h2>🔐 Authentication Endpoints</h2>
                <p>OAuth 2.0 compliant authentication flow</p>

                <div class="endpoint">
                    <h3><span class="method get">GET</span> /login</h3>
                    <p>Generate authentication challenge</p>
                    <pre><code>GET /login?client_id={client_id}&wallet={wallet_type}</code></pre>
                </div>

                <div class="endpoint">
                    <h3><span class="method post">POST</span> /verify</h3>
                    <p>Verify wallet signature</p>
                    <pre><code>POST /verify?signature={sig}&challenge_id={id}&address={addr}&code_verifier={verifier}&state={state}</code></pre>
                </div>

                <div class="endpoint">
                    <h3><span class="method get">GET</span> /callback</h3>
                    <p>OAuth callback endpoint</p>
                    <pre><code>GET /callback?code={auth_code}&state={state}</code></pre>
                </div>

                <div class="endpoint">
                    <h3><span class="method post">POST</span> /token</h3>
                    <p>Exchange authorization code for tokens</p>
                    <pre><code>POST /token
{
  "grant_type": "authorization_code",
  "code": "{auth_code}",
  "client_id": "{client_id}",
  "client_secret": "{client_secret}",
  "redirect_uri": "{redirect_uri}"
}</code></pre>
                </div>
            </div>

            <div class="section">
                <h2>🔑 Session Management</h2>
                <p>Manage user sessions and tokens</p>

                <div class="endpoint">
                    <h3><span class="method get">GET</span> /api/auth/session</h3>
                    <p>Get current session information</p>
                </div>

                <div class="endpoint">
                    <h3><span class="method post">POST</span> /api/auth/refresh</h3>
                    <p>Refresh access token</p>
                </div>

                <div class="endpoint">
                    <h3><span class="method post">POST</span> /api/auth/logout</h3>
                    <p>Logout and invalidate session</p>
                </div>
            </div>

            <div class="section">
                <h2>⚡ Quick Start</h2>
                <p>To use the API, you'll need to register a client application:</p>
                <pre><code>Client ID: default-client
Redirect URI: http://localhost:3000/callback
Supported Wallets: polkadot-js, nova-wallet, subwallet</code></pre>
            </div>

            <div class="section">
                <h2>🔗 Client Integration</h2>
                <p>Integrate with your application using OAuth 2.0 flow:</p>
                <pre><code>GET /api/auth/challenge?client_id={client_id}&address={address}
POST /api/auth/verify - Verify signature and get tokens
GET /api/auth/status/{challenge_id} - Check challenge status</code></pre>
            </div>
        </div>
    </div>
</body>
</html>
  `;
}
//# sourceMappingURL=templates.js.map