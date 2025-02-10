import express from 'express';
import cors from 'cors';
import { cryptoWaitReady, signatureVerify } from '@polkadot/util-crypto';
import jwt from 'jsonwebtoken';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from 'dotenv';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
config();

// Set up directory paths
const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();

// Basic security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://cdn.jsdelivr.net", "'unsafe-eval'", "'unsafe-inline'"],
      connectSrc: ["'self'", "*"],
      imgSrc: ["'self'", "data:", "https:"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      workerSrc: ["'self'", "blob:"],
      childSrc: ["'self'", "blob:"],
    },
  }
}));

// Serve static files from 'public' directory
app.use(express.static(join(__dirname, 'public')));

// Configure CORS
app.use(cors({
  origin: process.env.CLIENT_WHITELIST?.split(',') || ['http://localhost:3001'],
  methods: ['GET', 'POST'],
  credentials: true
}));

app.use(express.json());

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: 'Too many authentication attempts, please try again later'
});

// Apply rate limiting to auth endpoints
app.use('/login', authLimiter);
app.use('/challenge', authLimiter);
app.use('/verify', authLimiter);

// Simple in-memory storage for demo clients
const clients = new Map([
  ['demo-app', { 
    name: 'Demo App', 
    redirect_url: 'http://localhost:3001/callback',
    allowed_origins: ['http://localhost:3001']
  }]
]);

// Initialize SQLite
const dbPromise = open({
  filename: process.env.DATABASE_PATH || './sso.db',
  driver: sqlite3.Database
});

// Initialize database with enhanced schema
async function initDB() {
  const db = await dbPromise;
  await db.exec(`
    CREATE TABLE IF NOT EXISTS clients (
      client_id TEXT PRIMARY KEY,
      client_secret TEXT NOT NULL,
      name TEXT NOT NULL,
      redirect_urls TEXT NOT NULL,
      allowed_origins TEXT NOT NULL,
      created_at INTEGER,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS challenges (
      id TEXT PRIMARY KEY,
      message TEXT,
      client_id TEXT,
      created_at INTEGER,
      expires_at INTEGER,
      nonce TEXT,
      used BOOLEAN DEFAULT 0,
      FOREIGN KEY(client_id) REFERENCES clients(client_id)
    );

    CREATE TABLE IF NOT EXISTS sessions (
      address TEXT PRIMARY KEY,
      access_token TEXT,
      refresh_token TEXT,
      access_token_expires_at INTEGER,
      refresh_token_expires_at INTEGER,
      created_at INTEGER,
      client_id TEXT,
      FOREIGN KEY(client_id) REFERENCES clients(client_id)
    );

    CREATE INDEX IF NOT EXISTS idx_challenges_id ON challenges(id);
    CREATE INDEX IF NOT EXISTS idx_sessions_address ON sessions(address);
    CREATE INDEX IF NOT EXISTS idx_sessions_refresh_token ON sessions(refresh_token);
  `);
}

initDB();

// Utility functions
function generateChallenge(client_id) {
  return {
    id: crypto.randomUUID(),
    message: `Login to SSO Demo at ${new Date().toISOString()}`,
    nonce: crypto.randomBytes(32).toString('hex'),
    client_id,
    created_at: Date.now(),
    expires_at: Date.now() + (5 * 60 * 1000) // 5 minutes
  };
}

async function storeChallenge(challenge) {
  const db = await dbPromise;
  return db.run(
    'INSERT INTO challenges (id, message, client_id, created_at, expires_at, nonce) VALUES (?, ?, ?, ?, ?, ?)',
    [challenge.id, challenge.message, challenge.client_id, challenge.created_at, challenge.expires_at, challenge.nonce]
  );
}

function generateTokens(address, client_id) {
  const accessToken = jwt.sign(
    {
      address,
      client_id,
      type: 'access',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (15 * 60), // 15 minutes
      jti: crypto.randomUUID()
    },
    process.env.JWT_SECRET,
    {
      algorithm: 'HS256',
      audience: client_id,
      issuer: 'polkadot-sso'
    }
  );

  const refreshToken = jwt.sign(
    {
      address,
      client_id,
      type: 'refresh',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7 days
      jti: crypto.randomUUID()
    },
    process.env.JWT_SECRET,
    {
      algorithm: 'HS256',
      audience: client_id,
      issuer: 'polkadot-sso'
    }
  );

  return { accessToken, refreshToken };
}

// Login endpoint
app.get('/login', async (req, res) => {
  try {
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
          <link rel="stylesheet" href="/styles.css">
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
          <script type="module" src="/login.js"></script>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).send('Authentication failed');
  }
});

