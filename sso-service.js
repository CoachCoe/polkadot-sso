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
      scriptSrc: [
        "'self'", 
        "https://cdn.jsdelivr.net", 
        "'unsafe-eval'", 
        "'unsafe-inline'" // Added this
      ],
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

// Simple in-memory storage for demo clients (should be moved to database in production)
const clients = new Map([
  ['demo-app', { 
    name: 'Demo App', 
    redirect_url: 'http://localhost:3001/callback',
    allowed_origins: ['http://localhost:3001']
  }]
]);

// Initialize SQLite with security improvements
const dbPromise = open({
  filename: process.env.DATABASE_PATH || './sso.db',
  driver: sqlite3.Database
});

// Initialize database with enhanced schema
// Initialize database with enhanced schema
async function initDB() {
  const db = await dbPromise;
  await db.exec(`
    CREATE TABLE IF NOT EXISTS challenges (
      id TEXT PRIMARY KEY,
      message TEXT,
      client_id TEXT,
      created_at INTEGER,
      expires_at INTEGER,
      nonce TEXT,
      used BOOLEAN DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS sessions (
      address TEXT PRIMARY KEY,
      token TEXT,
      created_at INTEGER,
      expires_at INTEGER
    );

    CREATE INDEX IF NOT EXISTS idx_challenges_id ON challenges(id);
    CREATE INDEX IF NOT EXISTS idx_sessions_address ON sessions(address);
  `);

  // Log successful initialization
  console.log('Database initialized successfully');
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

function generateToken(address, client_id) {
  return jwt.sign(
    {
      address,
      client_id,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (60 * 60), // 1 hour
      jti: crypto.randomUUID()
    },
    process.env.JWT_SECRET || 'your-secret-key', // Use environment variable in production
    {
      algorithm: 'HS256',
      audience: client_id,
      issuer: 'polkadot-sso'
    }
  );
}

// Login endpoint
app.get('/login', async (req, res) => {
  try {
    const { client_id } = req.query;
    const client = clients.get(client_id);
    
    if (!client) {
      return res.status(400).send('Invalid client');
    }
    
    // Generate a nonce for our scripts
    const nonce = crypto.randomBytes(16).toString('base64');
    
    res.send(`
      <html>
        <head>
          <title>Login with Polkadot</title>
        </head>
        <body>
          <h1>Login with Polkadot Wallet</h1>
          <div id="status">Ready to connect...</div>
          <button id="connectButton">Connect Wallet</button>
          
          <!-- Move the initialization to the external file -->
          <script>
            // Initialize data needed by login.js
            window.SSO_CONFIG = {
              clientId: ${JSON.stringify(client_id)},
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
        </head>
        <body>
          <h2>Challenge Message</h2>
          <p>Message: ${challenge.message}</p>
          <p>Address: ${address}</p>
          <div id="status"></div>
          <button id="signButton">Sign with Wallet</button>
          <script>
            window.CHALLENGE_DATA = {
              address: "${address}",
              message: "${challenge.message}",
              challengeId: "${challenge.id}"
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

    // Verify signature format
    if (!signature.startsWith('0x')) {
      return res.status(400).send('Invalid signature format');
    }

    // Get challenge
    const challenge = await db.get(
      'SELECT * FROM challenges WHERE id = ? AND used = 0', 
      challenge_id
    );
    
    if (!challenge) {
      return res.status(400).send('Invalid or used challenge');
    }

    // Check challenge expiration
    if (Date.now() > challenge.expires_at) {
      return res.status(401).send('Challenge expired');
    }

    // Verify the signature
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

    // Generate token
    const token = generateToken(address, challenge.client_id);
    
    // Store session
    await db.run(
      'INSERT OR REPLACE INTO sessions (address, token, created_at, expires_at) VALUES (?, ?, ?, ?)',
      [address, token, Date.now(), Date.now() + (60 * 60 * 1000)]
    );
    
    // Get client redirect URL
    const client = clients.get(challenge.client_id);
    
    // Redirect back to client with token
    res.redirect(`${client.redirect_url}?token=${token}`);
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).send('Verification failed');
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
