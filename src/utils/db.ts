import { Database } from 'sqlite';

export const secureQuery = {
  getChallenge: async (db: Database, id: string) => {
    return db.get(
      'SELECT * FROM challenges WHERE id = ? AND used = FALSE AND expires_at > ?',
      [id, Date.now()]
    );
  },
  
  insertToken: async (db: Database, token: { 
    id: string; 
    userId: string; 
    expiresAt: number; 
  }) => {
    return db.run(
      'INSERT INTO tokens (id, user_id, expires_at, revoked) VALUES (?, ?, ?, ?)',
      [token.id, token.userId, token.expiresAt, false]
    );
  }
}; 