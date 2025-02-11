import crypto from 'crypto';
import { Challenge } from '../types/auth';
import { Database } from 'sqlite';

export class ChallengeService {
  constructor(private db: Database) {}

  generateChallenge(client_id: string): Challenge {
    return {
      id: crypto.randomUUID(),
      message: `Login to SSO Demo at ${new Date().toISOString()}`,
      nonce: crypto.randomBytes(32).toString('hex'),
      client_id,
      created_at: Date.now(),
      expires_at: Date.now() + (5 * 60 * 1000), // 5 minutes
      used: false
    };
  }

  async storeChallenge(challenge: Challenge): Promise<void> {
    await this.db.run(
      'INSERT INTO challenges (id, message, client_id, created_at, expires_at, nonce, used) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        challenge.id,
        challenge.message,
        challenge.client_id,
        challenge.created_at,
        challenge.expires_at,
        challenge.nonce,
        challenge.used
      ]
    );
  }

  async getChallenge(id: string): Promise<Challenge | undefined> {
    return this.db.get<Challenge>(
      'SELECT * FROM challenges WHERE id = ? AND used = 0',
      [id]
    );
  }

  async markChallengeUsed(id: string): Promise<void> {
    await this.db.run(
      'UPDATE challenges SET used = 1 WHERE id = ?',
      [id]
    );
  }

  async cleanupExpiredChallenges(): Promise<void> {
    const now = Date.now();
    await this.db.run(
      'DELETE FROM challenges WHERE expires_at < ?',
      [now]
    );
  }
}
