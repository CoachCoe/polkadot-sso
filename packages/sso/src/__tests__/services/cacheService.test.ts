import { CacheService, CacheStrategies } from '../../services/cacheService';

const mockRedisClient = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(),
  expire: jest.fn(),
  ttl: jest.fn(),
  incr: jest.fn(),
  decr: jest.fn(),
  keys: jest.fn(),
  flushall: jest.fn(),
  info: jest.fn(),
  ping: jest.fn(),
  disconnect: jest.fn(),
  on: jest.fn(),
  connect: jest.fn(),
};

jest.mock('redis', () => ({
  createClient: jest.fn(() => mockRedisClient),
}));

describe('CacheService', () => {
  let cacheService: CacheService;

  beforeEach(() => {
    cacheService = new CacheService();
    jest.clearAllMocks();
  });

  describe('get', () => {
    it('should retrieve a value from cache', async () => {
      const key = 'test-key';
      const expectedValue = 'test-value';
      mockRedisClient.get.mockResolvedValue(expectedValue);

      const result = await cacheService.get(key);

      expect(result).toBe(expectedValue);
      expect(mockRedisClient.get).toHaveBeenCalledWith(key);
    });

    it('should return null for non-existent key', async () => {
      const key = 'non-existent-key';
      mockRedisClient.get.mockResolvedValue(null);

      const result = await cacheService.get(key);

      expect(result).toBeNull();
    });

    it('should handle JSON values', async () => {
      const key = 'json-key';
      const expectedValue = { name: 'test', value: 123 };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(expectedValue));

      const result = await cacheService.get(key, { parseJson: true });

      expect(result).toEqual(expectedValue);
    });
  });

  describe('set', () => {
    it('should set a value in cache', async () => {
      const key = 'test-key';
      const value = 'test-value';
      const ttl = 3600;
      mockRedisClient.set.mockResolvedValue('OK');

      const result = await cacheService.set(key, value, ttl);

      expect(result).toBe(true);
      expect(mockRedisClient.set).toHaveBeenCalledWith(key, value, { EX: ttl });
    });

    it('should set a value without TTL', async () => {
      const key = 'test-key';
      const value = 'test-value';
      mockRedisClient.set.mockResolvedValue('OK');

      const result = await cacheService.set(key, value);

      expect(result).toBe(true);
      expect(mockRedisClient.set).toHaveBeenCalledWith(key, value, {});
    });

    it('should handle JSON values', async () => {
      const key = 'json-key';
      const value = { name: 'test', value: 123 };
      mockRedisClient.set.mockResolvedValue('OK');

      const result = await cacheService.set(key, value, 3600, { stringifyJson: true });

      expect(result).toBe(true);
      expect(mockRedisClient.set).toHaveBeenCalledWith(key, JSON.stringify(value), { EX: 3600 });
    });
  });

  describe('delete', () => {
    it('should delete a key from cache', async () => {
      const key = 'test-key';
      mockRedisClient.del.mockResolvedValue(1);

      const result = await cacheService.delete(key);

      expect(result).toBe(true);
      expect(mockRedisClient.del).toHaveBeenCalledWith(key);
    });

    it('should return false for non-existent key', async () => {
      const key = 'non-existent-key';
      mockRedisClient.del.mockResolvedValue(0);

      const result = await cacheService.delete(key);

      expect(result).toBe(false);
    });
  });

  describe('exists', () => {
    it('should check if key exists', async () => {
      const key = 'test-key';
      mockRedisClient.exists.mockResolvedValue(1);

      const result = await cacheService.exists(key);

      expect(result).toBe(true);
      expect(mockRedisClient.exists).toHaveBeenCalledWith(key);
    });

    it('should return false for non-existent key', async () => {
      const key = 'non-existent-key';
      mockRedisClient.exists.mockResolvedValue(0);

      const result = await cacheService.exists(key);

      expect(result).toBe(false);
    });
  });

  describe('expire', () => {
    it('should set expiration for a key', async () => {
      const key = 'test-key';
      const ttl = 3600;
      mockRedisClient.expire.mockResolvedValue(true);

      const result = await cacheService.expire(key, ttl);

      expect(result).toBe(true);
      expect(mockRedisClient.expire).toHaveBeenCalledWith(key, ttl);
    });
  });

  describe('ttl', () => {
    it('should get TTL for a key', async () => {
      const key = 'test-key';
      const expectedTtl = 1800;
      mockRedisClient.ttl.mockResolvedValue(expectedTtl);

      const result = await cacheService.ttl(key);

      expect(result).toBe(expectedTtl);
      expect(mockRedisClient.ttl).toHaveBeenCalledWith(key);
    });
  });

  describe('increment', () => {
    it('should increment a counter', async () => {
      const key = 'counter-key';
      const expectedValue = 5;
      mockRedisClient.incr.mockResolvedValue(expectedValue);

      const result = await cacheService.increment(key);

      expect(result).toBe(expectedValue);
      expect(mockRedisClient.incr).toHaveBeenCalledWith(key);
    });
  });

  describe('decrement', () => {
    it('should decrement a counter', async () => {
      const key = 'counter-key';
      const expectedValue = 3;
      mockRedisClient.decr.mockResolvedValue(expectedValue);

      const result = await cacheService.decrement(key);

      expect(result).toBe(expectedValue);
      expect(mockRedisClient.decr).toHaveBeenCalledWith(key);
    });
  });

  describe('clearPattern', () => {
    it('should clear keys matching pattern', async () => {
      const pattern = 'test:*';
      const keys = ['test:1', 'test:2', 'test:3'];
      mockRedisClient.keys.mockResolvedValue(keys);
      mockRedisClient.del.mockResolvedValue(keys.length);

      const result = await cacheService.clearPattern(pattern);

      expect(result).toBe(keys.length);
      expect(mockRedisClient.keys).toHaveBeenCalledWith(pattern);
      expect(mockRedisClient.del).toHaveBeenCalledWith(...keys);
    });
  });

  describe('clearAll', () => {
    it('should clear all cache', async () => {
      mockRedisClient.flushall.mockResolvedValue('OK');

      const result = await cacheService.clearAll();

      expect(result).toBe(true);
      expect(mockRedisClient.flushall).toHaveBeenCalled();
    });
  });

  describe('getStats', () => {
    it('should return cache statistics', async () => {
      const mockInfo = {
        keyspace_hits: '1000',
        keyspace_misses: '100',
        used_memory: '1048576',
        connected_clients: '5',
      };
      mockRedisClient.info.mockResolvedValue(mockInfo);

      const stats = await cacheService.getStats();

      expect(stats).toBeDefined();
      expect(stats.hitRate).toBeDefined();
      expect(stats.memoryUsage).toBeDefined();
      expect(stats.connectedClients).toBeDefined();
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status when Redis is connected', async () => {
      mockRedisClient.ping.mockResolvedValue('PONG');

      const result = await cacheService.healthCheck();

      expect(result).toBe(true);
      expect(mockRedisClient.ping).toHaveBeenCalled();
    });

    it('should return unhealthy status when Redis is not connected', async () => {
      mockRedisClient.ping.mockRejectedValue(new Error('Connection failed'));

      const result = await cacheService.healthCheck();

      expect(result).toBe(false);
    });
  });
});

