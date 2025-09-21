import { describe, expect, it } from 'vitest';
import { ChallengeService } from '../../services/challengeService.js';

describe('ChallengeService', () => {
  let challengeService: ChallengeService;

  it('should create an instance', () => {
    challengeService = new ChallengeService();
    expect(challengeService).toBeDefined();
  });

  it('should have required methods', () => {
    challengeService = new ChallengeService();
    expect(typeof challengeService.generateChallenge).toBe('function');
    expect(typeof challengeService.getChallenge).toBe('function');
    expect(typeof challengeService.markChallengeUsed).toBe('function');
    expect(typeof challengeService.cleanupExpiredChallenges).toBe('function');
  });

  it('should handle generateChallenge method without throwing', async () => {
    challengeService = new ChallengeService();

    // Should not throw even if database is not available
    await expect(challengeService.generateChallenge('test-client', '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY')).resolves.not.toThrow();
  });

  it('should handle getChallenge method without throwing', async () => {
    challengeService = new ChallengeService();

    // Should not throw even if database is not available
    await expect(challengeService.getChallenge('invalid-challenge-id')).resolves.not.toThrow();
  });

  it('should handle markChallengeUsed method without throwing', async () => {
    challengeService = new ChallengeService();

    // Should not throw even if database is not available
    await expect(challengeService.markChallengeUsed('invalid-challenge-id')).resolves.not.toThrow();
  });

  it('should handle cleanupExpiredChallenges method without throwing', async () => {
    challengeService = new ChallengeService();

    // Should not throw even if database is not available
    await expect(challengeService.cleanupExpiredChallenges()).resolves.not.toThrow();
  });
});
