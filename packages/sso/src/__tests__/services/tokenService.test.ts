import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TokenService } from '../../services/token.js';

// Mock the database connection
vi.mock('../../config/db.js', () => ({
  getDatabaseConnection: vi.fn(),
  releaseDatabaseConnection: vi.fn(),
}));

// Mock the JWT service
vi.mock('../../services/jwtService.js', () => ({
  jwtService: {
    generateTokenPair: vi.fn(),
    verifyAccessToken: vi.fn(),
    verifyRefreshToken: vi.fn(),
  },
}));

// Mock the cache service
vi.mock('../../services/cacheService.js', () => ({
  getCacheStrategies: vi.fn(() => ({
    getSession: vi.fn(),
    setSession: vi.fn(),
    deleteSession: vi.fn(),
  })),
}));

describe('TokenService', () => {
  let tokenService: TokenService;

  beforeEach(() => {
    tokenService = new TokenService();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('generateTokens', () => {
    it('should generate valid tokens for a session', () => {
      const address = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
      const clientId = 'test-client';

      const mockTokenPair = {
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        accessTokenExpiresAt: Date.now() + 900000,
        refreshTokenExpiresAt: Date.now() + 604800000,
      };

      vi.mocked(require('../../services/jwtService.js').jwtService.generateTokenPair).mockReturnValue(mockTokenPair);

      const tokens = tokenService.generateTokens(address, clientId);

      expect(tokens).toEqual(mockTokenPair);
      expect(require('../../services/jwtService.js').jwtService.generateTokenPair).toHaveBeenCalledWith({
        address,
        client_id: clientId,
      });
    });
  });

  describe('verifyToken', () => {
    it('should verify valid access token', async () => {
      const token = 'valid-access-token';
      const mockPayload = {
        sessionId: 'test-session-id',
        address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        clientId: 'test-client',
      };

      vi.mocked(require('../../services/jwtService.js').jwtService.verifyAccessToken).mockReturnValue(mockPayload);

      const mockDb = {
        get: vi.fn().mockResolvedValue({
          id: 'test-session-id',
          address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
          client_id: 'test-client',
          is_active: 1,
        }),
      };

      vi.mocked(require('../../config/db.js').getDatabaseConnection).mockResolvedValue(mockDb);

      const result = await tokenService.verifyToken(token, 'access');

      expect(result.valid).toBe(true);
      expect(result.session).toBeDefined();
      expect(result.session?.address).toBe('5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY');
    });

    it('should return invalid for expired token', async () => {
      const token = 'expired-token';

      vi.mocked(require('../../services/jwtService.js').jwtService.verifyAccessToken).mockImplementation(() => {
        throw new Error('Token expired');
      });

      const result = await tokenService.verifyToken(token, 'access');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Token expired');
    });

    it('should return invalid for inactive session', async () => {
      const token = 'valid-token';
      const mockPayload = {
        sessionId: 'test-session-id',
        address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        clientId: 'test-client',
      };

      vi.mocked(require('../../services/jwtService.js').jwtService.verifyAccessToken).mockReturnValue(mockPayload);

      const mockDb = {
        get: vi.fn().mockResolvedValue({
          id: 'test-session-id',
          address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
          client_id: 'test-client',
          is_active: 0, // Inactive session
        }),
      };

      vi.mocked(require('../../config/db.js').getDatabaseConnection).mockResolvedValue(mockDb);

      const result = await tokenService.verifyToken(token, 'access');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Session is not active');
    });
  });

  describe('createSession', () => {
    it('should create a new session', async () => {
      const address = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
      const clientId = 'test-client';

      const mockTokenPair = {
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        accessTokenExpiresAt: Date.now() + 900000,
        refreshTokenExpiresAt: Date.now() + 604800000,
      };

      vi.mocked(require('../../services/jwtService.js').jwtService.generateTokenPair).mockReturnValue(mockTokenPair);

      const mockDb = {
        run: vi.fn().mockResolvedValue({ lastInsertRowid: 1 }),
        get: vi.fn().mockResolvedValue({
          id: 1,
          address,
          client_id: clientId,
          access_token: mockTokenPair.accessToken,
          refresh_token: mockTokenPair.refreshToken,
          is_active: 1,
          created_at: Date.now(),
        }),
      };

      vi.mocked(require('../../config/db.js').getDatabaseConnection).mockResolvedValue(mockDb);

      const session = await tokenService.createSession(address, clientId);

      expect(session).toBeDefined();
      expect(session?.address).toBe(address);
      expect(session?.client_id).toBe(clientId);
      expect(session?.access_token).toBe(mockTokenPair.accessToken);
      expect(session?.refresh_token).toBe(mockTokenPair.refreshToken);
    });

    it('should handle database errors', async () => {
      const address = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
      const clientId = 'test-client';

      vi.mocked(require('../../config/db.js').getDatabaseConnection).mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(tokenService.createSession(address, clientId)).rejects.toThrow(
        'Database connection failed'
      );
    });
  });

  describe('invalidateSession', () => {
    it('should invalidate a session', async () => {
      const accessToken = 'valid-access-token';
      const mockPayload = {
        sessionId: 'test-session-id',
        address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        clientId: 'test-client',
      };

      vi.mocked(require('../../services/jwtService.js').jwtService.verifyAccessToken).mockReturnValue(mockPayload);

      const mockDb = {
        get: vi.fn().mockResolvedValue({
          id: 'test-session-id',
          address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
          client_id: 'test-client',
          is_active: 1,
        }),
        run: vi.fn().mockResolvedValue({ changes: 1 }),
      };

      vi.mocked(require('../../config/db.js').getDatabaseConnection).mockResolvedValue(mockDb);

      const result = await tokenService.invalidateSession(accessToken);

      expect(result).toBe(true);
      expect(mockDb.run).toHaveBeenCalledWith(
        'UPDATE sessions SET is_active = 0 WHERE id = ?',
        ['test-session-id']
      );
    });

    it('should return false for invalid token', async () => {
      const accessToken = 'invalid-token';

      vi.mocked(require('../../services/jwtService.js').jwtService.verifyAccessToken).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const result = await tokenService.invalidateSession(accessToken);

      expect(result).toBe(false);
    });
  });

  describe('refreshSession', () => {
    it('should refresh a session with new tokens', async () => {
      const refreshToken = 'valid-refresh-token';
      const mockPayload = {
        sessionId: 'test-session-id',
        address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        clientId: 'test-client',
      };

      vi.mocked(require('../../services/jwtService.js').jwtService.verifyRefreshToken).mockReturnValue(mockPayload);

      const mockTokenPair = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        accessTokenExpiresAt: Date.now() + 900000,
        refreshTokenExpiresAt: Date.now() + 604800000,
      };

      vi.mocked(require('../../services/jwtService.js').jwtService.generateTokenPair).mockReturnValue(mockTokenPair);

      const mockDb = {
        get: vi.fn().mockResolvedValue({
          id: 'test-session-id',
          address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
          client_id: 'test-client',
          is_active: 1,
        }),
        run: vi.fn().mockResolvedValue({ changes: 1 }),
        get: vi.fn().mockResolvedValue({
          id: 'test-session-id',
          address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
          client_id: 'test-client',
          access_token: mockTokenPair.accessToken,
          refresh_token: mockTokenPair.refreshToken,
          is_active: 1,
        }),
      };

      vi.mocked(require('../../config/db.js').getDatabaseConnection).mockResolvedValue(mockDb);

      const session = await tokenService.refreshSession(refreshToken);

      expect(session).toBeDefined();
      expect(session?.access_token).toBe(mockTokenPair.accessToken);
      expect(session?.refresh_token).toBe(mockTokenPair.refreshToken);
    });

    it('should return null for invalid refresh token', async () => {
      const refreshToken = 'invalid-refresh-token';

      vi.mocked(require('../../services/jwtService.js').jwtService.verifyRefreshToken).mockImplementation(() => {
        throw new Error('Invalid refresh token');
      });

      const session = await tokenService.refreshSession(refreshToken);

      expect(session).toBeNull();
    });
  });

  describe('getSessionStats', () => {
    it('should return session statistics', async () => {
      const mockDb = {
        get: vi.fn()
          .mockResolvedValueOnce({ count: 15 }) // active
          .mockResolvedValueOnce({ count: 25 }), // total
      };

      vi.mocked(require('../../config/db.js').getDatabaseConnection).mockResolvedValue(mockDb);

      const stats = await tokenService.getSessionStats();

      expect(stats).toEqual({
        active: 15,
        total: 25,
      });
    });
  });
});
