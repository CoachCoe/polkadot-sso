import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import type { Session } from '../types/index.js';

export interface JWTPayload {
  sub: string; // subject (user address)
  iss: string; // issuer (SSO server)
  aud: string; // audience (client ID)
  iat: number; // issued at
  exp: number; // expires at
  jti: string; // JWT ID (token ID)
  sessionId: string;
  address: string;
  clientId: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: number;
  refreshTokenExpiresAt: number;
}

export class JWTService {
  private accessTokenSecret: string;
  private refreshTokenSecret: string;
  private issuer: string;
  private accessTokenExpiry: number; // in seconds
  private refreshTokenExpiry: number; // in seconds

  constructor() {
    // Require strong secrets in production
    this.accessTokenSecret =
      process.env.JWT_ACCESS_SECRET || crypto.randomBytes(64).toString('hex');
    this.refreshTokenSecret =
      process.env.JWT_REFRESH_SECRET || crypto.randomBytes(64).toString('hex');
    this.issuer = process.env.JWT_ISSUER || 'polkadot-sso';
    this.accessTokenExpiry = parseInt(process.env.JWT_ACCESS_EXPIRY || '900'); // 15 minutes
    this.refreshTokenExpiry = parseInt(process.env.JWT_REFRESH_EXPIRY || '604800'); // 7 days

    // Warn if using default secrets in production
    if (
      process.env.NODE_ENV === 'production' &&
      (this.accessTokenSecret === 'default-access-secret' ||
        this.refreshTokenSecret === 'default-refresh-secret')
    ) {
      console.warn(
        '⚠️  WARNING: Using default JWT secrets in production! Set JWT_ACCESS_SECRET and JWT_REFRESH_SECRET environment variables.'
      );
    }
  }

  /**
   * Generate a new token pair for a session
   */
  generateTokenPair(session: Session): TokenPair {
    const now = Math.floor(Date.now() / 1000);
    const accessTokenExpiresAt = now + this.accessTokenExpiry;
    const refreshTokenExpiresAt = now + this.refreshTokenExpiry;

    // Generate unique token IDs
    const accessTokenId = crypto.randomUUID();
    const refreshTokenId = crypto.randomUUID();

    // Create access token payload
    const accessTokenPayload: JWTPayload = {
      sub: session.address,
      iss: this.issuer,
      aud: session.client_id,
      iat: now,
      exp: accessTokenExpiresAt,
      jti: accessTokenId,
      sessionId: session.id,
      address: session.address,
      clientId: session.client_id,
    };

    // Create refresh token payload
    const refreshTokenPayload: JWTPayload = {
      sub: session.address,
      iss: this.issuer,
      aud: session.client_id,
      iat: now,
      exp: refreshTokenExpiresAt,
      jti: refreshTokenId,
      sessionId: session.id,
      address: session.address,
      clientId: session.client_id,
    };

    // Generate tokens
    const accessToken = jwt.sign(accessTokenPayload, this.accessTokenSecret, {
      algorithm: 'HS256',
    });

    const refreshToken = jwt.sign(refreshTokenPayload, this.refreshTokenSecret, {
      algorithm: 'HS256',
    });

    return {
      accessToken,
      refreshToken,
      accessTokenExpiresAt: accessTokenExpiresAt * 1000, // Convert to milliseconds
      refreshTokenExpiresAt: refreshTokenExpiresAt * 1000, // Convert to milliseconds
    };
  }

  /**
   * Verify and decode an access token
   */
  verifyAccessToken(token: string): JWTPayload | null {
    try {
      const payload = jwt.verify(token, this.accessTokenSecret, {
        algorithms: ['HS256'],
        issuer: this.issuer,
      }) as JWTPayload;

      return payload;
    } catch (error) {
      console.error('Access token verification failed:', error);
      return null;
    }
  }

  /**
   * Verify and decode a refresh token
   */
  verifyRefreshToken(token: string): JWTPayload | null {
    try {
      const payload = jwt.verify(token, this.refreshTokenSecret, {
        algorithms: ['HS256'],
        issuer: this.issuer,
      }) as JWTPayload;

      return payload;
    } catch (error) {
      console.error('Refresh token verification failed:', error);
      return null;
    }
  }

  /**
   * Extract token from Authorization header
   */
  extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader) {
      return null;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }

    return parts[1];
  }

  /**
   * Check if a token is expired
   */
  isTokenExpired(payload: JWTPayload): boolean {
    const now = Math.floor(Date.now() / 1000);
    return payload.exp < now;
  }

  /**
   * Get token expiration time
   */
  getTokenExpiration(payload: JWTPayload): Date {
    return new Date(payload.exp * 1000);
  }

  /**
   * Generate a new access token from a refresh token
   */
  refreshAccessToken(refreshToken: string): { accessToken: string; expiresAt: number } | null {
    const payload = this.verifyRefreshToken(refreshToken);
    if (!payload) {
      return null;
    }

    if (this.isTokenExpired(payload)) {
      return null;
    }

    const now = Math.floor(Date.now() / 1000);
    const accessTokenExpiresAt = now + this.accessTokenExpiry;
    const accessTokenId = crypto.randomUUID();

    const accessTokenPayload: JWTPayload = {
      sub: payload.sub,
      iss: this.issuer,
      aud: payload.aud,
      iat: now,
      exp: accessTokenExpiresAt,
      jti: accessTokenId,
      sessionId: payload.sessionId,
      address: payload.address,
      clientId: payload.clientId,
    };

    const accessToken = jwt.sign(accessTokenPayload, this.accessTokenSecret, {
      algorithm: 'HS256',
    });

    return {
      accessToken,
      expiresAt: accessTokenExpiresAt * 1000, // Convert to milliseconds
    };
  }

  /**
   * Blacklist a token (in a real implementation, you'd store this in Redis)
   */
  blacklistToken(tokenId: string, expiresAt: number): void {
    // In a real implementation, you would store the blacklisted token ID
    // in Redis with an expiration time
    console.log(`Token ${tokenId} blacklisted until ${new Date(expiresAt)}`);
  }

  /**
   * Check if a token is blacklisted
   */
  isTokenBlacklisted(tokenId: string): boolean {
    // In a real implementation, you would check Redis for the token ID
    return false;
  }
}

// Global JWT service instance
export const jwtService = new JWTService();
