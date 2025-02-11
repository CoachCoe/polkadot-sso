import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';

export async function initializeDatabase(): Promise<Database> {
  const db = await open({
    filename: process.env.DATABASE_PATH || './sso.db',
    driver: sqlite3.Database
  });

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

    CREATE INDEX IF NOT EXISTS idx_challenges_id ON challenges(id);
    CREATE INDEX IF NOT EXISTS idx_sessions_address ON sessions(address);
    CREATE INDEX IF NOT EXISTS idx_sessions_refresh_token ON sessions(refresh_token);
  `);

  return db;
}

export const dbPromise = initializeDatabase();