// Challenge endpoint
app.get('/challenge', async (req, res) => {
  try {
    const { address, client_id } = req.query;
    const client = clients.get(client_id);
    
    if (!client) {
      return res.status(400).send('Invalid client');
    }

    if (!address) {
      return res.status(400).send('Address is required');
    }

    const challenge = generateChallenge(client_id);
    await storeChallenge(challenge);
    
    res.send(`
      <html>
        <head>
          <title>Sign Message</title>
          <link rel="stylesheet" href="/styles.css">
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
          <script type="module" src="/challenge.js"></script>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Challenge error:', error);
    res.status(500).send('Challenge generation failed');
  }
});

// Verify endpoint
app.get('/verify', async (req, res) => {
  try {
    const { signature, challenge_id, address } = req.query;
    const db = await dbPromise;
    
    if (!signature || !challenge_id || !address) {
      return res.status(400).send('Missing required parameters');
    }

    if (!signature.startsWith('0x')) {
      return res.status(400).send('Invalid signature format');
    }

    const challenge = await db.get(
      'SELECT * FROM challenges WHERE id = ? AND used = 0', 
      challenge_id
    );
    
    if (!challenge) {
      return res.status(400).send('Invalid or used challenge');
    }

    if (Date.now() > challenge.expires_at) {
      return res.status(401).send('Challenge expired');
    }

    await cryptoWaitReady();
    const { isValid } = signatureVerify(challenge.message, signature, address);
    
    if (!isValid) {
      return res.status(401).send('Invalid signature');
    }

    // Mark challenge as used
    await db.run(
      'UPDATE challenges SET used = 1 WHERE id = ?',
      challenge_id
    );

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(address, challenge.client_id);
    
    // Store session with both tokens
    await db.run(
      `INSERT OR REPLACE INTO sessions (
        address, 
        access_token,
        refresh_token, 
        access_token_expires_at,
        refresh_token_expires_at,
        created_at,
        client_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        address,
        accessToken,
        refreshToken,
        Date.now() + (15 * 60 * 1000), // 15 minutes
        Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days
        Date.now(),
        challenge.client_id
      ]
    );
    
    const client = clients.get(challenge.client_id);
    
    res.redirect(`${client.redirect_url}?access_token=${accessToken}&refresh_token=${refreshToken}`);
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).send('Verification failed');
  }
});

// Refresh token endpoint
app.post('/refresh', async (req, res) => {
  try {
    const { refresh_token } = req.body;
    
    if (!refresh_token) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    let decoded;
    try {
      decoded = jwt.verify(refresh_token, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    if (decoded.type !== 'refresh') {
      return res.status(401).json({ error: 'Invalid token type' });
    }

    const db = await dbPromise;
    
    const session = await db.get(
      'SELECT * FROM sessions WHERE refresh_token = ? AND refresh_token_expires_at > ?',
      [refresh_token, Date.now()]
    );

    if (!session) {
      return res.status(401).json({ error: 'Refresh token expired or invalid' });
    }

    const { accessToken, refreshToken } = generateTokens(decoded.address, decoded.client_id);
    
    await db.run(
      `UPDATE sessions SET 
        access_token = ?,
        refresh_token = ?,
        access_token_expires_at = ?,
        refresh_token_expires_at = ?
      WHERE address = ? AND client_id = ?`,
      [
        accessToken,
        refreshToken,
        Date.now() + (15 * 60 * 1000), // 15 minutes
        Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days
        decoded.address,
        decoded.client_id
      ]
    );

    res.json({
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: 900 // 15 minutes in seconds
    });

  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ error: 'Token refresh failed' });
  }
});

// Client registration endpoint
app.post('/api/clients/register', async (req, res) => {
  try {
    const { name, redirect_urls, allowed_origins } = req.body;

    // Validate required fields
    if (!name || !redirect_urls || !allowed_origins) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Generate client credentials
    const clientId = crypto.randomUUID();
    const clientSecret = crypto.randomBytes(32).toString('hex');

    const db = await dbPromise;
    await db.run(
      `INSERT INTO clients (
        client_id, 
        client_secret, 
        name, 
        redirect_urls, 
        allowed_origins, 
        created_at, 
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        clientId,
        clientSecret,
        name,
        JSON.stringify(redirect_urls),
        JSON.stringify(allowed_origins),
        Date.now(),
        Date.now()
      ]
    );

    res.json({
      client_id: clientId,
      client_secret: clientSecret,
      name,
      redirect_urls,
      allowed_origins
    });
  } catch (error) {
    console.error('Client registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// List clients endpoint
app.get('/api/clients', async (req, res) => {
  try {
    const db = await dbPromise;
    const clients = await db.all('SELECT client_id, name, redirect_urls, allowed_origins, created_at FROM clients');
    
    // Parse JSON strings back to arrays
    const formattedClients = clients.map(client => ({
      ...client,
      redirect_urls: JSON.parse(client.redirect_urls),
      allowed_origins: JSON.parse(client.allowed_origins)
    }));

    res.json(formattedClients);
  } catch (error) {
    console.error('Client list error:', error);
    res.status(500).json({ error: 'Failed to retrieve clients' });
  }
});

// Update client endpoint
app.put('/api/clients/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;
    const { name, redirect_urls, allowed_origins } = req.body;

    const db = await dbPromise;
    await db.run(
      `UPDATE clients 
       SET name = ?, redirect_urls = ?, allowed_origins = ?, updated_at = ?
       WHERE client_id = ?`,
      [
        name,
        JSON.stringify(redirect_urls),
        JSON.stringify(allowed_origins),
        Date.now(),
        clientId
      ]
    );

    res.json({ message: 'Client updated successfully' });
  } catch (error) {
    console.error('Client update error:', error);
    res.status(500).json({ error: 'Update failed' });
  }
});

// Delete client endpoint
app.delete('/api/clients/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;
    const db = await dbPromise;
    
    await db.run('DELETE FROM clients WHERE client_id = ?', clientId);
    res.json({ message: 'Client deleted successfully' });
  } catch (error) {
    console.error('Client deletion error:', error);
    res.status(500).json({ error: 'Deletion failed' });
  }
});
// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error:', err);
  res.status(500).json({
    error: 'Authentication failed',
    requestId: crypto.randomUUID()
  });
});

app.listen(3000, () => {
  console.log('SSO Service running on port 3000');
});
