import { getDatabaseConnection, releaseDatabaseConnection } from '../config/db.js';
import { Challenge } from '../types/auth.js';
import { createHash, randomBytes, randomUUID } from '../utils/crypto.js';
import { createLogger } from '../utils/logger.js';
import { getCacheStrategies } from './cacheService.js';

const logger = createLogger('challenge-service');

export class ChallengeService {
  constructor() {}

  private generateCodeVerifier(): string {
    return Buffer.from(randomBytes(32)).toString('base64url');
  }

  private async generateCodeChallenge(verifier: string): Promise<string> {
    const hash = createHash('sha256');
    hash.update(verifier);
    return hash.digest('base64url');
  }

  private generateNonce(): string {
    return Array.from(randomBytes(32))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private formatSIWEStyleMessage(params: {
    domain: string;
    address: string;
    statement: string;
    uri: string;
    version: string;
    chainId: string;
    nonce: string;
    issuedAt: string;
    expirationTime?: string;
    notBefore?: string;
    requestId?: string;
    resources?: string[];
  }): string {
    const {
      domain,
      address,
      statement,
      uri,
      version,
      chainId,
      nonce,
      issuedAt,
      expirationTime,
      notBefore,
      requestId,
      resources,
    } = params;

    let message = `${domain} wants you to sign in with your Polkadot account:\n`;
    message += `${address}\n\n`;

    if (statement) {
      message += `${statement}\n\n`;
    }

    message += `URI: ${uri}\n`;
    message += `Version: ${version}\n`;
    message += `Chain ID: ${chainId}\n`;
    message += `Nonce: ${nonce}\n`;
    message += `Issued At: ${issuedAt}`;

    if (expirationTime) {
      message += `\nExpiration Time: ${expirationTime}`;
    }

    if (notBefore) {
      message += `\nNot Before: ${notBefore}`;
    }

    if (requestId) {
      message += `\nRequest ID: ${requestId}`;
    }

    if (resources && resources.length > 0) {
      message += `\nResources:`;
      resources.forEach(resource => {
        message += `\n- ${resource}`;
      });
    }

    return message;
  }

  async generateChallenge(client_id: string, userAddress?: string): Promise<Challenge> {
    let db: any = null;
    try {
      const code_verifier = this.generateCodeVerifier();
      const code_challenge = await this.generateCodeChallenge(code_verifier);
      const state = Array.from(randomBytes(16))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      const nonce = this.generateNonce();
      const issuedAt = new Date().toISOString();
      const expirationTime = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes

      const message = this.formatSIWEStyleMessage({
        domain: 'polkadot-sso.localhost',
        address: userAddress || '0x...', // Will be replaced with actual address
        statement: 'Sign this message to authenticate with Polkadot SSO',
        uri: 'http://localhost:3000',
        version: '1',
        chainId: 'kusama',
        nonce,
        issuedAt,
        expirationTime,
        requestId: Array.from(randomBytes(16))
          .map(b => b.toString(16).padStart(2, '0'))
          .join(''),
        resources: ['https://polkadot-sso.localhost'],
      });

      const challenge: Challenge = {
        id: randomUUID(),
        message,
        client_id,
        created_at: Date.now(),
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes
        expires_at_timestamp: Math.floor((Date.now() + 5 * 60 * 1000) / 1000),
        code_verifier,
        code_challenge,
        state,
        nonce,
        issued_at: issuedAt,
        used: false,
      };

      db = await getDatabaseConnection();
      await db.run(
        `INSERT INTO challenges (
          id, message, client_id, created_at, expires_at,
          expires_at_timestamp, code_verifier, code_challenge,
          state, nonce, issued_at, used
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          challenge.id,
          challenge.message,
          challenge.client_id,
          challenge.created_at,
          challenge.expires_at,
          challenge.expires_at_timestamp,
          challenge.code_verifier,
          challenge.code_challenge,
          challenge.state,
          challenge.nonce,
          challenge.issued_at,
          0,
        ]
      );

      const cacheStrategies = getCacheStrategies();
      await cacheStrategies.setChallenge(challenge.id, challenge);

      logger.info('Challenge generated successfully', {
        challengeId: challenge.id,
        clientId: client_id,
        address: userAddress,
      });

      return challenge;
    } catch (error) {
      logger.error('Failed to generate challenge', {
        error: error instanceof Error ? error.message : String(error),
        clientId: client_id,
        address: userAddress,
      });
      throw error;
    } finally {
      if (db) {
        releaseDatabaseConnection(db);
      }
    }
  }

  async getChallenge(challengeId: string): Promise<Challenge | null> {
    let db: any = null;
    try {
      const cacheStrategies = getCacheStrategies();
      let challenge = await cacheStrategies.getChallenge<Challenge>(challengeId);

      if (!challenge) {
        db = await getDatabaseConnection();
        const result = await db.get(
          'SELECT * FROM challenges WHERE id = ? AND used = 0 AND expires_at > ?',
          [challengeId, Date.now()]
        );

        if (result) {
          challenge = {
            id: result.id,
            message: result.message,
            client_id: result.client_id,
            created_at: result.created_at,
            expires_at: result.expires_at,
            expires_at_timestamp: result.expires_at_timestamp,
            code_verifier: result.code_verifier,
            code_challenge: result.code_challenge,
            state: result.state,
            nonce: result.nonce,
            issued_at: result.issued_at,
            used: Boolean(result.used),
          };

          await cacheStrategies.setChallenge(challengeId, challenge);
        }
      }

      return challenge || null;
    } catch (error) {
      logger.error('Failed to get challenge', {
        error: error instanceof Error ? error.message : String(error),
        challengeId,
      });
      return null;
    } finally {
      if (db) {
        releaseDatabaseConnection(db);
      }
    }
  }

  async markChallengeUsed(challengeId: string): Promise<boolean> {
    let db: any = null;
    try {
      db = await getDatabaseConnection();
      const result = await db.run('UPDATE challenges SET used = 1 WHERE id = ?', [challengeId]);

      if (result.changes > 0) {
        const cacheStrategies = getCacheStrategies();
        await cacheStrategies.getChallenge(challengeId);

        logger.info('Challenge marked as used', { challengeId });
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Failed to mark challenge as used', {
        error: error instanceof Error ? error.message : String(error),
        challengeId,
      });
      return false;
    } finally {
      if (db) {
        releaseDatabaseConnection(db);
      }
    }
  }

  async cleanupExpiredChallenges(): Promise<number> {
    let db: any = null;
    try {
      db = await getDatabaseConnection();
      const result = await db.run('DELETE FROM challenges WHERE expires_at < ?', [Date.now()]);

      if (result.changes > 0) {
        logger.info('Cleaned up expired challenges', { count: result.changes });
      }

      return result.changes || 0;
    } catch (error) {
      logger.error('Failed to cleanup expired challenges', {
        error: error instanceof Error ? error.message : String(error),
      });
      return 0;
    } finally {
      if (db) {
        releaseDatabaseConnection(db);
      }
    }
  }

  async getChallengeStats(): Promise<{ active: number; expired: number; used: number }> {
    let db: any = null;
    try {
      db = await getDatabaseConnection();
      const now = Date.now();

      const activeResult = await db.get(
        'SELECT COUNT(*) as count FROM challenges WHERE used = 0 AND expires_at > ?',
        [now]
      );
      const expiredResult = await db.get(
        'SELECT COUNT(*) as count FROM challenges WHERE expires_at <= ?',
        [now]
      );
      const usedResult = await db.get(
        'SELECT COUNT(*) as count FROM challenges WHERE used = 1',
        []
      );

      return {
        active: activeResult?.count || 0,
        expired: expiredResult?.count || 0,
        used: usedResult?.count || 0,
      };
    } catch (error) {
      logger.error('Failed to get challenge stats', {
        error: error instanceof Error ? error.message : String(error),
      });
      return { active: 0, expired: 0, used: 0 };
    } finally {
      if (db) {
        releaseDatabaseConnection(db);
      }
    }
  }
}
