import jwt from 'jsonwebtoken';
import { getCacheStrategies } from '../../services/cacheService';
import { TokenService } from '../../services/token';

// Mock the cache service
jest.mock('../../services/cacheService');
jest.mock('../../config/db');

const mockCacheStrategies = {
  getSession: jest.fn(),
  setSession: jest.fn(),
  deleteSession: jest.fn(),
};

(getCacheStrategies as jest.Mock).mockReturnValue(mockCacheStrategies);

describe('TokenService', () => {
  let tokenService: TokenService;

  beforeEach(() => {
    tokenService = new TokenService();
    jest.clearAllMocks();

    // Set up JWT secret for testing
    process.env.JWT_SECRET = 'test-secret-key-for-testing-only';
  });

  describe('generateTokens', () => {
    it('should generate valid access and refresh tokens', () => {
      const address = 'test-address';
      const clientId = 'test-client';

      const result = tokenService.generateTokens(address, clientId);

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.fingerprint).toBeDefined();

      // Verify tokens can be decoded
      const decodedAccess = jwt.verify(result.accessToken, process.env.JWT_SECRET!) as any;
      const decodedRefresh = jwt.verify(result.refreshToken, process.env.JWT_SECRET!) as any;

      expect(decodedAccess.address).toBe(address);
      expect(decodedAccess.client_id).toBe(clientId);
      expect(decodedAccess.type).toBe('access');
      expect(decodedRefresh.type).toBe('refresh');
    });

    it('should generate different fingerprints for different requests', () => {
      const address = 'test-address';
      const clientId = 'test-client';

      const result1 = tokenService.generateTokens(address, clientId);
      const result2 = tokenService.generateTokens(address, clientId);

      expect(result1.fingerprint).not.toBe(result2.fingerprint);
    });
  });

  describe('verifyToken', () => {
    it('should verify valid access token', async () => {
      const address = 'test-address';
      const clientId = 'test-client';
      const { accessToken } = tokenService.generateTokens(address, clientId);

      const result = await tokenService.verifyToken(accessToken, 'access');

      expect(result).toBeDefined();
      expect(result?.address).toBe(address);
      expect(result?.client_id).toBe(clientId);
      expect(result?.type).toBe('access');
    });

    it('should verify valid refresh token', async () => {
      const address = 'test-address';
      const clientId = 'test-client';
      const { refreshToken } = tokenService.generateTokens(address, clientId);

      const result = await tokenService.verifyToken(refreshToken, 'refresh');

      expect(result).toBeDefined();
      expect(result?.address).toBe(address);
      expect(result?.client_id).toBe(clientId);
      expect(result?.type).toBe('refresh');
    });

    it('should return null for invalid token', async () => {
      const result = await tokenService.verifyToken('invalid-token', 'access');
      expect(result).toBeNull();
    });

    it('should return null for expired token', async () => {
      const expiredToken = jwt.sign(
        {
          address: 'test',
          client_id: 'test',
          type: 'access',
          exp: Math.floor(Date.now() / 1000) - 3600,
        },
        process.env.JWT_SECRET!
      );

      const result = await tokenService.verifyToken(expiredToken, 'access');
      expect(result).toBeNull();
    });

    it('should return null for wrong token type', async () => {
      const address = 'test-address';
      const clientId = 'test-client';
      const { accessToken } = tokenService.generateTokens(address, clientId);

      const result = await tokenService.verifyToken(accessToken, 'refresh');
      expect(result).toBeNull();
    });
  });

  describe('createSession', () => {
    it('should create a new session', async () => {
      const address = 'test-address';
      const clientId = 'test-client';
      const { accessToken, refreshToken } = tokenService.generateTokens(address, clientId);

      const result = await tokenService.createSession(address, clientId, accessToken, refreshToken);

      expect(result).toBeDefined();
      expect(result?.address).toBe(address);
      expect(result?.client_id).toBe(clientId);
      expect(result?.access_token).toBe(accessToken);
      expect(result?.refresh_token).toBe(refreshToken);
      expect(result?.is_active).toBe(true);
    });
  });

  describe('invalidateSession', () => {
    it('should invalidate an existing session', async () => {
      const address = 'test-address';
      const clientId = 'test-client';

      const result = await tokenService.invalidateSession(address, clientId);

      expect(result).toBe(true);
    });
  });

  describe('refreshSession', () => {
    it('should refresh a session with new tokens', async () => {
      const address = 'test-address';
      const clientId = 'test-client';
      const { refreshToken } = tokenService.generateTokens(address, clientId);

      const result = await tokenService.refreshSession(refreshToken);

      expect(result).toBeDefined();
      expect(result?.accessToken).toBeDefined();
      expect(result?.refreshToken).toBeDefined();
      expect(result?.fingerprint).toBeDefined();
    });

    it('should return null for invalid refresh token', async () => {
      const result = await tokenService.refreshSession('invalid-token');
      expect(result).toBeNull();
    });
  });

  describe('getSessionStats', () => {
    it('should return session statistics', async () => {
      const stats = await tokenService.getSessionStats();

      expect(stats).toBeDefined();
      expect(typeof stats.totalSessions).toBe('number');
      expect(typeof stats.activeSessions).toBe('number');
      expect(typeof stats.inactiveSessions).toBe('number');
    });
  });
});
