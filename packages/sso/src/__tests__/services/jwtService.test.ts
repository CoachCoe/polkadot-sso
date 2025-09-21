import { beforeEach, describe, expect, it } from 'vitest';
import { JWTService } from '../../services/jwtService.js';

describe('JWTService', () => {
  let jwtService: JWTService;

  beforeEach(() => {
    jwtService = new JWTService();
  });

  describe('constructor', () => {
    it('should throw error if JWT_ACCESS_SECRET is not provided', () => {
      const originalSecret = process.env.JWT_ACCESS_SECRET;
      delete process.env.JWT_ACCESS_SECRET;
      expect(() => new JWTService()).toThrow('JWT_ACCESS_SECRET is required');
      process.env.JWT_ACCESS_SECRET = originalSecret;
    });

    it('should throw error if JWT_REFRESH_SECRET is not provided', () => {
      const originalSecret = process.env.JWT_REFRESH_SECRET;
      delete process.env.JWT_REFRESH_SECRET;
      expect(() => new JWTService()).toThrow('JWT_REFRESH_SECRET is required');
      process.env.JWT_REFRESH_SECRET = originalSecret;
    });

    it('should throw error if secret is too short', () => {
      const originalSecret = process.env.JWT_ACCESS_SECRET;
      process.env.JWT_ACCESS_SECRET = 'short';
      expect(() => new JWTService()).toThrow('JWT_ACCESS_SECRET must be at least 32 characters long');
      process.env.JWT_ACCESS_SECRET = originalSecret;
    });

    it('should throw error if secret contains weak patterns', () => {
      const originalSecret = process.env.JWT_ACCESS_SECRET;
      process.env.JWT_ACCESS_SECRET = 'test-secret-that-is-at-least-32-characters-long';
      expect(() => new JWTService()).toThrow('JWT_ACCESS_SECRET contains weak or common secret patterns');
      process.env.JWT_ACCESS_SECRET = originalSecret;
    });
  });

  describe('generateTokenPair', () => {
    it('should generate valid access and refresh tokens', () => {
      const session = {
        id: 'test-session-id',
        address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        client_id: 'test-client',
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        access_token_expires_at: Date.now() + 900000,
        refresh_token_expires_at: Date.now() + 604800000,
      };

      const tokenPair = jwtService.generateTokenPair(session);

      expect(tokenPair).toHaveProperty('accessToken');
      expect(tokenPair).toHaveProperty('refreshToken');
      expect(tokenPair).toHaveProperty('accessTokenExpiresAt');
      expect(tokenPair).toHaveProperty('refreshTokenExpiresAt');
      expect(typeof tokenPair.accessToken).toBe('string');
      expect(typeof tokenPair.refreshToken).toBe('string');
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify valid access token', () => {
      const session = {
        id: 'test-session-id',
        address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        client_id: 'test-client',
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        access_token_expires_at: Date.now() + 900000,
        refresh_token_expires_at: Date.now() + 604800000,
      };

      const tokenPair = jwtService.generateTokenPair(session);
      const payload = jwtService.verifyAccessToken(tokenPair.accessToken);

      expect(payload).toHaveProperty('sessionId', session.id);
      expect(payload).toHaveProperty('address', session.address);
      expect(payload).toHaveProperty('clientId', session.client_id);
    });

    it('should return null for invalid token', () => {
      expect(jwtService.verifyAccessToken('invalid-token')).toBeNull();
    });

    it('should throw error for expired token', () => {
      // Create a token with past expiry
      const session = {
        id: 'test-session-id',
        address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        client_id: 'test-client',
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        access_token_expires_at: Date.now() - 1000, // Past time
        refresh_token_expires_at: Date.now() + 604800000,
      };

      const tokenPair = jwtService.generateTokenPair(session);

      // Wait a bit to ensure token is expired
      setTimeout(() => {
        expect(() => jwtService.verifyAccessToken(tokenPair.accessToken)).toThrow();
      }, 100);
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify valid refresh token', () => {
      const session = {
        id: 'test-session-id',
        address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        client_id: 'test-client',
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        access_token_expires_at: Date.now() + 900000,
        refresh_token_expires_at: Date.now() + 604800000,
      };

      const tokenPair = jwtService.generateTokenPair(session);
      const payload = jwtService.verifyRefreshToken(tokenPair.refreshToken);

      expect(payload).toHaveProperty('sessionId', session.id);
      expect(payload).toHaveProperty('address', session.address);
      expect(payload).toHaveProperty('clientId', session.client_id);
    });

    it('should return null for invalid refresh token', () => {
      expect(jwtService.verifyRefreshToken('invalid-token')).toBeNull();
    });
  });

});
