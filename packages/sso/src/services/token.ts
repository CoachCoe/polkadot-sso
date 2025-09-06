import jwt from 'jsonwebtoken';
import { JWT_CONFIG } from '../config/auth';
import { getDatabaseConnection, releaseDatabaseConnection } from '../config/db';
import { Session, TokenPayload } from '../types/auth';
import { randomBytes } from '../utils/crypto';
import { createLogger } from '../utils/logger';
import { getCacheStrategies } from './cacheService';

const logger = createLogger('token-service');

export class TokenService {
  constructor() {}

  generateTokens(address: string, client_id: string) {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET environment variable is required');
    }

    const accessJwtid = Array.from(randomBytes(32))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    const refreshJwtid = Array.from(randomBytes(32))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    const fingerprint = Array.from(randomBytes(16))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    const accessToken = jwt.sign(
      {
        address,
        client_id,
        type: 'access',
        jti: accessJwtid,
        fingerprint,
      } as TokenPayload,
      jwtSecret,
      {
        algorithm: JWT_CONFIG.algorithm,
        expiresIn: JWT_CONFIG.accessTokenExpiry,
        audience: client_id,
        issuer: JWT_CONFIG.issuer,
      }
    );

    const refreshToken = jwt.sign(
      {
        address,
        client_id,
        type: 'refresh',
        jti: refreshJwtid,
        fingerprint,
      } as TokenPayload,
      jwtSecret,
      {
        algorithm: JWT_CONFIG.algorithm,
        expiresIn: JWT_CONFIG.refreshTokenExpiry,
        audience: client_id,
        issuer: JWT_CONFIG.issuer,
      }
    );

