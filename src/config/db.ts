import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import { mkdir } from 'fs/promises';
import { dirname } from 'path';

export async function initializeDatabase(): Promise<Database> {
  const dbPath = './data/sso.db';
  
  // Create data directory if it doesn't exist
  await mkdir(dirname(dbPath), { recursive: true });

  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS challenges (
      id TEXT PRIMARY KEY,
      message TEXT NOT NULL,
      client_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      code_verifier TEXT NOT NULL,
      code_challenge TEXT NOT NULL,
      state TEXT NOT NULL,
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

    CREATE INDEX IF NOT EXISTS idx_challenges_id ON challenges(id);
    CREATE INDEX IF NOT EXISTS idx_sessions_address ON sessions(address);
    CREATE INDEX IF NOT EXISTS idx_sessions_refresh_token ON sessions(refresh_token);
    CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_address);
    CREATE INDEX IF NOT EXISTS idx_audit_client ON audit_logs(client_id);
    CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
  `);

  return db;
}

export const dbPromise = initializeDatabase();
