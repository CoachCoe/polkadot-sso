import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { TokenPayload, Session } from '../types/auth';
import { JWT_CONFIG } from '../config/auth';
import { Database } from 'sqlite';

export class TokenService {
  constructor(private db: Database) {}

  generateTokens(address: string, client_id: string) {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET environment variable is required');
    }

    const accessJwtid = crypto.randomBytes(32).toString('hex');
    const refreshJwtid = crypto.randomBytes(32).toString('hex');
    const fingerprint = crypto.randomBytes(16).toString('hex');

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

      const session = await this.db.get<Session>(
        'SELECT * FROM sessions WHERE address = ? AND client_id = ? AND is_active = 1',
        [decoded.address, decoded.client_id]
      );

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
    }
  }
}