    return {
      accessToken,
      refreshToken,
      fingerprint,
      accessJwtid,
      refreshJwtid,
    };
  }

  async verifyToken(token: string, type: 'access' | 'refresh') {
    let db: any = null;
    try {
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        throw new Error('JWT_SECRET environment variable is required');
      }

      const decoded = jwt.verify(token, jwtSecret, {
        algorithms: [JWT_CONFIG.algorithm],
        issuer: JWT_CONFIG.issuer,
      }) as TokenPayload;

      if (decoded.type !== type) {
        throw new Error('Invalid token type');
      }

      const cacheStrategies = getCacheStrategies();
      const cacheKey = `session:${decoded.address}:${decoded.client_id}`;
      let session = await cacheStrategies.getSession<Session>(cacheKey);

      if (!session) {
        db = await getDatabaseConnection();
        session = (await db.get(
          'SELECT * FROM sessions WHERE address = ? AND client_id = ? AND is_active = 1',
          [decoded.address, decoded.client_id]
        )) as Session | null;

        if (session) {
          await cacheStrategies.setSession(cacheKey, session);
        }
      }

      if (!session) {
        throw new Error('Session not found or inactive');
      }

      if (session.fingerprint !== decoded.fingerprint) {
        throw new Error('Invalid token fingerprint');
      }

      return {
        valid: true,
        decoded,
        session,
      };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Token verification failed',
      };
    } finally {
      if (db) {
        releaseDatabaseConnection(db);
      }
    }
  }

  async createSession(address: string, client_id: string): Promise<Session | null> {
    let db: any = null;
    try {
      const tokens = this.generateTokens(address, client_id);
      const now = Date.now();
      const accessTokenExpiresAt = now + JWT_CONFIG.accessTokenExpiry * 1000;
      const refreshTokenExpiresAt = now + JWT_CONFIG.refreshTokenExpiry * 1000;

      const session: Session = {
        id: crypto.randomUUID(),
        address,
        client_id,
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        access_token_id: tokens.accessJwtid,
        refresh_token_id: tokens.refreshJwtid,
        fingerprint: tokens.fingerprint,
        access_token_expires_at: accessTokenExpiresAt,
        refresh_token_expires_at: refreshTokenExpiresAt,
        created_at: now,
        last_used_at: now,
        is_active: true,
      };

      db = await getDatabaseConnection();
      await db.run(
        `INSERT INTO sessions (
          id, address, client_id, access_token, refresh_token,
          access_token_id, refresh_token_id, fingerprint,
          access_token_expires_at, refresh_token_expires_at,
          created_at, last_used_at, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          session.id,
          session.address,
          session.client_id,
          session.access_token,
          session.refresh_token,
          session.access_token_id,
          session.refresh_token_id,
          session.fingerprint,
          session.access_token_expires_at,
          session.refresh_token_expires_at,
          session.created_at,
          session.last_used_at,
          session.is_active ? 1 : 0,
        ]
      );

      const cacheStrategies = getCacheStrategies();
      const cacheKey = `session:${address}:${client_id}`;
      await cacheStrategies.setSession(cacheKey, session);

      logger.info('Session created successfully', {
        sessionId: session.id,
        address,
        clientId: client_id,
      });

      return session;
    } catch (error) {
      logger.error('Failed to create session', {
        error: error instanceof Error ? error.message : String(error),
        address,
        clientId: client_id,
      });
      return null;
    } finally {
      if (db) {
        releaseDatabaseConnection(db);
      }
    }
  }

  async invalidateSession(accessToken: string): Promise<boolean> {
    let db: any = null;
    try {
      const result = await this.verifyToken(accessToken, 'access');
      if (!result.valid || !result.session) {
        return false;
      }

      db = await getDatabaseConnection();
      await db.run('UPDATE sessions SET is_active = 0 WHERE id = ?', [result.session.id]);

      const cacheStrategies = getCacheStrategies();
      const cacheKey = `session:${result.session.address}:${result.session.client_id}`;
      await cacheStrategies.getSession(cacheKey); // This will clear the cache entry

      logger.info('Session invalidated successfully', {
        sessionId: result.session.id,
        address: result.session.address,
      });

      return true;
    } catch (error) {
      logger.error('Failed to invalidate session', {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    } finally {
      if (db) {
        releaseDatabaseConnection(db);
      }
    }
  }

  async refreshSession(refreshToken: string): Promise<Session | null> {
    let db: any = null;
    try {
      const result = await this.verifyToken(refreshToken, 'refresh');
      if (!result.valid || !result.session) {
        return null;
      }

      const tokens = this.generateTokens(result.session.address, result.session.client_id);
      const now = Date.now();
      const accessTokenExpiresAt = now + JWT_CONFIG.accessTokenExpiry * 1000;
      const refreshTokenExpiresAt = now + JWT_CONFIG.refreshTokenExpiry * 1000;

      db = await getDatabaseConnection();
      await db.run(
        `UPDATE sessions SET
          access_token = ?, refresh_token = ?,
          access_token_id = ?, refresh_token_id = ?,
          fingerprint = ?, access_token_expires_at = ?,
          refresh_token_expires_at = ?, last_used_at = ?
        WHERE id = ?`,
        [
          tokens.accessToken,
          tokens.refreshToken,
          tokens.accessJwtid,
          tokens.refreshJwtid,
          tokens.fingerprint,
          accessTokenExpiresAt,
          refreshTokenExpiresAt,
          now,
          result.session.id,
        ]
      );

      const updatedSession: Session = {
        ...result.session,
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        access_token_id: tokens.accessJwtid,
        refresh_token_id: tokens.refreshJwtid,
        fingerprint: tokens.fingerprint,
        access_token_expires_at: accessTokenExpiresAt,
        refresh_token_expires_at: refreshTokenExpiresAt,
        last_used_at: now,
      };

      const cacheStrategies = getCacheStrategies();
      const cacheKey = `session:${result.session.address}:${result.session.client_id}`;
      await cacheStrategies.setSession(cacheKey, updatedSession);

      logger.info('Session refreshed successfully', {
        sessionId: result.session.id,
        address: result.session.address,
      });

      return updatedSession;
    } catch (error) {
      logger.error('Failed to refresh session', {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    } finally {
      if (db) {
        releaseDatabaseConnection(db);
      }
    }
  }

  async getSessionStats(): Promise<{ active: number; total: number }> {
    let db: any = null;
    try {
      db = await getDatabaseConnection();
      const activeResult = await db.get(
        'SELECT COUNT(*) as count FROM sessions WHERE is_active = 1'
      );
      const totalResult = await db.get('SELECT COUNT(*) as count FROM sessions');

      return {
        active: activeResult?.count || 0,
        total: totalResult?.count || 0,
      };
    } catch (error) {
      logger.error('Failed to get session stats', {
        error: error instanceof Error ? error.message : String(error),
      });
      return { active: 0, total: 0 };
    } finally {
      if (db) {
        releaseDatabaseConnection(db);
      }
    }
  }
}
