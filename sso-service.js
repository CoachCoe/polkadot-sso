import express from 'express';
import cors from 'cors';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import jwt from 'jsonwebtoken';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const app = express();
app.use(cors());
app.use(express.json());

// Simple in-memory storage for demo clients
const clients = new Map([
  ['demo-app', { name: 'Demo App', redirect_url: 'http://localhost:3001/callback' }]
]);

// Initialize SQLite
const dbPromise = open({
  filename: './sso.db',
  driver: sqlite3.Database
});

// Initialize database
async function initDB() {
  const db = await dbPromise;
  await db.exec(`
    CREATE TABLE IF NOT EXISTS challenges (
      id TEXT PRIMARY KEY,
      message TEXT,
      client_id TEXT,
      created_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS sessions (
      address TEXT PRIMARY KEY,
      token TEXT,
      created_at INTEGER
    );
  `);
}

initDB();

// Step 1: Client redirects user to SSO
app.get('/login', async (req, res) => {
    const { client_id } = req.query;
    const client = clients.get(client_id);
    
    if (!client) {
      return res.status(400).send('Invalid client');
    }
    
    res.send(`
      <html>
        <head>
          <title>Login with Polkadot</title>
          <style>
            .status { margin: 20px 0; padding: 10px; }
            .error { color: red; }
            .success { color: green; }
            .guide { background: #f0f0f0; padding: 20px; margin: 20px 0; border-radius: 5px; }
          </style>
        </head>
        <body>
          <h1>Login with Polkadot Wallet</h1>
          <div id="status" class="status">Ready to connect...</div>
          
          <div class="guide">
            <h3>Manual Permission Steps:</h3>
            <ol>
              <li>Click the Polkadot.js extension icon in your browser toolbar</li>
              <li>Click the gear/settings icon in the extension</li>
              <li>Find "Manage Website Access"</li>
              <li>Check if "localhost" is listed and remove it if it is</li>
              <li>Then click "Connect Wallet" below</li>
            </ol>
          </div>
  
          <button id="connectButton">Connect Wallet</button>
  
          <script type="module">
            // Using a specific version to avoid conflicts
            import { web3Enable, web3Accounts } from 'https://cdn.jsdelivr.net/npm/@polkadot/extension-dapp@0.46.5/+esm';
            
            const statusDiv = document.getElementById('status');
            const connectButton = document.getElementById('connectButton');
  
            async function checkExtensionAndAccounts() {
              try {
                statusDiv.textContent = 'Requesting extension access...';
                
                // Force a new authorization by adding a timestamp
                const appName = 'Polkadot SSO Demo ' + Date.now();
                const extensions = await web3Enable(appName);
                console.log('Extension status:', extensions.length ? 'found' : 'not found');
  
                if (extensions.length === 0) {
                  throw new Error('Polkadot extension not found. Please install the extension.');
                }
  
                statusDiv.textContent = 'Requesting account access...';
                const accounts = await web3Accounts();
                console.log('Number of accounts:', accounts.length);
  
                if (accounts.length === 0) {
                  statusDiv.textContent = 'No accounts accessible. Please check extension permissions.';
                  return;
                }
  
                statusDiv.innerHTML = '<span class="success">Found ' + accounts.length + ' account(s)</span>';
                
                // Show account selection or proceed with single account
                if (accounts.length === 1) {
                  proceedToChallenge(accounts[0].address);
                } else {
                  statusDiv.innerHTML += \`
                    <div style="margin-top: 10px;">
                      <select id="accountSelect">
                        \${accounts.map(acc => 
                          '<option value="' + acc.address + '">' + 
                          (acc.meta.name || 'Account') + ' (' + acc.address.slice(0,8) + '...)</option>'
                        ).join('')}
                      </select>
                      <button id="continueButton">Continue</button>
                    </div>
                  \`;
                  
                  document.getElementById('continueButton')?.addEventListener('click', () => {
                    const select = document.getElementById('accountSelect');
                    if (select) {
                      proceedToChallenge(select.value);
                    }
                  });
                }
              } catch (error) {
                console.error('Connection error:', error);
                statusDiv.innerHTML = '<span class="error">Error: ' + error.message + '</span>';
              }
            }
  
            function proceedToChallenge(address) {
              window.location.href = '/challenge?address=' + 
                encodeURIComponent(address) + 
                '&client_id=${client_id}';
            }
  
            connectButton.addEventListener('click', checkExtensionAndAccounts);
          </script>
        </body>
      </html>
    `);
  });

