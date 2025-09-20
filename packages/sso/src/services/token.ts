import { JWT_CONFIG } from '../config/auth.js';
import { getDatabaseConnection, releaseDatabaseConnection } from '../config/db.js';
import { Session } from '../types/auth.js';
import { randomBytes } from '../utils/crypto.js';
import { createLogger } from '../utils/logger.js';
import { getCacheStrategies } from './cacheService.js';
import { jwtService } from './jwtService.js';

const logger = createLogger('token-service');

export class TokenService {
  constructor() {}

  generateTokens(address: string, client_id: string) {
    // Create a temporary session object for token generation
    const tempSession: Session = {
      id: Array.from(randomBytes(16))
        .map(b => b.toString(16).padStart(2, '0'))
        .join(''),
      address,
      client_id: client_id,
      access_token: '',
      refresh_token: '',
      access_token_id: '',
      refresh_token_id: '',
      fingerprint: Array.from(randomBytes(16))
        .map(b => b.toString(16).padStart(2, '0'))
        .join(''),
      access_token_expires_at: 0,
      refresh_token_expires_at: 0,
      created_at: Date.now(),
      last_used_at: Date.now(),
      is_active: true,
    };

    // Generate token pair using the JWT service
    const tokenPair = jwtService.generateTokenPair(tempSession);

    return {
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      fingerprint: tempSession.fingerprint,
      accessJwtid: tempSession.access_token_id,
      refreshJwtid: tempSession.refresh_token_id,
      accessTokenExpiresAt: tokenPair.accessTokenExpiresAt,
      refreshTokenExpiresAt: tokenPair.refreshTokenExpiresAt,
    };
  }

  async verifyToken(token: string, type: 'access' | 'refresh') {
    let db: any = null;
    try {
      // Use the JWT service to verify the token
      const payload =
        type === 'access'
          ? jwtService.verifyAccessToken(token)
          : jwtService.verifyRefreshToken(token);

      if (!payload) {
        throw new Error('Invalid or expired token');
      }

      if (jwtService.isTokenExpired(payload)) {
        throw new Error('Token has expired');
      }

      if (jwtService.isTokenBlacklisted(payload.jti)) {
        throw new Error('Token has been revoked');
      }

      const cacheStrategies = getCacheStrategies();
      const cacheKey = `session:${payload.address}:${payload.clientId}`;
      let session = await cacheStrategies.getSession<Session>(cacheKey);

      if (!session) {
        db = await getDatabaseConnection();
        session = (await db.get(
          'SELECT * FROM sessions WHERE address = ? AND client_id = ? AND is_active = 1',
          [payload.address, payload.clientId]
        )) as Session | null;

        if (session) {
          await cacheStrategies.setSession(cacheKey, session);
        }
      }

      if (!session) {
        throw new Error('Session not found or inactive');
      }

      // Note: Fingerprint validation removed as it's not included in JWT payload
      // In a production system, you might want to add additional validation here

      return {
        valid: true,
        decoded: payload,
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
