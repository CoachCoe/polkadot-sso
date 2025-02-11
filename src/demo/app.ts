// src/demo/app.ts
import express, { Request, Response } from 'express';
import path from 'path';
import { config } from 'dotenv';

// Load environment variables
config();

const app = express();

app.get('/', (_req: Request, res: Response) => {
  res.send(`
    <html>
      <head>
        <title>Demo App</title>
        <link rel="icon" type="image/x-icon" href="/favicon.ico">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            padding: 20px;
            max-width: 800px;
            margin: 0 auto;
          }
          .login-button {
            background: #E6007A;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 16px;
            text-decoration: none;
            display: inline-block;
          }
          .login-button:hover {
            opacity: 0.9;
          }
        </style>
      </head>
      <body>
        <h1>Demo App</h1>
        <p>This is a demo application showing Polkadot SSO integration.</p>
        <a href="http://localhost:3000/login?client_id=demo-app" class="login-button">
          Login with Polkadot
        </a>
      </body>
    </html>
  `);
});

app.get('/callback', (req: Request, res: Response) => {
  const { access_token, refresh_token } = req.query;
  
  res.send(`
    <html>
      <head>
        <title>Demo App - Logged In</title>
        <link rel="icon" type="image/x-icon" href="/favicon.ico">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            padding: 20px;
            max-width: 800px;
            margin: 0 auto;
          }
          .token-box {
            background: #f5f5f5;
            padding: 15px;
            border-radius: 6px;
            margin: 10px 0;
            word-break: break-all;
          }
          .status {
            margin-top: 20px;
            padding: 10px;
            border-radius: 4px;
          }
          .success { background: #e8f5e9; color: #2e7d32; }
          .error { background: #ffebee; color: #c62828; }
        </style>
      </head>
      <body>
        <h1>Successfully Logged In!</h1>
        
        <h3>Access Token:</h3>
        <div class="token-box">${access_token}</div>
        
        <h3>Refresh Token:</h3>
        <div class="token-box">${refresh_token}</div>

        <div id="tokenStatus" class="status"></div>

        <script>
          // Store tokens in localStorage
          localStorage.setItem('access_token', '${access_token}');
          localStorage.setItem('refresh_token', '${refresh_token}');
          
          // Set up refresh timer
          async function refreshTokens() {
            try {
              const refreshToken = localStorage.getItem('refresh_token');
              const response = await fetch('http://localhost:3000/refresh', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ refresh_token: refreshToken })
              });
              
              if (response.ok) {
                const { access_token, refresh_token } = await response.json();
                localStorage.setItem('access_token', access_token);
                localStorage.setItem('refresh_token', refresh_token);
                
                const status = document.getElementById('tokenStatus');
                status.className = 'status success';
                status.textContent = 'Tokens refreshed successfully at ' + new Date().toLocaleTimeString();
              } else {
                throw new Error('Refresh failed');
              }
            } catch (error) {
              console.error('Token refresh failed:', error);
              const status = document.getElementById('tokenStatus');
              status.className = 'status error';
              status.textContent = 'Token refresh failed at ' + new Date().toLocaleTimeString();
            }
          }

          // Refresh tokens every 14 minutes
          setInterval(refreshTokens, 14 * 60 * 1000);
          
          // Initial status
          const status = document.getElementById('tokenStatus');
          status.className = 'status success';
          status.textContent = 'Initial login successful at ' + new Date().toLocaleTimeString();
        </script>
      </body>
    </html>
  `);
});

const port = process.env.DEMO_PORT || 3001;
app.listen(port, () => {
  console.log(`Demo app running on port ${port}`);
});
