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
      id TEXT PRIMARY KEY,
      address TEXT NOT NULL,
      client_id TEXT NOT NULL,
      access_token TEXT,
      refresh_token TEXT,
      access_token_id TEXT,
      refresh_token_id TEXT,
      fingerprint TEXT NOT NULL,
      access_token_expires_at INTEGER,
      refresh_token_expires_at INTEGER,
      created_at INTEGER,
      last_used_at INTEGER,
      is_active BOOLEAN DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS revoked_tokens (
    jti TEXT PRIMARY KEY,         -- Token's unique identifier
    token_type TEXT NOT NULL,     -- 'access' or 'refresh'
    revoked_at INTEGER NOT NULL,
    reason TEXT,
    address TEXT NOT NULL,
    client_id TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_challenges_id ON challenges(id);
    CREATE INDEX IF NOT EXISTS idx_sessions_address ON sessions(address);
    CREATE INDEX IF NOT EXISTS idx_sessions_refresh_token ON sessions(refresh_token);
    CREATE INDEX IF NOT EXISTS idx_revoked_tokens_address ON revoked_tokens(address);
    CREATE INDEX IF NOT EXISTS idx_revoked_tokens_client ON revoked_tokens(client_id);
    CREATE INDEX IF NOT EXISTS idx_revoked_tokens_type ON revoked_tokens(token_type);
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

// Enhanced token generation with security improvements
function generateTokens(address, client_id) {
  // Generate unique identifiers for tokens
  const accessJwtid = crypto.randomBytes(32).toString('hex');
  const refreshJwtid = crypto.randomBytes(32).toString('hex');
  
  // Generate a fingerprint for the session
  const fingerprint = crypto.randomBytes(16).toString('hex');

  const accessToken = jwt.sign(
    {
      address,
      client_id,
      type: 'access',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (15 * 60), // 15 minutes
      jti: accessJwtid,
      fingerprint
    },
    process.env.JWT_SECRET,
    {
      algorithm: 'HS512', // Upgraded from HS256
      audience: client_id,
      issuer: 'polkadot-sso',
      subject: address,
      notBefore: Math.floor(Date.now() / 1000)
    }
  );

  const refreshToken = jwt.sign(
    {
      address,
      client_id,
      type: 'refresh',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7 days
      jti: refreshJwtid,
      fingerprint
    },
    process.env.JWT_SECRET,
    {
      algorithm: 'HS512',
      audience: client_id,
      issuer: 'polkadot-sso',
      subject: address,
      notBefore: Math.floor(Date.now() / 1000)
    }
  );

  return { 
    accessToken, 
    refreshToken,
    fingerprint,
    accessJwtid,
    refreshJwtid
  };
}

// Token verification utility
async function verifyToken(token, type = 'access') {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS512'],
      issuer: 'polkadot-sso'
    });

    if (decoded.type !== type) {
      throw new Error('Invalid token type');
    }

    const db = await dbPromise;

    // Check if token is revoked
    const isRevoked = await db.get(
      'SELECT * FROM revoked_tokens WHERE jti = ?',
      [decoded.jti]
    );

    if (isRevoked) {
      throw new Error('Token has been revoked');
    }

    const session = await db.get(
      'SELECT * FROM sessions WHERE address = ? AND client_id = ? AND is_active = 1',
      [decoded.address, decoded.client_id]
    );

    if (!session) {
      throw new Error('Session not found or inactive');
    }

    if (session.fingerprint !== decoded.fingerprint) {
      throw new Error('Invalid token fingerprint');
    }

    return { 
      valid: true, 
      decoded,
      session
    };
  } catch (error) {
    console.error('Token verification failed:', error.message);
    return { 
      valid: false, 
      error: error.message 
    };
  }
}

// Add near other utility functions
async function cleanupRevokedTokens() {
  try {
    const db = await dbPromise;
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000); // 30 days

    // Delete old revoked tokens but keep emergency revocations
    await db.run(
      `DELETE FROM revoked_tokens 
       WHERE revoked_at < ? 
       AND reason NOT LIKE 'EMERGENCY:%'`,
      [thirtyDaysAgo]
    );

    console.log('Cleaned up old revoked tokens');
  } catch (error) {
    console.error('Token cleanup error:', error);
  }
}

