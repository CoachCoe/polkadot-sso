import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChallengeService } from '../../services/challengeService.js';

// Mock the database connection
vi.mock('../../config/db.js', () => ({
  getDatabaseConnection: vi.fn(),
  releaseDatabaseConnection: vi.fn(),
}));

// Mock the cache service
vi.mock('../../services/cacheService.js', () => ({
  getCacheStrategies: vi.fn(() => ({
    getChallenge: vi.fn(),
    setChallenge: vi.fn(),
    deleteChallenge: vi.fn(),
  })),
}));

describe('ChallengeService', () => {
  let challengeService: ChallengeService;

  beforeEach(() => {
    challengeService = new ChallengeService();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('generateCodeVerifier', () => {
    it('should generate a valid code verifier', () => {
      const verifier = challengeService.generateCodeVerifier();

      expect(verifier).toBeDefined();
      expect(typeof verifier).toBe('string');
      expect(verifier.length).toBeGreaterThan(0);
    });

    it('should generate different verifiers on each call', () => {
      const verifier1 = challengeService.generateCodeVerifier();
      const verifier2 = challengeService.generateCodeVerifier();

      expect(verifier1).not.toBe(verifier2);
    });
  });

  describe('generateCodeChallenge', () => {
    it('should generate a valid code challenge', async () => {
      const verifier = 'test-verifier';
      const challenge = await challengeService.generateCodeChallenge(verifier);

      expect(challenge).toBeDefined();
      expect(typeof challenge).toBe('string');
      expect(challenge.length).toBeGreaterThan(0);
    });

    it('should generate different challenges for different verifiers', async () => {
      const verifier1 = 'test-verifier-1';
      const verifier2 = 'test-verifier-2';

      const challenge1 = await challengeService.generateCodeChallenge(verifier1);
      const challenge2 = await challengeService.generateCodeChallenge(verifier2);

      expect(challenge1).not.toBe(challenge2);
    });
  });

  describe('generateChallengeMessage', () => {
    it('should generate a valid challenge message', () => {
      const clientId = 'test-client';
      const address = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
      const challengeId = 'test-challenge-id';
      const codeChallenge = 'test-code-challenge';
      const state = 'test-state';

      const message = challengeService.generateChallengeMessage(
        clientId,
        address,
        challengeId,
        codeChallenge,
        state
      );

      expect(message).toBeDefined();
      expect(typeof message).toBe('string');
      expect(message).toContain(address);
      expect(message).toContain(challengeId);
      expect(message).toContain(codeChallenge);
      expect(message).toContain(state);
    });

    it('should include all required fields in the message', () => {
      const clientId = 'test-client';
      const address = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
      const challengeId = 'test-challenge-id';
      const codeChallenge = 'test-code-challenge';
      const state = 'test-state';

      const message = challengeService.generateChallengeMessage(
        clientId,
        address,
        challengeId,
        codeChallenge,
        state
      );

      expect(message).toContain(`Client: ${clientId}`);
      expect(message).toContain(`Address: ${address}`);
      expect(message).toContain(`Challenge ID: ${challengeId}`);
      expect(message).toContain(`Code Challenge: ${codeChallenge}`);
      expect(message).toContain(`State: ${state}`);
    });
  });

  describe('generateChallenge', () => {
    it('should generate a complete challenge', async () => {
      const clientId = 'test-client';
      const address = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';

      // Mock database operations
      const mockDb = {
        run: vi.fn().mockResolvedValue({ lastInsertRowid: 1 }),
        get: vi.fn().mockResolvedValue({ id: 'test-challenge-id' }),
      };

      vi.mocked(require('../../config/db.js').getDatabaseConnection).mockResolvedValue(mockDb);

      const challenge = await challengeService.generateChallenge(clientId, address);

      expect(challenge).toBeDefined();
      expect(challenge).toHaveProperty('id');
      expect(challenge).toHaveProperty('client_id', clientId);
      expect(challenge).toHaveProperty('user_address', address);
      expect(challenge).toHaveProperty('message');
      expect(challenge).toHaveProperty('code_verifier');
      expect(challenge).toHaveProperty('code_challenge');
      expect(challenge).toHaveProperty('state');
      expect(challenge).toHaveProperty('expires_at');
      expect(challenge).toHaveProperty('used', false);
    });

    it('should handle database errors gracefully', async () => {
      const clientId = 'test-client';
      const address = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';

      // Mock database error
      vi.mocked(require('../../config/db.js').getDatabaseConnection).mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(challengeService.generateChallenge(clientId, address)).rejects.toThrow(
        'Database connection failed'
      );
    });
  });

  describe('getChallenge', () => {
    it('should retrieve a challenge from cache first', async () => {
      const challengeId = 'test-challenge-id';
      const mockChallenge = {
        id: challengeId,
        client_id: 'test-client',
        user_address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        message: 'test-message',
        code_verifier: 'test-verifier',
        code_challenge: 'test-challenge',
        state: 'test-state',
        expires_at: Date.now() + 300000,
        used: false,
      };

      const mockCache = {
        getChallenge: vi.fn().mockResolvedValue(mockChallenge),
        setChallenge: vi.fn(),
        deleteChallenge: vi.fn(),
      };

      vi.mocked(require('../../services/cacheService.js').getCacheStrategies).mockReturnValue(mockCache);

      const challenge = await challengeService.getChallenge(challengeId);

      expect(challenge).toEqual(mockChallenge);
      expect(mockCache.getChallenge).toHaveBeenCalledWith(challengeId);
    });

    it('should fallback to database if not in cache', async () => {
      const challengeId = 'test-challenge-id';
      const mockChallenge = {
        id: challengeId,
        client_id: 'test-client',
        user_address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        message: 'test-message',
        code_verifier: 'test-verifier',
        code_challenge: 'test-challenge',
        state: 'test-state',
        expires_at: Date.now() + 300000,
        used: false,
      };

      const mockCache = {
        getChallenge: vi.fn().mockResolvedValue(null),
        setChallenge: vi.fn(),
        deleteChallenge: vi.fn(),
      };

      const mockDb = {
        get: vi.fn().mockResolvedValue(mockChallenge),
      };

      vi.mocked(require('../../services/cacheService.js').getCacheStrategies).mockReturnValue(mockCache);
      vi.mocked(require('../../config/db.js').getDatabaseConnection).mockResolvedValue(mockDb);

      const challenge = await challengeService.getChallenge(challengeId);

      expect(challenge).toEqual(mockChallenge);
      expect(mockDb.get).toHaveBeenCalledWith(
        'SELECT * FROM challenges WHERE id = ?',
        [challengeId]
      );
    });

    it('should return null if challenge not found', async () => {
      const challengeId = 'non-existent-challenge';

      const mockCache = {
        getChallenge: vi.fn().mockResolvedValue(null),
        setChallenge: vi.fn(),
        deleteChallenge: vi.fn(),
      };

      const mockDb = {
        get: vi.fn().mockResolvedValue(null),
      };

      vi.mocked(require('../../services/cacheService.js').getCacheStrategies).mockReturnValue(mockCache);
      vi.mocked(require('../../config/db.js').getDatabaseConnection).mockResolvedValue(mockDb);

      const challenge = await challengeService.getChallenge(challengeId);

      expect(challenge).toBeNull();
    });
  });

  describe('markChallengeUsed', () => {
    it('should mark a challenge as used', async () => {
      const challengeId = 'test-challenge-id';

      const mockDb = {
        run: vi.fn().mockResolvedValue({ changes: 1 }),
      };

      vi.mocked(require('../../config/db.js').getDatabaseConnection).mockResolvedValue(mockDb);

      const result = await challengeService.markChallengeUsed(challengeId);

      expect(result).toBe(true);
      expect(mockDb.run).toHaveBeenCalledWith(
        'UPDATE challenges SET used = 1 WHERE id = ?',
        [challengeId]
      );
    });

    it('should return false if challenge not found', async () => {
      const challengeId = 'non-existent-challenge';

      const mockDb = {
        run: vi.fn().mockResolvedValue({ changes: 0 }),
      };

      vi.mocked(require('../../config/db.js').getDatabaseConnection).mockResolvedValue(mockDb);

      const result = await challengeService.markChallengeUsed(challengeId);

      expect(result).toBe(false);
    });
  });

  describe('cleanupExpiredChallenges', () => {
    it('should clean up expired challenges', async () => {
      const mockDb = {
        run: vi.fn().mockResolvedValue({ changes: 5 }),
      };

      vi.mocked(require('../../config/db.js').getDatabaseConnection).mockResolvedValue(mockDb);

      const result = await challengeService.cleanupExpiredChallenges();

      expect(result).toBe(5);
      expect(mockDb.run).toHaveBeenCalledWith(
        'DELETE FROM challenges WHERE expires_at < ?',
        [expect.any(Number)]
      );
    });
  });

  describe('getChallengeStats', () => {
    it('should return challenge statistics', async () => {
      const mockDb = {
        get: vi.fn()
          .mockResolvedValueOnce({ count: 10 }) // active
          .mockResolvedValueOnce({ count: 3 })  // expired
          .mockResolvedValueOnce({ count: 7 }), // used
      };

      vi.mocked(require('../../config/db.js').getDatabaseConnection).mockResolvedValue(mockDb);

      const stats = await challengeService.getChallengeStats();

      expect(stats).toEqual({
        active: 10,
        expired: 3,
        used: 7,
      });
    });
  });
});
