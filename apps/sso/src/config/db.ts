import { mkdir } from 'fs/promises';
import { dirname } from 'path';
import { Database, open } from 'sqlite';
import sqlite3 from 'sqlite3';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('database-pool');

const DB_POOL_CONFIG = {
  min: parseInt(process.env.DB_POOL_MIN || '2'),
  max: parseInt(process.env.DB_POOL_MAX || '10'),
  acquireTimeout: parseInt(process.env.DB_POOL_ACQUIRE_TIMEOUT || '30000'),
  idleTimeout: parseInt(process.env.DB_POOL_IDLE_TIMEOUT || '300000'), // 5 minutes
  reapInterval: parseInt(process.env.DB_POOL_REAP_INTERVAL || '1000'), // 1 second
};

interface PooledConnection {
  db: Database;
  lastUsed: number;
  inUse: boolean;
}

class DatabasePool {
  private pool: PooledConnection[] = [];
  private waiting: Array<{ resolve: (db: Database) => void; reject: (error: Error) => void }> = [];
  private dbPath: string;
  private isShuttingDown = false;

  constructor(dbPath: string) {
    this.dbPath = dbPath;
  }

  async initialize(): Promise<void> {
    await mkdir(dirname(this.dbPath), { recursive: true });

    for (let i = 0; i < DB_POOL_CONFIG.min; i++) {
      await this.createConnection();
    }

    this.startReaper();

    logger.info('Database pool initialized', {
      minConnections: DB_POOL_CONFIG.min,
      maxConnections: DB_POOL_CONFIG.max,
      dbPath: this.dbPath,
    });
  }

