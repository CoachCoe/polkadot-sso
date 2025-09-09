import jwt from 'jsonwebtoken';
import { getCacheStrategies } from '../../services/cacheService';
import { TokenService } from '../../services/token';

jest.mock('../../services/cacheService');
jest.mock('../../config/db');

const mockCacheStrategies = {
  getSession: jest.fn(),
  setSession: jest.fn(),
  deleteSession: jest.fn(),
};

const mockDb = {
  get: jest.fn(),
  run: jest.fn(),
};

(getCacheStrategies as jest.Mock).mockReturnValue(mockCacheStrategies);

const mockGetDatabaseConnection = jest.fn();
const mockReleaseDatabaseConnection = jest.fn();

jest.doMock('../../config/db', () => ({
  getDatabaseConnection: mockGetDatabaseConnection,
  releaseDatabaseConnection: mockReleaseDatabaseConnection,
}));

describe('TokenService', () => {
  let tokenService: TokenService;

  beforeEach(() => {
    tokenService = new TokenService();
    jest.clearAllMocks();

    process.env.JWT_SECRET = 'test-secret-key-for-testing-only';

    mockGetDatabaseConnection.mockResolvedValue(mockDb);
    mockReleaseDatabaseConnection.mockResolvedValue(undefined);
  });

  describe('generateTokens', () => {
    it('should generate valid access and refresh tokens', () => {
      const address = 'test-address';
      const clientId = 'test-client';

      const result = tokenService.generateTokens(address, clientId);

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.fingerprint).toBeDefined();
      expect(result.accessJwtid).toBeDefined();
      expect(result.refreshJwtid).toBeDefined();

      const decodedAccess = jwt.verify(result.accessToken, process.env.JWT_ACCESS_SECRET!) as any;
      const decodedRefresh = jwt.verify(
        result.refreshToken,
        process.env.JWT_REFRESH_SECRET!
      ) as any;

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

      const mockSession = {
        id: 'test-session-id',
        address,
        client_id: clientId,
        access_token: accessToken,
        refresh_token: 'test-refresh-token',
        access_token_id: 'test-access-id',
        refresh_token_id: 'test-refresh-id',
        fingerprint: 'test-fingerprint',
        access_token_expires_at: Date.now() + 3600000,
        refresh_token_expires_at: Date.now() + 86400000,
        created_at: Date.now(),
        last_used_at: Date.now(),
        is_active: true,
      };

      mockCacheStrategies.getSession.mockResolvedValue(mockSession);

      const result = await tokenService.verifyToken(accessToken, 'access');

      expect(result.valid).toBe(true);
      expect(result.decoded?.address).toBe(address);
      expect(result.decoded?.clientId).toBe(clientId);
      expect(result.decoded?.sub).toBe(address);
    });

    it('should verify valid refresh token', async () => {
      const address = 'test-address';
      const clientId = 'test-client';
      const { refreshToken } = tokenService.generateTokens(address, clientId);

      const mockSession = {
        id: 'test-session-id',
        address,
        client_id: clientId,
        access_token: 'test-access-token',
        refresh_token: refreshToken,
        access_token_id: 'test-access-id',
        refresh_token_id: 'test-refresh-id',
        fingerprint: 'test-fingerprint',
        access_token_expires_at: Date.now() + 3600000,
        refresh_token_expires_at: Date.now() + 86400000,
        created_at: Date.now(),
        last_used_at: Date.now(),
        is_active: true,
      };

      mockCacheStrategies.getSession.mockResolvedValue(mockSession);

      const result = await tokenService.verifyToken(refreshToken, 'refresh');

      expect(result.valid).toBe(true);
      expect(result.decoded?.address).toBe(address);
      expect(result.decoded?.clientId).toBe(clientId);
      expect(result.decoded?.sub).toBe(address);
    });

    it('should return invalid result for invalid token', async () => {
      const result = await tokenService.verifyToken('invalid-token', 'access');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should return invalid result for expired token', async () => {
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
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should return invalid result for wrong token type', async () => {
      const address = 'test-address';
      const clientId = 'test-client';
      const { accessToken } = tokenService.generateTokens(address, clientId);

      const result = await tokenService.verifyToken(accessToken, 'refresh');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('createSession', () => {
    it('should create a new session', async () => {
      const address = 'test-address';
      const clientId = 'test-client';

      mockDb.run.mockResolvedValue({} as any);

      const result = await tokenService.createSession(address, clientId);

      expect(result).toBeDefined();
      expect(result?.address).toBe(address);
      expect(result?.client_id).toBe(clientId);
      expect(result?.access_token).toBeDefined();
      expect(result?.refresh_token).toBeDefined();
      expect(result?.is_active).toBe(true);
    });
  });

  describe('invalidateSession', () => {
    it('should invalidate an existing session', async () => {
      const accessToken = 'test-access-token';
      const mockSession = {
        id: 'test-session-id',
        address: 'test-address',
        client_id: 'test-client',
        access_token: accessToken,
        refresh_token: 'test-refresh-token',
        access_token_id: 'test-access-id',
        refresh_token_id: 'test-refresh-id',
        fingerprint: 'test-fingerprint',
        access_token_expires_at: Date.now() + 3600000,
        refresh_token_expires_at: Date.now() + 86400000,
        created_at: Date.now(),
        last_used_at: Date.now(),
        is_active: true,
      };

      mockCacheStrategies.getSession.mockResolvedValue(mockSession);
      mockDb.run.mockResolvedValue({} as any);

      const result = await tokenService.invalidateSession(accessToken);

      expect(result).toBe(true);
    });
  });

  describe('refreshSession', () => {
    it('should refresh a session with new tokens', async () => {
      const address = 'test-address';
      const clientId = 'test-client';
      const { refreshToken } = tokenService.generateTokens(address, clientId);

      const mockSession = {
        id: 'test-session-id',
        address,
        client_id: clientId,
        access_token: 'old-access-token',
        refresh_token: refreshToken,
        access_token_id: 'old-access-id',
        refresh_token_id: 'old-refresh-id',
        fingerprint: 'old-fingerprint',
        access_token_expires_at: Date.now() - 1000,
        refresh_token_expires_at: Date.now() + 86400000,
        created_at: Date.now() - 86400000,
        last_used_at: Date.now() - 1000,
        is_active: true,
      };

      mockCacheStrategies.getSession.mockResolvedValue(mockSession);
      mockDb.run.mockResolvedValue({} as any);

      const result = await tokenService.refreshSession(refreshToken);

      expect(result).toBeDefined();
      expect(result?.access_token).toBeDefined();
      expect(result?.refresh_token).toBeDefined();
      expect(result?.fingerprint).toBeDefined();
    });

    it('should return null for invalid refresh token', async () => {
      const result = await tokenService.refreshSession('invalid-token');
      expect(result).toBeNull();
    });
  });

  describe('getSessionStats', () => {
    it('should return session statistics', async () => {
      mockDb.get.mockResolvedValueOnce({ count: 5 }).mockResolvedValueOnce({ count: 10 });

      const stats = await tokenService.getSessionStats();

      expect(stats).toBeDefined();
      expect(typeof stats.active).toBe('number');
      expect(typeof stats.total).toBe('number');
    });
  });
});
