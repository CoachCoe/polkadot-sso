import crypto from 'crypto';
import { Challenge } from '../types/auth';
import { Database } from 'sqlite';

export class ChallengeService {
  constructor(private db: Database) {}

  private generateCodeVerifier(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  private async generateCodeChallenge(verifier: string): Promise<string> {
    const hash = crypto.createHash('sha256');
    hash.update(verifier);
    return hash.digest('base64url');
  }

  async generateChallenge(client_id: string): Promise<Challenge> {
    const code_verifier = this.generateCodeVerifier();
    const code_challenge = await this.generateCodeChallenge(code_verifier);
    const state = crypto.randomBytes(16).toString('hex');

    return {
      id: crypto.randomUUID(),
      message: `Login to SSO Demo at ${new Date().toISOString()}`,
      code_verifier,
      code_challenge,
      state,
      client_id,
      created_at: Date.now(),
      expires_at: Date.now() + (5 * 60 * 1000), 
      used: false
    };
  }

  async storeChallenge(challenge: Challenge): Promise<void> {
    await this.db.run(
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