// Add cleanup schedule (runs every 24 hours)
setInterval(cleanupRevokedTokens, 24 * 60 * 60 * 1000);

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
          <link rel="icon" type="image/x-icon" href="/favicon.ico">
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
          <link rel="icon" type="image/x-icon" href="/favicon.ico">
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

    await db.run(
      'UPDATE challenges SET used = 1 WHERE id = ?',
      challenge_id
    );

    // Generate tokens with enhanced security
    const { 
      accessToken, 
      refreshToken, 
      fingerprint,
      accessJwtid,
      refreshJwtid 
    } = generateTokens(address, challenge.client_id);
    
    // Store session with enhanced security information
    await db.run(
      `INSERT OR REPLACE INTO sessions (
        id,
        address, 
        client_id,
        access_token,
        refresh_token,
        access_token_id,
        refresh_token_id,
        fingerprint,
        access_token_expires_at,
        refresh_token_expires_at,
        created_at,
        last_used_at,
        is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        crypto.randomUUID(),
        address,
        challenge.client_id,
        accessToken,
        refreshToken,
        accessJwtid,
        refreshJwtid,
        fingerprint,
        Date.now() + (15 * 60 * 1000),
        Date.now() + (7 * 24 * 60 * 60 * 1000),
        Date.now(),
        Date.now(),
        1
      ]
    );
    
    const client = clients.get(challenge.client_id);
    
    res.redirect(
      `${client.redirect_url}?` +
      `access_token=${accessToken}&` +
      `refresh_token=${refreshToken}&` +
      `fingerprint=${fingerprint}`
    );
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

    const verification = await verifyToken(refresh_token, 'refresh');
    if (!verification.valid) {
      return res.status(401).json({ error: verification.error });
    }

    const { decoded, session } = verification;

    // Generate new tokens
    const { 
      accessToken, 
      refreshToken, 
      fingerprint,
      accessJwtid,
      refreshJwtid 
    } = generateTokens(decoded.address, decoded.client_id);
    
    const db = await dbPromise;
    await db.run(
      `UPDATE sessions SET 
        access_token = ?,
        refresh_token = ?,
        access_token_id = ?,
        refresh_token_id = ?,
        fingerprint = ?,
        access_token_expires_at = ?,
        refresh_token_expires_at = ?,
        last_used_at = ?
      WHERE address = ? AND client_id = ?`,
      [
        accessToken,
        refreshToken,
        accessJwtid,
        refreshJwtid,
        fingerprint,
        Date.now() + (15 * 60 * 1000),
        Date.now() + (7 * 24 * 60 * 60 * 1000),
        Date.now(),
        decoded.address,
        decoded.client_id
      ]
    );

    res.json({
      access_token: accessToken,
      refresh_token: refreshToken,
      fingerprint: fingerprint,
      expires_in: 900
    });

  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ error: 'Token refresh failed' });
  }
});

// Client management endpoints
app.post('/api/clients/register', async (req, res) => {
  try {
    const { name, redirect_urls, allowed_origins } = req.body;

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

// Revoke specific token
app.post('/api/tokens/revoke', async (req, res) => {
  try {
    const { token } = req.body;
    
    // Verify token first
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS512'],
      issuer: 'polkadot-sso'
    });

    const db = await dbPromise;
    await db.run(
      `INSERT INTO revoked_tokens (
        jti,
        token_type,
        revoked_at,
        reason,
        address,
        client_id
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        decoded.jti,
        decoded.type,
        Date.now(),
        'User requested revocation',
        decoded.address,
        decoded.client_id
      ]
    );

    res.json({ message: 'Token revoked successfully' });
  } catch (error) {
    console.error('Token revocation error:', error);
    res.status(500).json({ error: 'Failed to revoke token' });
  }
});

// Revoke all tokens for an address
app.post('/api/tokens/revoke-all', async (req, res) => {
  try {
    const { address } = req.body;
    const db = await dbPromise;

    // Get all active sessions for the address
    const sessions = await db.all(
      'SELECT * FROM sessions WHERE address = ? AND is_active = 1',
      [address]
    );

    // Revoke all tokens from these sessions
    for (const session of sessions) {
      await db.run(
        `INSERT INTO revoked_tokens (
          jti,
          token_type,
          revoked_at,
          reason,
          address,
          client_id
        ) VALUES (?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?)`,
        [
          session.access_token_id,
          'access',
          Date.now(),
          'All tokens revoked for address',
          address,
          session.client_id,
          session.refresh_token_id,
          'refresh',
          Date.now(),
          'All tokens revoked for address',
          address,
          session.client_id
        ]
      );
    }

    // Mark sessions as inactive
    await db.run(
      'UPDATE sessions SET is_active = 0 WHERE address = ?',
      [address]
    );

    res.json({ message: 'All tokens revoked successfully' });
  } catch (error) {
    console.error('Token revocation error:', error);
    res.status(500).json({ error: 'Failed to revoke tokens' });
  }
});

