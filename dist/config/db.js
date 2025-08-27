"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dbPromise = void 0;
exports.createDbPool = createDbPool;
exports.initializeDatabase = initializeDatabase;
const promises_1 = require("fs/promises");
const path_1 = require("path");
const sqlite_1 = require("sqlite");
const sqlite3_1 = __importDefault(require("sqlite3"));
const DB_POOL_SIZE = 10;
async function createDbPool() {
    const pool = [];
    for (let i = 0; i < DB_POOL_SIZE; i++) {
        const db = await (0, sqlite_1.open)({
            filename: './data/sso.db',
            driver: sqlite3_1.default.Database,
        });
        pool.push(db);
    }
    return pool;
}
async function initializeDatabase() {
    const dbPath = './data/sso.db';
    await (0, promises_1.mkdir)((0, path_1.dirname)(dbPath), { recursive: true });
    const db = await (0, sqlite_1.open)({
        filename: dbPath,
        driver: sqlite3_1.default.Database,
    });
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
  `);
    // Migration: Add missing columns to existing challenges table
    try {
        await db.exec(`
      ALTER TABLE challenges ADD COLUMN expires_at_timestamp INTEGER;
      ALTER TABLE challenges ADD COLUMN nonce TEXT;
      ALTER TABLE challenges ADD COLUMN issued_at TEXT;
    `);
    }
    catch (error) {
        // Columns might already exist, ignore error
        console.log('Migration completed (some columns may already exist)');
    }
    return db;
}
exports.dbPromise = initializeDatabase();
//# sourceMappingURL=db.js.map