describe('CacheStrategies', () => {
  let cacheStrategies: CacheStrategies;
  let mockCacheService: jest.Mocked<CacheService>;

  beforeEach(() => {
    mockCacheService = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      exists: jest.fn(),
      expire: jest.fn(),
      ttl: jest.fn(),
      increment: jest.fn(),
      decrement: jest.fn(),
      clearPattern: jest.fn(),
      clearAll: jest.fn(),
      getStats: jest.fn(),
      healthCheck: jest.fn(),
      shutdown: jest.fn(),
    } as any;

    cacheStrategies = new CacheStrategies(mockCacheService);
    jest.clearAllMocks();
  });

  describe('getUserProfile', () => {
    it('should get user profile from cache', async () => {
      const address = 'test-address';
      const expectedProfile = { address, name: 'Test User' };
      mockCacheService.get.mockResolvedValue(JSON.stringify(expectedProfile));

      const result = await cacheStrategies.getUserProfile(address);

      expect(result).toEqual(expectedProfile);
      expect(mockCacheService.get).toHaveBeenCalledWith(`user:profile:${address}`, {
        parseJson: true,
      });
    });
  });

  describe('setUserProfile', () => {
    it('should set user profile in cache', async () => {
      const address = 'test-address';
      const profile = { address, name: 'Test User' };
      mockCacheService.set.mockResolvedValue(true);

      const result = await cacheStrategies.setUserProfile(address, profile);

      expect(result).toBe(true);
      expect(mockCacheService.set).toHaveBeenCalledWith(`user:profile:${address}`, profile, 3600, {
        stringifyJson: true,
      });
    });
  });

  describe('getSession', () => {
    it('should get session from cache', async () => {
      const sessionId = 'test-session';
      const expectedSession = { id: sessionId, user: 'test-user' };
      mockCacheService.get.mockResolvedValue(JSON.stringify(expectedSession));

      const result = await cacheStrategies.getSession(sessionId);

      expect(result).toEqual(expectedSession);
      expect(mockCacheService.get).toHaveBeenCalledWith(`session:${sessionId}`, {
        parseJson: true,
      });
    });
  });

  describe('setSession', () => {
    it('should set session in cache', async () => {
      const sessionId = 'test-session';
      const session = { id: sessionId, user: 'test-user' };
      mockCacheService.set.mockResolvedValue(true);

      const result = await cacheStrategies.setSession(sessionId, session);

      expect(result).toBe(true);
      expect(mockCacheService.set).toHaveBeenCalledWith(`session:${sessionId}`, session, 1800, {
        stringifyJson: true,
      });
    });
  });

  describe('getChallenge', () => {
    it('should get challenge from cache', async () => {
      const challengeId = 'test-challenge';
      const expectedChallenge = { id: challengeId, challenge: 'test' };
      mockCacheService.get.mockResolvedValue(JSON.stringify(expectedChallenge));

      const result = await cacheStrategies.getChallenge(challengeId);

      expect(result).toEqual(expectedChallenge);
      expect(mockCacheService.get).toHaveBeenCalledWith(`challenge:${challengeId}`, {
        parseJson: true,
      });
    });
  });

  describe('setChallenge', () => {
    it('should set challenge in cache', async () => {
      const challengeId = 'test-challenge';
      const challenge = { id: challengeId, challenge: 'test' };
      mockCacheService.set.mockResolvedValue(true);

      const result = await cacheStrategies.setChallenge(challengeId, challenge);

      expect(result).toBe(true);
      expect(mockCacheService.set).toHaveBeenCalledWith(
        `challenge:${challengeId}`,
        challenge,
        300,
        { stringifyJson: true }
      );
    });
  });
});