// Step 2: Generate challenge
app.get('/challenge', async (req, res) => {
    const { address, client_id } = req.query;
    const db = await dbPromise;
    
    const challenge = {
      id: Math.random().toString(36).substr(2, 9),
      message: `Login to SSO Demo at ${new Date().toISOString()}. Challenge ID: ${Math.random().toString(36).substr(2, 9)}`,
      client_id,
      created_at: Date.now()
    };
    
    await db.run(
      'INSERT INTO challenges (id, message, client_id, created_at) VALUES (?, ?, ?, ?)',
      [challenge.id, challenge.message, client_id, challenge.created_at]
    );
    
    res.send(`
      <html>
        <head>
          <title>Sign Message</title>
          <style>
            .status { margin: 20px 0; padding: 10px; }
            .error { color: red; }
            .success { color: green; }
          </style>
        </head>
        <body>
          <h2>Challenge Message</h2>
          <p>Message: ${challenge.message}</p>
          <p>Address: ${address}</p>
          <div id="status" class="status"></div>
          <button id="signButton">Sign with Wallet</button>
  
          <script type="module">
            import { web3Enable, web3FromAddress } from 'https://cdn.jsdelivr.net/npm/@polkadot/extension-dapp@0.46.5/+esm';
            
            const statusDiv = document.getElementById('status');
            const signButton = document.getElementById('signButton');
  
            async function signMessage() {
              try {
                statusDiv.textContent = 'Connecting to wallet...';
                
                // Enable extension
                const extensions = await web3Enable('Polkadot SSO Demo');
                if (extensions.length === 0) {
                  throw new Error('No extension found');
                }
  
                statusDiv.textContent = 'Getting signer...';
                const injector = await web3FromAddress('${address}');
                const signRaw = injector?.signer?.signRaw;
                
                if (!signRaw) {
                  throw new Error('Wallet does not support message signing');
                }
  
                statusDiv.textContent = 'Please sign the message in your wallet...';
                const { signature } = await signRaw({
                  address: '${address}',
                  data: '${challenge.message}',
                  type: 'bytes'
                });
  
                statusDiv.textContent = 'Message signed! Verifying...';
                
                window.location.href = '/verify?signature=' + 
                  encodeURIComponent(signature) +
                  '&challenge_id=${challenge.id}&address=' + 
                  encodeURIComponent('${address}');
              } catch (error) {
                console.error('Signing error:', error);
                statusDiv.innerHTML = '<span class="error">Error: ' + error.message + '</span>';
              }
            }
  
            signButton.addEventListener('click', signMessage);
          </script>
        </body>
      </html>
    `);
  });

// Step 3: Verify signature and issue token
app.get('/verify', async (req, res) => {
  const { signature, challenge_id, address } = req.query;
  const db = await dbPromise;
  
  const challenge = await db.get(
    'SELECT * FROM challenges WHERE id = ?', 
    challenge_id
  );
  
  if (!challenge) {
    return res.status(400).send('Invalid challenge');
  }
  
  // For testing, we'll accept any signature
  const token = jwt.sign({ address }, 'secret-key');
  
  // Store session
  await db.run(
    'INSERT OR REPLACE INTO sessions (address, token, created_at) VALUES (?, ?, ?)',
    [address, token, Date.now()]
  );
  
  // Get client redirect URL
  const client = clients.get(challenge.client_id);
  
  // Redirect back to client with token
  res.redirect(`${client.redirect_url}?token=${token}`);
});

app.listen(3000, () => {
  console.log('SSO Service running on port 3000');
});
