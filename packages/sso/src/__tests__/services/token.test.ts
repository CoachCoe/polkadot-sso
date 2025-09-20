import jwt from 'jsonwebtoken';
import { TokenService } from '../../services/token';

// Mock the cache service
jest.mock('../../services/cacheService', () => ({
  getCacheStrategies: () => ({
    getSession: jest.fn(),
    setSession: jest.fn(),
    deleteSession: jest.fn(),
  }),
}));

// Mock the database
jest.mock('../../config/db', () => ({
  getDatabaseConnection: jest.fn(),
  releaseDatabaseConnection: jest.fn(),
}));

describe('TokenService', () => {
  let tokenService: TokenService;

  beforeEach(() => {
    tokenService = new TokenService();
  });

  describe('generateTokens', () => {
    it('should generate valid access and refresh tokens', () => {
      const address = 'test-address';
      const clientId = 'test-client';

      const result = tokenService.generateTokens(address, clientId);

      expect(result).toBeDefined();
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.fingerprint).toBeDefined();

      // Verify access token structure
      const decodedAccess = jwt.decode(result.accessToken) as any;
      expect(decodedAccess.address).toBe(address);
      expect(decodedAccess.clientId).toBe(clientId);

      // Verify refresh token structure
      const decodedRefresh = jwt.decode(result.refreshToken) as any;
      expect(decodedRefresh.address).toBe(address);
      expect(decodedRefresh.clientId).toBe(clientId);
    });

    it('should generate different tokens for different requests', () => {
      const address = 'test-address';
      const clientId = 'test-client';

      const result1 = tokenService.generateTokens(address, clientId);
      const result2 = tokenService.generateTokens(address, clientId);

      expect(result1.accessToken).not.toBe(result2.accessToken);
      expect(result1.refreshToken).not.toBe(result2.refreshToken);
    });

    it('should generate valid JWT tokens', () => {
      const address = 'test-address';
      const clientId = 'test-client';

      const result = tokenService.generateTokens(address, clientId);

      // Verify tokens are valid JWT format
      expect(() => jwt.decode(result.accessToken)).not.toThrow();
      expect(() => jwt.decode(result.refreshToken)).not.toThrow();

      const decodedAccess = jwt.decode(result.accessToken) as any;
      const decodedRefresh = jwt.decode(result.refreshToken) as any;

      expect(decodedAccess).toBeDefined();
      expect(decodedRefresh).toBeDefined();
      expect(typeof decodedAccess.exp).toBe('number');
      expect(typeof decodedRefresh.exp).toBe('number');
    });
  });
});
