import { createLogger } from '../../utils/logger.js';

const logger = createLogger('google-template');

export interface GoogleChallengeTemplateData {
  challengeId: string;
  authUrl: string;
  state: string;
  nonce: string;
  expiresAt: number;
  clientId: string;
  nonce: string;
}

export function generateGoogleChallengePage(data: GoogleChallengeTemplateData): string {
  logger.info('Generating Google OAuth2 challenge page', {
    challengeId: data.challengeId,
    clientId: data.clientId,
  });

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sign in with Google - Polkadot SSO</title>
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
            background: linear-gradient(135deg, #4285f4, #34a853);
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

        .google-button {
            background: #4285f4;
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

        .google-button:hover {
            background: #3367d6;
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(66, 133, 244, 0.3);
        }

        .google-button:active {
            transform: translateY(0);
        }

        .google-icon {
            width: 20px;
            height: 20px;
            background: white;
            border-radius: 2px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            font-weight: bold;
            color: #4285f4;
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

        .footer {
            color: #999;
            font-size: 12px;
            margin-top: 20px;
        }

        .footer a {
            color: #4285f4;
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
            border-top: 3px solid #4285f4;
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

        @media (max-width: 600px) {
            .container {
                padding: 30px 20px;
            }
            
            h1 {
                font-size: 24px;
            }
            
            .google-button {
                padding: 14px 24px;
                font-size: 15px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">G</div>
        
        <h1>Sign in with Google</h1>
        <p class="subtitle">
            Authenticate using your Google account to access Polkadot SSO services
        </p>

        <div class="status">
            <h3>🔐 Secure Authentication</h3>
            <p>Your Google account will be used to verify your identity. No passwords are stored.</p>
        </div>

        <div class="info-box">
            <h3>📋 Challenge Details</h3>
            <p><strong>Challenge ID:</strong> ${data.challengeId}</p>
            <p><strong>Client:</strong> ${data.clientId}</p>
            <p><strong>Expires:</strong> <span id="expires">${new Date(data.expiresAt).toLocaleString()}</span></p>
        </div>

        <a href="${data.authUrl}" class="google-button" id="googleSignIn">
            <div class="google-icon">G</div>
            Continue with Google
        </a>

        <div class="loading" id="loading">
            <div class="spinner"></div>
            <p>Redirecting to Google...</p>
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
            const googleButton = document.getElementById('googleSignIn');
            const loading = document.getElementById('loading');
            const error = document.getElementById('error');
            const errorMessage = document.getElementById('errorMessage');
            const expires = document.getElementById('expires');

            // Check if challenge has expired
            const expiresAt = ${data.expiresAt};
            const now = Date.now();
            
            if (now > expiresAt) {
                showError('Challenge has expired. Please refresh the page to generate a new one.');
                googleButton.style.display = 'none';
                return;
            }

            // Update countdown
            function updateCountdown() {
                const remaining = expiresAt - Date.now();
                if (remaining <= 0) {
                    showError('Challenge has expired. Please refresh the page to generate a new one.');
                    googleButton.style.display = 'none';
                    return;
                }
                
                const minutes = Math.floor(remaining / 60000);
                const seconds = Math.floor((remaining % 60000) / 1000);
                expires.textContent = \`\${minutes}:\${seconds.toString().padStart(2, '0')} remaining\`;
            }

            // Update countdown every second
            setInterval(updateCountdown, 1000);
            updateCountdown();

            // Handle Google sign-in button click
            googleButton.addEventListener('click', function(e) {
                e.preventDefault();
                showLoading();
                
                // Redirect to Google OAuth
                setTimeout(() => {
                    window.location.href = '${data.authUrl}';
                }, 500);
            });

            // Check for error parameters in URL
            const urlParams = new URLSearchParams(window.location.search);
            const errorParam = urlParams.get('error');
            const errorDescription = urlParams.get('error_description');
            
            if (errorParam) {
                showError(errorDescription || 'Authentication failed. Please try again.');
            }

            function showLoading() {
                loading.classList.add('show');
                googleButton.style.display = 'none';
            }

            function showError(message) {
                errorMessage.textContent = message;
                error.classList.add('show');
                loading.classList.remove('show');
            }

            // Handle popup authentication (if needed)
            function openGooglePopup() {
                const popup = window.open(
                    '${data.authUrl}',
                    'google-auth',
                    'width=500,height=600,scrollbars=yes,resizable=yes'
                );

                const checkClosed = setInterval(() => {
                    if (popup.closed) {
                        clearInterval(checkClosed);
                        // Check if authentication was successful
                        // This would typically involve checking for a success parameter
                        // or making an API call to verify the authentication
                    }
                }, 1000);
            }

            // Add keyboard support
            document.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' && !loading.classList.contains('show')) {
                    googleButton.click();
                }
            });
        })();
    </script>
</body>
</html>`;
}