  private async createConnection(): Promise<PooledConnection> {
    try {
      const db = await open({
        filename: this.dbPath,
        driver: sqlite3.Database,
        mode: sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
      });

      await db.exec('PRAGMA journal_mode = WAL');
      await db.exec('PRAGMA synchronous = NORMAL');
      await db.exec('PRAGMA cache_size = 10000');
      await db.exec('PRAGMA temp_store = MEMORY');
      await db.exec('PRAGMA mmap_size = 268435456'); // 256MB

      const connection: PooledConnection = {
        db,
        lastUsed: Date.now(),
        inUse: false,
      };

      this.pool.push(connection);
      return connection;
    } catch (error) {
      logger.error('Failed to create database connection', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async getConnection(): Promise<Database> {
    if (this.isShuttingDown) {
      throw new Error('Database pool is shutting down');
    }

    const availableConnection = this.pool.find(
      conn => !conn.inUse && this.isConnectionHealthy(conn)
    );

    if (availableConnection) {
      availableConnection.inUse = true;
      availableConnection.lastUsed = Date.now();
      return availableConnection.db;
    }

    if (this.pool.length < DB_POOL_CONFIG.max) {
      try {
        const newConnection = await this.createConnection();
        newConnection.inUse = true;
        newConnection.lastUsed = Date.now();
        return newConnection.db;
      } catch (error) {
        logger.error('Failed to create new database connection', {
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    }

    return new Promise<Database>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Database connection timeout after ${DB_POOL_CONFIG.acquireTimeout}ms`));
      }, DB_POOL_CONFIG.acquireTimeout);

      this.waiting.push({
        resolve: (db: Database) => {
          clearTimeout(timeout);
          resolve(db);
        },
        reject: (error: Error) => {
          clearTimeout(timeout);
          reject(error);
        },
      });
    });
  }

  private isConnectionHealthy(connection: PooledConnection): boolean {
    try {
      if (!connection.db) {
        return false;
      }

      const idleTime = Date.now() - connection.lastUsed;
      if (idleTime > DB_POOL_CONFIG.idleTimeout) {
        return false;
      }

      return true;
    } catch (error) {
      logger.warn('Connection health check failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  releaseConnection(db: Database): void {
    const connection = this.pool.find(conn => conn.db === db);
    if (connection) {
      connection.inUse = false;
      connection.lastUsed = Date.now();

      if (this.waiting.length > 0) {
        const waiter = this.waiting.shift();
        if (waiter) {
          connection.inUse = true;
          connection.lastUsed = Date.now();
          waiter.resolve(connection.db);
        }
      }
    }
  }

  private startReaper(): void {
    setInterval(() => {
      this.reapIdleConnections();
    }, DB_POOL_CONFIG.reapInterval);
  }

  private reapIdleConnections(): void {
    const now = Date.now();

    const connectionsToRemove = this.pool.filter(conn => {
      if (conn.inUse) return false; // Don't remove in-use connections

      if (now - conn.lastUsed > DB_POOL_CONFIG.idleTimeout) return true;

      if (!this.isConnectionHealthy(conn)) return true;

      return false;
    });

    const maxRemovable = Math.max(
      0,
      connectionsToRemove.length -
        Math.max(0, DB_POOL_CONFIG.min - (this.pool.length - connectionsToRemove.length))
    );
    const toRemove = connectionsToRemove.slice(0, maxRemovable);

    for (const connection of toRemove) {
      const index = this.pool.indexOf(connection);
      if (index > -1) {
        this.pool.splice(index, 1);
        connection.db.close().catch(error => {
          logger.error('Error closing database connection', {
            error: error instanceof Error ? error.message : String(error),
          });
        });
      }
    }

    if (toRemove.length > 0) {
      logger.debug('Reaped database connections', {
        removed: toRemove.length,
        remaining: this.pool.length,
        reason: 'idle or unhealthy',
      });
    }
  }

  async shutdown(): Promise<void> {
    this.isShuttingDown = true;

    this.waiting.forEach(waiter => {
      waiter.reject(new Error('Database pool shutting down'));
    });
    this.waiting = [];

    const closePromises = this.pool.map(async connection => {
      try {
        await connection.db.close();
      } catch (error) {
        logger.error('Error closing database connection during shutdown', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });

    await Promise.all(closePromises);
    this.pool = [];

    logger.info('Database pool shutdown complete');
  }

  getStats() {
    const inUse = this.pool.filter(conn => conn.inUse).length;
    const idle = this.pool.filter(conn => !conn.inUse).length;
    const waiting = this.waiting.length;

    return {
      total: this.pool.length,
      inUse,
      idle,
      waiting,
      max: DB_POOL_CONFIG.max,
      min: DB_POOL_CONFIG.min,
    };
  }
}

let dbPool: DatabasePool | null = null;

export async function initializeDatabasePool(): Promise<DatabasePool> {
  if (!dbPool) {
    const dbPath = process.env.DATABASE_PATH || './data/sso.db';
    dbPool = new DatabasePool(dbPath);
    await dbPool.initialize();
  }
  return dbPool;
}

export async function getDatabaseConnection(): Promise<Database> {
  if (!dbPool) {
    throw new Error('Database pool not initialized');
  }
  return dbPool.getConnection();
}

export async function releaseDatabaseConnection(db: Database): Promise<void> {
  if (dbPool) {
    dbPool.releaseConnection(db);
  }
}

export async function shutdownDatabasePool(): Promise<void> {
  if (dbPool) {
    await dbPool.shutdown();
    dbPool = null;
  }
}

export function getDatabasePoolStats() {
  return dbPool?.getStats() || null;
}

export async function initializeDatabase(): Promise<Database> {
  const pool = await initializeDatabasePool();
  const db = await pool.getConnection();

  await initializeSchema(db);

  return db;
}

async function initializeSchema(db: Database): Promise<void> {
  await db.exec(`
    -- Existing SSO tables
    CREATE TABLE IF NOT EXISTS clients (
      client_id TEXT PRIMARY KEY,
      client_secret TEXT NOT NULL,
      name TEXT NOT NULL,
      redirect_urls TEXT NOT NULL, -- JSON array of redirect URLs
      allowed_origins TEXT NOT NULL, -- JSON array of allowed origins
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      is_active BOOLEAN DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS challenges (
      id TEXT PRIMARY KEY,
      message TEXT NOT NULL,
      client_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      expires_at_timestamp INTEGER NOT NULL,
      code_verifier TEXT NOT NULL,
      code_challenge TEXT NOT NULL,
      state TEXT NOT NULL,
      nonce TEXT,
      issued_at TEXT,
      used BOOLEAN NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS auth_codes (
      code TEXT PRIMARY KEY,
      address TEXT NOT NULL,
      client_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      used BOOLEAN NOT NULL DEFAULT 0
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

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_type TEXT NOT NULL,
      user_address TEXT,
      client_id TEXT NOT NULL,
      action TEXT NOT NULL,
      status TEXT NOT NULL,
      details TEXT,
      ip_address TEXT NOT NULL,
      user_agent TEXT,
      created_at INTEGER NOT NULL
    );

    -- New Credential Management tables

    -- User profiles extending beyond just addresses
    CREATE TABLE IF NOT EXISTS user_profiles (
      id TEXT PRIMARY KEY,
      address TEXT UNIQUE NOT NULL,
      display_name TEXT,
      email TEXT,
      avatar_url TEXT,
      bio TEXT,
      website TEXT,
      location TEXT,
      timezone TEXT,
      preferences TEXT, -- JSON string for user preferences
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      last_login_at INTEGER,
      is_verified BOOLEAN DEFAULT 0,
      verification_level INTEGER DEFAULT 0 -- 0=unverified, 1=email, 2=kyc, 3=advanced
    );

    -- Credential types/schemas
    CREATE TABLE IF NOT EXISTS credential_types (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      schema_version TEXT NOT NULL,
      schema_definition TEXT NOT NULL, -- JSON schema
      issuer_pattern TEXT, -- Regex pattern for valid issuers
      required_fields TEXT, -- JSON array of required field names
      optional_fields TEXT, -- JSON array of optional field names
      validation_rules TEXT, -- JSON object with validation rules
      is_active BOOLEAN DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      created_by TEXT NOT NULL -- address of creator
    );

    -- Credential instances
    CREATE TABLE IF NOT EXISTS credentials (
      id TEXT PRIMARY KEY,
      user_address TEXT NOT NULL,
      credential_type_id TEXT NOT NULL,
      issuer_address TEXT NOT NULL,
      issuer_name TEXT,
      credential_data TEXT NOT NULL, -- Encrypted JSON data
      credential_hash TEXT NOT NULL, -- Hash of credential data for integrity
      proof_signature TEXT, -- Cryptographic proof of credential
      proof_type TEXT, -- Type of proof (e.g., 'ed25519', 'sr25519', 'ecdsa')
      status TEXT NOT NULL DEFAULT 'active', -- active, revoked, expired, pending
      issued_at INTEGER NOT NULL,
      expires_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      metadata TEXT, -- JSON string for additional metadata
      FOREIGN KEY (user_address) REFERENCES user_profiles(address),
      FOREIGN KEY (credential_type_id) REFERENCES credential_types(id)
    );

    -- Credential sharing permissions
    CREATE TABLE IF NOT EXISTS credential_shares (
      id TEXT PRIMARY KEY,
      credential_id TEXT NOT NULL,
      owner_address TEXT NOT NULL,
      shared_with_address TEXT NOT NULL,
      shared_with_client_id TEXT, -- Optional: specific client app
      permissions TEXT NOT NULL, -- JSON string of granted permissions
      access_level TEXT NOT NULL DEFAULT 'read', -- read, write, admin
      expires_at INTEGER,
      created_at INTEGER NOT NULL,
      created_by TEXT NOT NULL, -- address of person who created the share
      is_active BOOLEAN DEFAULT 1,
      FOREIGN KEY (credential_id) REFERENCES credentials(id),
      FOREIGN KEY (owner_address) REFERENCES user_profiles(address),
      FOREIGN KEY (shared_with_address) REFERENCES user_profiles(address)
    );

    -- Credential verification records
    CREATE TABLE IF NOT EXISTS credential_verifications (
      id TEXT PRIMARY KEY,
      credential_id TEXT NOT NULL,
      verifier_address TEXT NOT NULL,
      verification_type TEXT NOT NULL, -- 'proof', 'signature', 'manual', 'automated'
      verification_data TEXT, -- JSON string with verification details
      verification_signature TEXT, -- Cryptographic proof of verification
      status TEXT NOT NULL, -- 'verified', 'failed', 'pending', 'expired'
      verified_at INTEGER,
      expires_at INTEGER,
      created_at INTEGER NOT NULL,
      notes TEXT,
      FOREIGN KEY (credential_id) REFERENCES credentials(id),
      FOREIGN KEY (verifier_address) REFERENCES user_profiles(address)
    );

    -- Credential templates for easy issuance
    CREATE TABLE IF NOT EXISTS credential_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      credential_type_id TEXT NOT NULL,
      template_data TEXT NOT NULL, -- JSON template with placeholders
      issuer_address TEXT NOT NULL,
      is_public BOOLEAN DEFAULT 0,
      usage_count INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      created_by TEXT NOT NULL,
      FOREIGN KEY (credential_type_id) REFERENCES credential_types(id)
    );

    -- Credential issuance requests
    CREATE TABLE IF NOT EXISTS issuance_requests (
      id TEXT PRIMARY KEY,
      requester_address TEXT NOT NULL,
      issuer_address TEXT NOT NULL,
      credential_type_id TEXT NOT NULL,
      template_id TEXT, -- Optional: if using a template
      request_data TEXT NOT NULL, -- JSON with requested credential data
      status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected, issued
      approved_at INTEGER,
      rejected_at INTEGER,
      rejection_reason TEXT,
      issued_credential_id TEXT, -- Reference to created credential
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      expires_at INTEGER, -- Request expiration
      FOREIGN KEY (requester_address) REFERENCES user_profiles(address),
      FOREIGN KEY (issuer_address) REFERENCES user_profiles(address),
      FOREIGN KEY (credential_type_id) REFERENCES credential_types(id),
      FOREIGN KEY (template_id) REFERENCES credential_templates(id),
      FOREIGN KEY (issued_credential_id) REFERENCES credentials(id)
    );

    -- Credential revocation registry
    CREATE TABLE IF NOT EXISTS credential_revocations (
      id TEXT PRIMARY KEY,
      credential_id TEXT NOT NULL,
      revoked_by_address TEXT NOT NULL,
      revocation_reason TEXT,
      revocation_signature TEXT, -- Cryptographic proof of revocation
      revoked_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (credential_id) REFERENCES credentials(id),
      FOREIGN KEY (revoked_by_address) REFERENCES user_profiles(address)
    );

    -- Telegram Authentication tables
    CREATE TABLE IF NOT EXISTS telegram_challenges (
      challenge_id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      state TEXT NOT NULL,
      code_verifier TEXT NOT NULL,
      telegram_id INTEGER NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT,
      username TEXT,
      photo_url TEXT,
      auth_date INTEGER NOT NULL,
      hash TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      used BOOLEAN NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS telegram_sessions (
      id TEXT PRIMARY KEY,
      telegram_id INTEGER NOT NULL,
      username TEXT,
      first_name TEXT NOT NULL,
      last_name TEXT,
      photo_url TEXT,
      client_id TEXT NOT NULL,
      access_token TEXT NOT NULL,
      refresh_token TEXT NOT NULL,
      access_token_id TEXT NOT NULL,
      refresh_token_id TEXT NOT NULL,
      fingerprint TEXT NOT NULL,
      access_token_expires_at INTEGER NOT NULL,
      refresh_token_expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      last_used_at INTEGER NOT NULL,
      is_active BOOLEAN DEFAULT 1
    );

    -- Google OAuth tables
    CREATE TABLE IF NOT EXISTS google_challenges (
      challenge_id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      state TEXT NOT NULL,
      code_verifier TEXT NOT NULL,
      code_challenge TEXT NOT NULL,
      nonce TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      used BOOLEAN NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS google_sessions (
      id TEXT PRIMARY KEY,
      google_id TEXT NOT NULL,
      email TEXT NOT NULL,
      name TEXT NOT NULL,
      picture TEXT,
      client_id TEXT NOT NULL,
      access_token TEXT NOT NULL,
      refresh_token TEXT,
      access_token_id TEXT NOT NULL,
      refresh_token_id TEXT,
      fingerprint TEXT NOT NULL,
      access_token_expires_at INTEGER NOT NULL,
      refresh_token_expires_at INTEGER,
      created_at INTEGER NOT NULL,
      last_used_at INTEGER NOT NULL,
      is_active BOOLEAN DEFAULT 1
    );

    -- Create indexes for performance
    CREATE INDEX IF NOT EXISTS idx_challenges_id ON challenges(id);
    CREATE INDEX IF NOT EXISTS idx_sessions_address ON sessions(address);
    CREATE INDEX IF NOT EXISTS idx_sessions_refresh_token ON sessions(refresh_token);
    CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_address);
    CREATE INDEX IF NOT EXISTS idx_audit_client ON audit_logs(client_id);
    CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);

    -- New indexes for credential management
    CREATE INDEX IF NOT EXISTS idx_user_profiles_address ON user_profiles(address);
    CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
    CREATE INDEX IF NOT EXISTS idx_credentials_user ON credentials(user_address);
    CREATE INDEX IF NOT EXISTS idx_credentials_type ON credentials(credential_type_id);
    CREATE INDEX IF NOT EXISTS idx_credentials_issuer ON credentials(issuer_address);
    CREATE INDEX IF NOT EXISTS idx_credentials_status ON credentials(status);
    CREATE INDEX IF NOT EXISTS idx_credentials_expires ON credentials(expires_at);
    CREATE INDEX IF NOT EXISTS idx_credential_shares_credential ON credential_shares(credential_id);
    CREATE INDEX IF NOT EXISTS idx_credential_shares_owner ON credential_shares(owner_address);
    CREATE INDEX IF NOT EXISTS idx_credential_shares_shared_with ON credential_shares(shared_with_address);
    CREATE INDEX IF NOT EXISTS idx_credential_verifications_credential ON credential_verifications(credential_id);
    CREATE INDEX IF NOT EXISTS idx_credential_verifications_verifier ON credential_verifications(verifier_address);
    CREATE INDEX IF NOT EXISTS idx_credential_verifications_status ON credential_verifications(status);
    CREATE INDEX IF NOT EXISTS idx_issuance_requests_requester ON issuance_requests(requester_address);
    CREATE INDEX IF NOT EXISTS idx_issuance_requests_issuer ON issuance_requests(issuer_address);
    CREATE INDEX IF NOT EXISTS idx_issuance_requests_status ON issuance_requests(status);
    CREATE INDEX IF NOT EXISTS idx_credential_revocations_credential ON credential_revocations(credential_id);
    CREATE INDEX IF NOT EXISTS idx_credential_revocations_revoked_by ON credential_revocations(revoked_by_address);

    -- Telegram authentication indexes
    CREATE INDEX IF NOT EXISTS idx_telegram_challenges_id ON telegram_challenges(challenge_id);
    CREATE INDEX IF NOT EXISTS idx_telegram_challenges_client ON telegram_challenges(client_id);
    CREATE INDEX IF NOT EXISTS idx_telegram_challenges_expires ON telegram_challenges(expires_at);
    CREATE INDEX IF NOT EXISTS idx_telegram_sessions_telegram_id ON telegram_sessions(telegram_id);
    CREATE INDEX IF NOT EXISTS idx_telegram_sessions_client ON telegram_sessions(client_id);
    CREATE INDEX IF NOT EXISTS idx_telegram_sessions_refresh_token ON telegram_sessions(refresh_token);

    -- Google OAuth indexes
    CREATE INDEX IF NOT EXISTS idx_google_challenges_id ON google_challenges(challenge_id);
    CREATE INDEX IF NOT EXISTS idx_google_challenges_client ON google_challenges(client_id);
    CREATE INDEX IF NOT EXISTS idx_google_challenges_expires ON google_challenges(expires_at);
    CREATE INDEX IF NOT EXISTS idx_google_sessions_google_id ON google_sessions(google_id);
    CREATE INDEX IF NOT EXISTS idx_google_sessions_email ON google_sessions(email);
    CREATE INDEX IF NOT EXISTS idx_google_sessions_client ON google_sessions(client_id);
    CREATE INDEX IF NOT EXISTS idx_google_sessions_refresh_token ON google_sessions(refresh_token);


    -- PAPI (Polkadot API) tables
    CREATE TABLE IF NOT EXISTS papi_chains (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      rpc_url TEXT NOT NULL,
      chain_id TEXT NOT NULL,
      ss58_format INTEGER NOT NULL,
      decimals INTEGER NOT NULL,
      token_symbol TEXT NOT NULL,
      is_enabled BOOLEAN DEFAULT 1,
      timeout INTEGER DEFAULT 30000,
      retry_attempts INTEGER DEFAULT 3,
      version TEXT,
      genesis_hash TEXT,
      last_connected INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS papi_transactions (
      id TEXT PRIMARY KEY,
      chain TEXT NOT NULL,
      from_address TEXT NOT NULL,
      to_address TEXT,
      amount TEXT,
      method TEXT,
      section TEXT,
      hash TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      block_number INTEGER,
      extrinsic_index INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (chain) REFERENCES papi_chains(name)
    );

    CREATE TABLE IF NOT EXISTS papi_events (
      id TEXT PRIMARY KEY,
      chain TEXT NOT NULL,
      block_number INTEGER NOT NULL,
      event_index INTEGER NOT NULL,
      section TEXT NOT NULL,
      method TEXT NOT NULL,
      data TEXT NOT NULL, -- JSON string
      timestamp INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (chain) REFERENCES papi_chains(name)
    );

    CREATE TABLE IF NOT EXISTS papi_accounts (
      id TEXT PRIMARY KEY,
      address TEXT NOT NULL,
      chain TEXT NOT NULL,
      nonce INTEGER DEFAULT 0,
      consumers INTEGER DEFAULT 0,
      providers INTEGER DEFAULT 0,
      sufficients INTEGER DEFAULT 0,
      free_balance TEXT DEFAULT '0',
      reserved_balance TEXT DEFAULT '0',
      frozen_balance TEXT DEFAULT '0',
      last_updated INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (chain) REFERENCES papi_chains(name),
      UNIQUE(address, chain)
    );

    -- PAPI indexes
    CREATE INDEX IF NOT EXISTS idx_papi_chains_name ON papi_chains(name);
    CREATE INDEX IF NOT EXISTS idx_papi_chains_enabled ON papi_chains(is_enabled);
    CREATE INDEX IF NOT EXISTS idx_papi_transactions_chain ON papi_transactions(chain);
    CREATE INDEX IF NOT EXISTS idx_papi_transactions_from ON papi_transactions(from_address);
    CREATE INDEX IF NOT EXISTS idx_papi_transactions_hash ON papi_transactions(hash);
    CREATE INDEX IF NOT EXISTS idx_papi_transactions_status ON papi_transactions(status);
    CREATE INDEX IF NOT EXISTS idx_papi_events_chain ON papi_events(chain);
    CREATE INDEX IF NOT EXISTS idx_papi_events_block ON papi_events(block_number);
    CREATE INDEX IF NOT EXISTS idx_papi_events_section_method ON papi_events(section, method);
    CREATE INDEX IF NOT EXISTS idx_papi_accounts_address ON papi_accounts(address);
    CREATE INDEX IF NOT EXISTS idx_papi_accounts_chain ON papi_accounts(chain);
    CREATE INDEX IF NOT EXISTS idx_papi_accounts_address_chain ON papi_accounts(address, chain);
  `);

  // Migration: Add missing columns to existing challenges table
  try {
    await db.exec(`
      ALTER TABLE challenges ADD COLUMN expires_at_timestamp INTEGER;
      ALTER TABLE challenges ADD COLUMN nonce TEXT;
      ALTER TABLE challenges ADD COLUMN issued_at TEXT;
    `);
  } catch (error) {
    // Columns might already exist, ignore error
    logger.info('Database migration completed', { note: 'Some columns may already exist' });
  }
}

// Legacy export for backward compatibility
export const dbPromise = initializeDatabase();
