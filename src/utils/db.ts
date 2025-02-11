import { Database } from 'sqlite';

export const secureQueries = {
  challenges: {
    get: async (db: Database, id: string) => 
      db.get(
        'SELECT * FROM challenges WHERE id = ? AND used = FALSE AND expires_at > ?',
        [id, Date.now()]
      ),

    create: async (db: Database, challenge: any) =>
      db.run(
        `INSERT INTO challenges (
          id, message, client_id, created_at, expires_at,
          code_verifier, code_challenge, state, used
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          challenge.id,
          challenge.message,
          challenge.client_id,
          challenge.created_at,
          challenge.expires_at,
          challenge.code_verifier,
          challenge.code_challenge,
          challenge.state,
          false
        ]
      ),

    markUsed: async (db: Database, id: string) =>
      db.run(
        'UPDATE challenges SET used = TRUE WHERE id = ?',
        [id]
      )
  },

  sessions: {
    update: async (db: Database, params: any) =>
      db.run(
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
          params.accessToken,
          params.refreshToken,
          params.accessJwtid,
          params.refreshJwtid,
          params.fingerprint,
          params.accessExpires,
          params.refreshExpires,
          Date.now(),
          params.address,
          params.clientId
        ]
      ),

    get: async (db: Database, address: string, clientId: string) =>
      db.get(
        'SELECT * FROM sessions WHERE address = ? AND client_id = ? AND is_active = 1',
        [address, clientId]
      )
  },

  authCodes: {
    create: async (db: Database, params: any) =>
      db.run(
        `INSERT INTO auth_codes (
          code, address, client_id, created_at, expires_at, used
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          params.code,
          params.address,
          params.clientId,
          Date.now(),
          Date.now() + (5 * 60 * 1000),
          false
        ]
      ),

    verify: async (db: Database, code: string, clientId: string) =>
      db.get(
        'SELECT * FROM auth_codes WHERE code = ? AND client_id = ? AND used = 0',
        [code, clientId]
      ),

    markUsed: async (db: Database, code: string) =>
      db.run(
        'UPDATE auth_codes SET used = 1 WHERE code = ?',
        [code]
      )
  }
}; 