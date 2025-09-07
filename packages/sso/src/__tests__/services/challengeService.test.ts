import { getCacheStrategies } from '../../services/cacheService';
import { ChallengeService } from '../../services/challengeService';

jest.mock('../../services/cacheService');
jest.mock('../../config/db');

const mockCacheStrategies = {
  getChallenge: jest.fn(),
  setChallenge: jest.fn(),
  deleteChallenge: jest.fn(),
};

(getCacheStrategies as jest.Mock).mockReturnValue(mockCacheStrategies);

describe('ChallengeService', () => {
  let challengeService: ChallengeService;

  beforeEach(() => {
    challengeService = new ChallengeService();
    jest.clearAllMocks();
  });

  describe('generateChallenge', () => {
    it('should generate a valid challenge', async () => {
      const clientId = 'test-client';
      const userAddress = 'test-address';

      const challenge = await challengeService.generateChallenge(clientId, userAddress);

      expect(challenge).toBeDefined();
      expect(challenge.id).toBeDefined();
      expect(challenge.client_id).toBe(clientId);
      expect(challenge.client_id).toBe(clientId);
      expect(challenge.message).toBeDefined();
      expect(challenge.expires_at).toBeDefined();
      expect(challenge.used).toBe(false);
      expect(challenge.created_at).toBeDefined();
    });

    it('should generate challenge without user address', async () => {
      const clientId = 'test-client';

      const challenge = await challengeService.generateChallenge(clientId);

      expect(challenge).toBeDefined();
      expect(challenge.client_id).toBe(clientId);
      expect(challenge.client_id).toBe(clientId);
    });

    it('should generate unique challenges for different requests', async () => {
      const clientId = 'test-client';

      const challenge1 = await challengeService.generateChallenge(clientId);
      const challenge2 = await challengeService.generateChallenge(clientId);

      expect(challenge1.id).not.toBe(challenge2.id);
      expect(challenge1.message).not.toBe(challenge2.message);
    });

    it('should set expiration time correctly', async () => {
      const clientId = 'test-client';
      const now = Date.now();

      const challenge = await challengeService.generateChallenge(clientId);
      const expiresAt = new Date(challenge.expires_at).getTime();

      // Should expire in 5 minutes (300000 ms)
      expect(expiresAt).toBeGreaterThan(now + 290000); // Allow 10 second tolerance
      expect(expiresAt).toBeLessThan(now + 310000);
    });
  });

  describe('getChallenge', () => {
    it('should retrieve a valid challenge', async () => {
      const challengeId = 'test-challenge-id';
      const mockChallenge = {
        id: challengeId,
        client_id: 'test-client',
        user_address: 'test-address',
        challenge: 'test-challenge',
        expires_at: new Date(Date.now() + 300000).toISOString(),
        is_used: false,
        created_at: new Date().toISOString(),
      };

      mockCacheStrategies.getChallenge.mockResolvedValue(mockChallenge);

      const result = await challengeService.getChallenge(challengeId);

      expect(result).toBeDefined();
      expect(result?.id).toBe(challengeId);
      expect(mockCacheStrategies.getChallenge).toHaveBeenCalledWith(challengeId);
    });

    it('should return null for non-existent challenge', async () => {
      const challengeId = 'non-existent-id';

      mockCacheStrategies.getChallenge.mockResolvedValue(null);

      const result = await challengeService.getChallenge(challengeId);

      expect(result).toBeNull();
    });

    it('should return null for expired challenge', async () => {
      const challengeId = 'expired-challenge-id';
      const expiredChallenge = {
        id: challengeId,
        client_id: 'test-client',
        user_address: 'test-address',
        challenge: 'test-challenge',
        expires_at: new Date(Date.now() - 1000).toISOString(), // Expired
        is_used: false,
        created_at: new Date().toISOString(),
      };

      mockCacheStrategies.getChallenge.mockResolvedValue(expiredChallenge);

      const result = await challengeService.getChallenge(challengeId);

      expect(result).toBeNull();
    });

    it('should return null for used challenge', async () => {
      const challengeId = 'used-challenge-id';
      const usedChallenge = {
        id: challengeId,
        client_id: 'test-client',
        user_address: 'test-address',
        challenge: 'test-challenge',
        expires_at: new Date(Date.now() + 300000).toISOString(),
        is_used: true, // Already used
        created_at: new Date().toISOString(),
      };

      mockCacheStrategies.getChallenge.mockResolvedValue(usedChallenge);

      const result = await challengeService.getChallenge(challengeId);

      expect(result).toBeNull();
    });
  });

  describe('markChallengeUsed', () => {
    it('should mark challenge as used', async () => {
      const challengeId = 'test-challenge-id';

      const result = await challengeService.markChallengeUsed(challengeId);

      expect(result).toBe(true);
      expect(mockCacheStrategies.deleteChallenge).toHaveBeenCalledWith(challengeId);
    });
  });

  describe('cleanupExpiredChallenges', () => {
    it('should cleanup expired challenges', async () => {
      const result = await challengeService.cleanupExpiredChallenges();

      expect(result).toBeDefined();
      expect(typeof result).toBe('number');
    });
  });

  describe('getChallengeStats', () => {
    it('should return challenge statistics', async () => {
      const stats = await challengeService.getChallengeStats();

      expect(stats).toBeDefined();
      expect(typeof stats.total).toBe('number');
      expect(typeof stats.active).toBe('number');
      expect(typeof stats.used).toBe('number');
      expect(typeof stats.expired).toBe('number');
    });
  });
});
