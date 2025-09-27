import { createLogger } from '../../utils/logger.js';

const logger = createLogger('talisman-mobile-template');

export interface TalismanMobileChallengeTemplateData {
  challengeId: string;
  deepLinkUrl: string;
  qrCodeData: string;
  pollingToken: string;
  expiresAt: number;
  address: string;
  clientId: string;
  nonce: string;
}

export function generateTalismanMobileChallengePage(data: TalismanMobileChallengeTemplateData): string {
  logger.info('Generating Talisman Mobile challenge page', {
    challengeId: data.challengeId,
    address: data.address,
    clientId: data.clientId,
  });

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sign in with Talisman Mobile - Polkadot SSO</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }

        .container {
            background: white;
            border-radius: 16px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
            padding: 40px;
            max-width: 500px;
            width: 100%;
            text-align: center;
        }

        .logo {
            width: 80px;
            height: 80px;
            background: linear-gradient(135deg, #6366f1, #8b5cf6);
            border-radius: 50%;
            margin: 0 auto 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 32px;
            color: white;
            font-weight: bold;
        }

        h1 {
            color: #333;
            margin-bottom: 10px;
            font-size: 28px;
            font-weight: 600;
        }

        .subtitle {
            color: #666;
            margin-bottom: 30px;
            font-size: 16px;
            line-height: 1.5;
        }

        .talisman-button {
            background: #6366f1;
            color: white;
            border: none;
            border-radius: 8px;
            padding: 16px 32px;
            font-size: 16px;
            font-weight: 500;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            width: 100%;
            margin-bottom: 20px;
            transition: all 0.2s ease;
            text-decoration: none;
        }

        .talisman-button:hover {
            background: #4f46e5;
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(99, 102, 241, 0.3);
        }

        .talisman-button:active {
            transform: translateY(0);
        }

        .talisman-icon {
            width: 20px;
            height: 20px;
            background: white;
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            font-weight: bold;
            color: #6366f1;
        }

        .qr-section {
            margin: 30px 0;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 12px;
            border: 1px solid #e9ecef;
        }

        .qr-section h3 {
            color: #333;
            margin-bottom: 15px;
            font-size: 18px;
            font-weight: 600;
        }

        .qr-code {
            width: 200px;
            height: 200px;
            margin: 0 auto 15px;
            background: white;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 1px solid #e9ecef;
        }

        .qr-code svg {
            max-width: 100%;
            max-height: 100%;
        }

        .qr-instructions {
            color: #666;
            font-size: 14px;
            line-height: 1.5;
            margin-bottom: 15px;
        }

        .info-box {
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
            text-align: left;
        }

        .info-box h3 {
            color: #333;
            margin-bottom: 10px;
            font-size: 16px;
            font-weight: 600;
        }

        .info-box p {
            color: #666;
            font-size: 14px;
            line-height: 1.5;
            margin-bottom: 8px;
        }

        .info-box p:last-child {
            margin-bottom: 0;
        }

        .status {
            background: #e3f2fd;
            border: 1px solid #bbdefb;
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 20px;
        }

        .status h3 {
            color: #1976d2;
            margin-bottom: 8px;
            font-size: 16px;
            font-weight: 600;
        }

        .status p {
            color: #1565c0;
            font-size: 14px;
            margin: 0;
        }

        .status.success {
            background: #e8f5e8;
            border-color: #c8e6c9;
        }

        .status.success h3 {
            color: #2e7d32;
        }

        .status.success p {
            color: #388e3c;
        }

        .status.error {
            background: #ffebee;
            border-color: #ffcdd2;
        }

        .status.error h3 {
            color: #c62828;
        }

        .status.error p {
            color: #d32f2f;
        }

        .footer {
            color: #999;
            font-size: 12px;
            margin-top: 20px;
        }

        .footer a {
            color: #6366f1;
            text-decoration: none;
        }

        .footer a:hover {
            text-decoration: underline;
        }

        .loading {
            display: none;
            margin-top: 20px;
        }

        .loading.show {
            display: block;
        }

        .spinner {
            border: 3px solid #f3f3f3;
            border-top: 3px solid #6366f1;
            border-radius: 50%;
            width: 30px;
            height: 30px;
            animation: spin 1s linear infinite;
            margin: 0 auto 10px;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        .error {
            background: #ffebee;
            border: 1px solid #ffcdd2;
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 20px;
            display: none;
        }

        .error.show {
            display: block;
        }

        .error h3 {
            color: #c62828;
            margin-bottom: 8px;
            font-size: 16px;
            font-weight: 600;
        }

        .error p {
            color: #d32f2f;
            font-size: 14px;
            margin: 0;
        }

        .polling-status {
            margin-top: 20px;
            padding: 15px;
            background: #f0f9ff;
            border: 1px solid #bae6fd;
            border-radius: 8px;
            display: none;
        }

        .polling-status.show {
            display: block;
        }

        .polling-status h4 {
            color: #0369a1;
            margin-bottom: 8px;
            font-size: 14px;
            font-weight: 600;
        }

        .polling-status p {
            color: #0284c7;
            font-size: 13px;
            margin: 0;
        }

        @media (max-width: 600px) {
            .container {
                padding: 30px 20px;
            }
            
            h1 {
                font-size: 24px;
            }
            
            .talisman-button {
                padding: 14px 24px;
                font-size: 15px;
            }

            .qr-code {
                width: 150px;
                height: 150px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">T</div>
        
        <h1>Sign in with Talisman Mobile</h1>
        <p class="subtitle">
            Authenticate using your Talisman Mobile wallet to access Polkadot SSO services
        </p>

        <div class="status">
            <h3>📱 Mobile Wallet Authentication</h3>
            <p>Use your Talisman Mobile app to sign the authentication challenge.</p>
        </div>

        <div class="info-box">
            <h3>📋 Challenge Details</h3>
            <p><strong>Challenge ID:</strong> ${data.challengeId}</p>
            <p><strong>Address:</strong> ${data.address}</p>
            <p><strong>Client:</strong> ${data.clientId}</p>
            <p><strong>Expires:</strong> <span id="expires">${new Date(data.expiresAt).toLocaleString()}</span></p>
        </div>

        <a href="${data.deepLinkUrl}" class="talisman-button" id="talismanSignIn">
            <div class="talisman-icon">T</div>
            Open in Talisman Mobile
        </a>

        <div class="qr-section">
            <h3>📱 Scan QR Code</h3>
            <div class="qr-code" id="qrCode">
                <div class="spinner"></div>
            </div>
            <p class="qr-instructions">
                Scan this QR code with your Talisman Mobile app to authenticate
            </p>
        </div>

        <div class="loading" id="loading">
            <div class="spinner"></div>
            <p>Waiting for authentication...</p>
        </div>

        <div class="polling-status" id="pollingStatus">
            <h4>🔄 Checking authentication status...</h4>
            <p>Please complete the authentication in your Talisman Mobile app.</p>
        </div>

        <div class="error" id="error">
            <h3>❌ Authentication Error</h3>
            <p id="errorMessage">An error occurred during authentication.</p>
        </div>

        <div class="footer">
            <p>
                By signing in, you agree to our 
                <a href="#" onclick="alert('Terms of Service would be linked here')">Terms of Service</a> 
                and 
                <a href="#" onclick="alert('Privacy Policy would be linked here')">Privacy Policy</a>
            </p>
            <p>
                <a href="/api-docs">API Documentation</a> | 
                <a href="/health">Health Check</a>
            </p>
        </div>
    </div>

    <script nonce="${data.nonce}">
        (function() {
            const talismanButton = document.getElementById('talismanSignIn');
            const loading = document.getElementById('loading');
            const error = document.getElementById('error');
            const errorMessage = document.getElementById('errorMessage');
            const expires = document.getElementById('expires');
            const qrCode = document.getElementById('qrCode');
            const pollingStatus = document.getElementById('pollingStatus');

            // Check if challenge has expired
            const expiresAt = ${data.expiresAt};
            const now = Date.now();
            
            if (now > expiresAt) {
                showError('Challenge has expired. Please refresh the page to generate a new one.');
                talismanButton.style.display = 'none';
                return;
            }

            // Update countdown
            function updateCountdown() {
                const remaining = expiresAt - Date.now();
                if (remaining <= 0) {
                    showError('Challenge has expired. Please refresh the page to generate a new one.');
                    talismanButton.style.display = 'none';
                    return;
                }
                
                const minutes = Math.floor(remaining / 60000);
                const seconds = Math.floor((remaining % 60000) / 1000);
                expires.textContent = \`\${minutes}:\${seconds.toString().padStart(2, '0')} remaining\`;
            }

            // Update countdown every second
            setInterval(updateCountdown, 1000);
            updateCountdown();

            // Load QR code
            async function loadQRCode() {
                try {
                    const response = await fetch(\`/api/auth/mobile/qr/${data.challengeId}\`);
                    if (response.ok) {
                        const svg = await response.text();
                        qrCode.innerHTML = svg;
                    } else {
                        qrCode.innerHTML = '<p style="color: #999;">QR code unavailable</p>';
                    }
                } catch (err) {
                    qrCode.innerHTML = '<p style="color: #999;">QR code unavailable</p>';
                }
            }

            // Start polling for authentication completion
            let pollingInterval;
            let isPolling = false;

            function startPolling() {
                if (isPolling) return;
                isPolling = true;
                
                pollingStatus.classList.add('show');
                loading.classList.add('show');
                talismanButton.style.display = 'none';

                pollingInterval = setInterval(async () => {
                    try {
                        const response = await fetch(\`/api/auth/mobile/poll/${data.pollingToken}?challenge_id=${data.challengeId}\`);
                        const result = await response.json();

                        if (result.status === 'completed') {
                            clearInterval(pollingInterval);
                            showSuccess('Authentication successful!');
                            // Redirect or handle success
                            setTimeout(() => {
                                window.location.href = '/auth/success?token=' + result.access_token;
                            }, 2000);
                        } else if (result.status === 'expired') {
                            clearInterval(pollingInterval);
                            showError('Challenge has expired. Please refresh the page to generate a new one.');
                        } else if (result.status === 'not_found') {
                            clearInterval(pollingInterval);
                            showError('Challenge not found. Please refresh the page to generate a new one.');
                        }
                    } catch (err) {
                        console.error('Polling error:', err);
                    }
                }, 2000); // Poll every 2 seconds
            }

            // Handle Talisman Mobile button click
            talismanButton.addEventListener('click', function(e) {
                e.preventDefault();
                startPolling();
                
                // Try to open the deep link
                setTimeout(() => {
                    window.location.href = '${data.deepLinkUrl}';
                }, 500);
            });

            // Auto-start polling after a short delay
            setTimeout(() => {
                if (!isPolling) {
                    startPolling();
                }
            }, 3000);

            function showLoading() {
                loading.classList.add('show');
                talismanButton.style.display = 'none';
            }

            function showSuccess(message) {
                const status = document.querySelector('.status');
                status.className = 'status success';
                status.innerHTML = \`
                    <h3>✅ Authentication Successful</h3>
                    <p>\${message}</p>
                \`;
                loading.classList.remove('show');
                pollingStatus.classList.remove('show');
            }

            function showError(message) {
                errorMessage.textContent = message;
                error.classList.add('show');
                loading.classList.remove('show');
                pollingStatus.classList.remove('show');
            }

            // Load QR code on page load
            loadQRCode();

            // Add keyboard support
            document.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' && !loading.classList.contains('show')) {
                    talismanButton.click();
                }
            });

            // Clean up polling on page unload
            window.addEventListener('beforeunload', function() {
                if (pollingInterval) {
                    clearInterval(pollingInterval);
                }
            });
        })();
    </script>
</body>
</html>`;
}