// Revoke all tokens for a client
app.post('/api/tokens/revoke-client', async (req, res) => {
  try {
    const { client_id } = req.body;
    const db = await dbPromise;

    // Get all active sessions for the client
    const sessions = await db.all(
      'SELECT * FROM sessions WHERE client_id = ? AND is_active = 1',
      [client_id]
    );

    // Revoke all tokens from these sessions
    for (const session of sessions) {
      await db.run(
        `INSERT INTO revoked_tokens (
          jti,
          token_type,
          revoked_at,
          reason,
          address,
          client_id
        ) VALUES (?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?)`,
        [
          session.access_token_id,
          'access',
          Date.now(),
          'All tokens revoked for client',
          session.address,
          client_id,
          session.refresh_token_id,
          'refresh',
          Date.now(),
          'All tokens revoked for client',
          session.address,
          client_id
        ]
      );
    }

    // Add emergency revocation endpoint
app.post('/api/tokens/emergency-revoke', async (req, res) => {
  try {
    const { reason, scope, value, admin_key } = req.body;

    // Verify admin key (should be in environment variables)
    if (admin_key !== process.env.ADMIN_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const db = await dbPromise;
    const emergencyReason = `EMERGENCY: ${reason}`;

    switch (scope) {
      case 'all':
        // Revoke all active tokens
        const allSessions = await db.all(
          'SELECT * FROM sessions WHERE is_active = 1'
        );

        for (const session of allSessions) {
          await db.run(
            `INSERT INTO revoked_tokens (
              jti,
              token_type,
              revoked_at,
              reason,
              address,
              client_id
            ) VALUES (?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?)`,
            [
              session.access_token_id,
              'access',
              Date.now(),
              emergencyReason,
              session.address,
              session.client_id,
              session.refresh_token_id,
              'refresh',
              Date.now(),
              emergencyReason,
              session.address,
              session.client_id
            ]
          );
        }

        // Mark all sessions as inactive
        await db.run('UPDATE sessions SET is_active = 0');
        break;

      case 'client':
        // Revoke all tokens for a specific client
        const clientSessions = await db.all(
          'SELECT * FROM sessions WHERE client_id = ? AND is_active = 1',
          [value]
        );

        for (const session of clientSessions) {
          await db.run(
            `INSERT INTO revoked_tokens (
              jti,
              token_type,
              revoked_at,
              reason,
              address,
              client_id
            ) VALUES (?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?)`,
            [
              session.access_token_id,
              'access',
              Date.now(),
              emergencyReason,
              session.address,
              value,
              session.refresh_token_id,
              'refresh',
              Date.now(),
              emergencyReason,
              session.address,
              value
            ]
          );
        }

        await db.run(
          'UPDATE sessions SET is_active = 0 WHERE client_id = ?',
          [value]
        );
        break;

      case 'address':
        // Revoke all tokens for a specific address
        const addressSessions = await db.all(
          'SELECT * FROM sessions WHERE address = ? AND is_active = 1',
          [value]
        );

        for (const session of addressSessions) {
          await db.run(
            `INSERT INTO revoked_tokens (
              jti,
              token_type,
              revoked_at,
              reason,
              address,
              client_id
            ) VALUES (?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?)`,
            [
              session.access_token_id,
              'access',
              Date.now(),
              emergencyReason,
              value,
              session.client_id,
              session.refresh_token_id,
              'refresh',
              Date.now(),
              emergencyReason,
              value,
              session.client_id
            ]
          );
        }

        await db.run(
          'UPDATE sessions SET is_active = 0 WHERE address = ?',
          [value]
        );
        break;

      default:
        return res.status(400).json({ error: 'Invalid scope' });
    }

    // Log emergency action
    console.error(`Emergency revocation: ${emergencyReason}, Scope: ${scope}, Value: ${value}`);

    res.json({ 
      message: 'Emergency revocation completed',
      scope,
      reason: emergencyReason
    });
  } catch (error) {
    console.error('Emergency revocation error:', error);
    res.status(500).json({ error: 'Emergency revocation failed' });
  }
});

    // Mark sessions as inactive
    await db.run(
      'UPDATE sessions SET is_active = 0 WHERE client_id = ?',
      [client_id]
    );

    res.json({ message: 'All client tokens revoked successfully' });
  } catch (error) {
    console.error('Token revocation error:', error);
    res.status(500).json({ error: 'Failed to revoke client tokens' });
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
    