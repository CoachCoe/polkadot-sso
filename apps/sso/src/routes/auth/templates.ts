import { escapeHtml } from '../../utils/sanitization.js';
import type { TelegramWidgetTemplateData } from '../../types/telegram.js';

export interface ChallengeTemplateData {
  address?: string;
  message: string;
  challengeId: string;
  codeVerifier: string;
  state: string;
  nonce: string;
}

export function generateChallengePage(data: ChallengeTemplateData, nonce: string): string {
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

        <div class="challenge-box">${escapeHtml(data.message)}</div>

        <button id="signButton" class="btn">
            <span id="buttonText">Sign with Wallet</span>
            <span id="loadingSpinner" class="loading" style="display: none;"></span>
        </button>

        <div id="status" class="status"></div>
    </div>

    <script nonce="${nonce}">
        window.CHALLENGE_DATA = {
            address: "${escapeHtml(String(data.address ?? ''))}",
            message: ${JSON.stringify(data.message)},
            challengeId: "${escapeHtml(data.challengeId)}",
            codeVerifier: "${escapeHtml(data.codeVerifier)}",
            state: "${escapeHtml(data.state)}",
            nonce: "${escapeHtml(data.nonce)}"
        };
    </script>

    <script nonce="${nonce}">
        document.addEventListener('DOMContentLoaded', function() {
            const statusDiv = document.getElementById("status");
            const signButton = document.getElementById("signButton");
            const buttonText = document.getElementById("buttonText");
            const loadingSpinner = document.getElementById("loadingSpinner");

            console.log('CHALLENGE_DATA:', window.CHALLENGE_DATA);
            if (!window.CHALLENGE_DATA) {
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

                    // Use the first available account or find the specific one if it exists
                    let account;
                    if (window.CHALLENGE_DATA.address && window.CHALLENGE_DATA.address.trim() !== '') {
                        account = accounts.find(acc => acc.address === window.CHALLENGE_DATA.address);
                        if (!account) {
                            // Fall back to the first available account
                            account = accounts[0];
                            console.log('Requested account not found, using first available account: ' + account.address + ' instead of requested: ' + window.CHALLENGE_DATA.address);
                        }
                    } else {
                        // No specific address requested, use the first available account
                        account = accounts[0];
                        console.log('No specific address requested, using first available account: ' + account.address);
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
                    const response = await fetch('/api/auth/verify?' + new URLSearchParams({
                        signature: signature.signature,
                        challenge_id: window.CHALLENGE_DATA.challengeId,
                        address: account.address, // Use the actual account that signed
                        code_verifier: window.CHALLENGE_DATA.codeVerifier,
                        state: window.CHALLENGE_DATA.state
                    }), {
                        headers: {
                            'Accept': 'application/json'
                        }
                    });

                    if (response.ok) {
                        const result = await response.json();
                        console.log("Server response:", result);
                        if (result.success && result.redirectUrl) {
                            updateStatus("Authentication successful! Redirecting...", "success");
                            // Redirect to the callback URL with the auth code
                            setTimeout(() => {
                                window.location.href = result.redirectUrl;
                            }, 500);
                        } else {
                            console.error("Invalid response format:", result);
                            throw new Error("Invalid response from server: " + JSON.stringify(result));
                        }
                    } else {
                        const error = await response.text();
                        console.error("Server error response:", error);
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

export function generateAuthSelectionPage(clientId: string, nonce: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Polkadot SSO - Choose Authentication Method</title>
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
            max-width: 600px;
            width: 100%;
        }
        .header {
            text-align: center;
            margin-bottom: 40px;
        }
        .logo {
            font-size: 2.5rem;
            font-weight: bold;
            color: #333;
            margin-bottom: 10px;
        }
        .subtitle {
            color: #666;
            font-size: 1.1rem;
        }
        .auth-options {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 30px;
        }
        .auth-option {
            border: 2px solid #e1e5e9;
            border-radius: 12px;
            padding: 30px 20px;
            text-align: center;
            cursor: pointer;
            transition: all 0.3s ease;
            background: #f8f9fa;
        }
        .auth-option:hover {
            border-color: #667eea;
            background: #f0f2ff;
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(102, 126, 234, 0.15);
        }
        .auth-option-icon {
            font-size: 3rem;
            margin-bottom: 15px;
        }
        .auth-option-title {
            font-size: 1.2rem;
            font-weight: 600;
            color: #333;
            margin-bottom: 8px;
        }
        .auth-option-description {
            color: #666;
            font-size: 0.9rem;
            line-height: 1.4;
        }
        .polkadot-option {
            border-color: #E6007A;
        }
        .polkadot-option:hover {
            border-color: #E6007A;
            background: #fdf2f8;
            box-shadow: 0 8px 25px rgba(230, 0, 122, 0.15);
        }
        .telegram-option {
            border-color: #0088cc;
        }
        .telegram-option:hover {
            border-color: #0088cc;
            background: #f0f8ff;
            box-shadow: 0 8px 25px rgba(0, 136, 204, 0.15);
        }
        .info-section {
            background: #f8f9fa;
            border-radius: 8px;
            padding: 20px;
            margin-top: 30px;
        }
        .info-title {
            font-weight: 600;
            color: #333;
            margin-bottom: 10px;
        }
        .info-text {
            color: #666;
            font-size: 0.9rem;
            line-height: 1.5;
        }
        @media (max-width: 768px) {
            .auth-options {
                grid-template-columns: 1fr;
            }
            .container {
                padding: 30px 20px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🔐 Polkadot SSO</div>
            <div class="subtitle">Choose your authentication method</div>
        </div>

        <div class="auth-options">
            <div class="auth-option polkadot-option" id="polkadot-option">
                <div class="auth-option-icon">🟣</div>
                <div class="auth-option-title">Polkadot.js</div>
                <div class="auth-option-description">
                    Sign with your Polkadot wallet using the browser extension
                </div>
            </div>

            <div class="auth-option telegram-option" id="telegram-option">
                <div class="auth-option-icon">📱</div>
                <div class="auth-option-title">Telegram</div>
                <div class="auth-option-description">
                    Authenticate using your Telegram account
                </div>
            </div>
        </div>

        <div class="info-section">
            <div class="info-title">About Authentication Methods</div>
            <div class="info-text">
                <strong>Polkadot.js:</strong> Requires the Polkadot.js browser extension. Perfect for users who want to authenticate with their blockchain wallet.<br><br>
                <strong>Telegram:</strong> Uses Telegram's secure authentication system. Great for users who prefer social login without blockchain complexity.
            </div>
        </div>
    </div>

    <script nonce="${nonce}">
        document.addEventListener('DOMContentLoaded', function() {
            const polkadotOption = document.getElementById('polkadot-option');
            const telegramOption = document.getElementById('telegram-option');

            polkadotOption.addEventListener('click', function() {
                window.location.href = '/api/auth/challenge?client_id=${escapeHtml(clientId)}&wallet=polkadot-js';
            });

            telegramOption.addEventListener('click', function() {
                window.location.href = '/api/auth/telegram/challenge?client_id=${escapeHtml(clientId)}';
            });
        });
    </script>
</body>
</html>`;
}

export function generateTelegramWidgetPage(data: TelegramWidgetTemplateData, nonce: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Polkadot SSO - Telegram Authentication</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #0088cc 0%, #0066aa 100%);
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
        .telegram-info {
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            text-align: center;
        }
        .telegram-logo {
            font-size: 3rem;
            margin-bottom: 10px;
        }
        .bot-info {
            font-size: 0.9rem;
            color: #666;
            margin-bottom: 20px;
        }
        .btn {
            background: #0088cc;
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
            background: #0066aa;
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
        .status.info {
            background: #d1ecf1;
            color: #0c5460;
            border: 1px solid #bee5eb;
        }
        .loading {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 3px solid #f3f3f3;
            border-top: 3px solid #0088cc;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-right: 10px;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .instructions {
            background: #e3f2fd;
            border: 1px solid #bbdefb;
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
            font-size: 0.9rem;
            color: #1565c0;
        }
        .instructions ol {
            margin: 10px 0;
            padding-left: 20px;
        }
        .instructions li {
            margin: 5px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🔐 Polkadot SSO</div>
            <div class="subtitle">Authenticate with Telegram</div>
        </div>

        <div class="telegram-info">
            <div class="telegram-logo">📱</div>
            <div class="bot-info">
                <strong>Bot:</strong> @${escapeHtml(data.botUsername)}<br>
                <strong>Challenge ID:</strong> ${escapeHtml(data.challengeId)}
            </div>
        </div>

        <div class="instructions">
            <strong>Instructions:</strong>
            <ol>
                <li>Click the "Login with Telegram" button below</li>
                <li>You'll be redirected to Telegram to confirm your identity</li>
                <li>After confirmation, you'll be redirected back to complete the process</li>
            </ol>
        </div>

        <!-- Telegram Login Widget -->
        <script async src="https://telegram.org/js/telegram-widget.js?22"
                data-telegram-login="${escapeHtml(data.botUsername)}"
                data-size="large"
                data-auth-url="https://griffin-sporotrichotic-matthias.ngrok-free.dev/api/auth/telegram/callback"
                data-request-access="write">
        </script>

        <div id="status" class="status"></div>
    </div>

    <script nonce="${nonce}">
        window.TELEGRAM_AUTH_DATA = {
            challengeId: "${escapeHtml(data.challengeId)}",
            clientId: "${escapeHtml(data.clientId)}",
            botUsername: "${escapeHtml(data.botUsername)}",
            state: "${escapeHtml(data.state)}",
            codeVerifier: "${escapeHtml(data.codeVerifier)}",
            nonce: "${escapeHtml(data.nonce)}"
        };
    </script>

    <script nonce="${nonce}">
        document.addEventListener('DOMContentLoaded', function() {
            const statusDiv = document.getElementById("status");

            console.log('TELEGRAM_AUTH_DATA:', window.TELEGRAM_AUTH_DATA);

            function updateStatus(message, type) {
                statusDiv.textContent = message;
                statusDiv.className = "status " + type;
                statusDiv.style.display = "block";
            }

            updateStatus("Please use the Telegram login widget above to authenticate", "info");
        });
    </script>
</body>
</html>
  `;
}


export function generateApiDocsPage(): string {
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
Supported Wallets: polkadot-js</code></pre>
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
