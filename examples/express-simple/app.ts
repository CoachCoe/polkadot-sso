import { AuthenticatedRequest, polkadotAuth, requireAuth } from '@polkadot-auth/express';
import express from 'express';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const auth = polkadotAuth({
  basePath: '/auth',
  cors: {
    origin: true,
    credentials: true,
  },
});

app.use('/auth', auth);

app.get('/protected', requireAuth(), (req: AuthenticatedRequest, res) => {
  res.json({
    message: 'This is a protected route',
    user: req.user,
  });
});

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>🔐 Polkadot SSO - Connect Your Wallet</title>
        <link rel="stylesheet" href="/styles/main.css">
        <style>
            .hero {
                text-align: center;
                padding: 60px 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                margin-bottom: 40px;
            }

            .hero h1 {
                font-size: 3rem;
                margin-bottom: 20px;
                text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
            }

            .hero p {
                font-size: 1.2rem;
                opacity: 0.9;
            }

            .action-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
                gap: 30px;
                max-width: 1200px;
                margin: 0 auto;
                padding: 0 20px;
            }

            .action-card {
                background: white;
                border-radius: 12px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.1);
                overflow: hidden;
                transition: transform 0.3s ease, box-shadow 0.3s ease;
            }

            .action-card:hover {
                transform: translateY(-5px);
                box-shadow: 0 12px 40px rgba(0,0,0,0.15);
            }

            .action-card.primary {
                border-left: 6px solid #e6007a;
            }

            .action-card.secondary {
                border-left: 6px solid #667eea;
            }

            .card-header {
                padding: 25px 25px 15px;
                background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            }

            .card-header h3 {
                margin: 0 0 10px 0;
                font-size: 1.4rem;
                color: #333;
            }

            .card-header p {
                margin: 0;
                color: #666;
                line-height: 1.5;
            }

            .card-content {
                padding: 0 25px 20px;
                min-height: 300px;
                margin-bottom: 20px;
                height: auto;
                overflow: visible;
            }

            .wallet-status {
                background: #f8f9fa;
                border: 1px solid #dee2e6;
                border-radius: 8px;
                padding: 20px;
                margin-bottom: 20px;
                text-align: center;
                color: #6c757d;
            }

            .btn {
                display: inline-block;
                padding: 12px 24px;
                border: none;
                border-radius: 8px;
                font-size: 16px;
                font-weight: 600;
                text-decoration: none;
                cursor: pointer;
                transition: all 0.3s ease;
                text-align: center;
                min-width: 140px;
            }

            .btn-primary {
                background: linear-gradient(135deg, #e6007a, #ff6b9d);
                color: white;
            }

            .btn-primary:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 25px rgba(230, 0, 122, 0.3);
            }

            .btn-secondary {
                background: linear-gradient(135deg, #667eea, #764ba2);
                color: white;
            }

            .btn-secondary:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
            }

            .btn:disabled {
                opacity: 0.6;
                cursor: not-allowed;
                transform: none !important;
            }

            .connection-status {
                margin-top: 15px;
                padding: 10px;
                border-radius: 6px;
                font-weight: 500;
            }

            @media (max-width: 768px) {
                .action-grid {
                    grid-template-columns: 1fr;
                }

                .card-content {
                    padding: 0 20px 20px;
                }

                .action-card {
                    min-height: auto;
                }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <header class="hero">
                <h1>🔐 Polkadot SSO</h1>
                <p>Secure Single Sign-On using your Polkadot wallet</p>
            </header>

            <div class="action-grid">
                <div class="action-card primary">
                    <div class="card-header">
                        <h3>🔗 Connect Wallet</h3>
                        <p>Connect your Polkadot wallet to authenticate</p>
                    </div>
                    <div class="card-content">
                        <div id="wallet-status" class="wallet-status">
                            <p>No wallet connected</p>
                        </div>
                        <button id="connectBtn" class="btn btn-primary" onclick="connectWallet()">
                            Connect Wallet
                        </button>
                        <div id="connection-status"></div>
                    </div>
                </div>

                <div class="action-card secondary">
                    <div class="card-header">
                        <h3>💾 Store Credentials</h3>
                        <p>Encrypt and store your credentials on Kusama</p>
                    </div>
                    <div class="card-content">
                        <p>Store encrypted credentials using your connected wallet</p>
                        <a href="/auth/signin" class="btn btn-secondary">Store Credentials</a>
                    </div>
                </div>

                <div class="action-card secondary">
                    <div class="card-header">
                        <h3>🔍 Retrieve Credentials</h3>
                        <p>Retrieve your encrypted credentials from Kusama</p>
                    </div>
                    <div class="card-content">
                        <p>Retrieve encrypted credentials using your connected wallet</p>
                        <a href="/auth/signin" class="btn btn-secondary">Retrieve Credentials</a>
                    </div>
                </div>
            </div>
        </div>

        <script>
          let connectedWallet = null;
          let walletAddress = null;

          async function connectWallet() {
            try {
              const connectBtn = document.getElementById('connectBtn');
              const statusDiv = document.getElementById('connection-status');
              const walletStatus = document.getElementById('wallet-status');

              connectBtn.disabled = true;
              statusDiv.innerHTML = '🔗 Connecting to wallet...';

              // Check if Polkadot.js extension is available
              if (!window.injectedWeb3) {
                throw new Error('Polkadot.js extension not found. Please install it first.');
              }

              // Get available extensions
              const extensions = Object.keys(window.injectedWeb3);
              if (extensions.length === 0) {
                throw new Error('No wallet extensions found. Please install Polkadot.js extension.');
              }

              // Connect to the first available extension
              const extension = extensions[0];
              const provider = window.injectedWeb3[extension];

              try {
                const accounts = await provider.enable();
                if (accounts && accounts.length > 0) {
                  connectedWallet = extension;
                  walletAddress = accounts[0].address;

                  walletStatus.innerHTML = \`
                    <div style="margin-bottom: 8px;"><strong>✅ Wallet Connected Successfully</strong></div>
                    <div style="font-size: 0.9rem; color: #059669;">\${extension}</div>
                    <div style="font-size: 0.85rem; color: #64748b; font-family: monospace;">\${walletAddress}</div>
                  \`;
                  walletStatus.style.background = '#dcfce7';
                  walletStatus.style.color = '#16a34a';

                  statusDiv.innerHTML = '✅ Wallet connected successfully!';
                  connectBtn.textContent = 'Wallet Connected';
                  connectBtn.disabled = true;
                } else {
                  throw new Error('No accounts found in wallet');
                }
              } catch (error) {
                throw new Error(\`Failed to connect to \${extension}: \${error.message}\`);
              }
            } catch (error) {
              const statusDiv = document.getElementById('connection-status');
              statusDiv.innerHTML = \`❌ Error: \${error.message}\`;
              document.getElementById('connectBtn').disabled = false;
            }
          }
        </script>
    </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log(`🚀 Polkadot Auth Example running on http://localhost:${PORT}`);
  console.log(`📱 Sign in: http://localhost:${PORT}/auth/signin`);
  console.log(`🔒 Protected: http://localhost:${PORT}/protected`);
});
