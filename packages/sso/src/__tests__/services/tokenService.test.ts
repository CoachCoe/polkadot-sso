import { describe, expect, it } from 'vitest';
import { TokenService } from '../../services/token.js';

describe('TokenService', () => {
  let tokenService: TokenService;

  it('should create an instance', () => {
    tokenService = new TokenService();
    expect(tokenService).toBeDefined();
  });

  it('should have required methods', () => {
    tokenService = new TokenService();
    expect(typeof tokenService.verifyToken).toBe('function');
    expect(typeof tokenService.createSession).toBe('function');
    expect(typeof tokenService.invalidateSession).toBe('function');
    expect(typeof tokenService.refreshSession).toBe('function');
    expect(typeof tokenService.getSessionStats).toBe('function');
  });

  it('should handle verifyToken method without throwing', async () => {
    tokenService = new TokenService();

    // Should not throw even if JWT service is not available
    await expect(tokenService.verifyToken('invalid-token', 'access')).resolves.not.toThrow();
  });

  it('should handle createSession method without throwing', async () => {
    tokenService = new TokenService();

    // Should not throw even if JWT service is not available
    await expect(tokenService.createSession('5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY', 'test-client')).resolves.not.toThrow();
  });

  it('should handle invalidateSession method without throwing', async () => {
    tokenService = new TokenService();

    // Should not throw even if JWT service is not available
    await expect(tokenService.invalidateSession('invalid-token')).resolves.not.toThrow();
  });

  it('should handle refreshSession method without throwing', async () => {
    tokenService = new TokenService();

    // Should not throw even if JWT service is not available
    await expect(tokenService.refreshSession('invalid-token')).resolves.not.toThrow();
  });

  it('should handle getSessionStats method without throwing', async () => {
    tokenService = new TokenService();

    // Should not throw even if JWT service is not available
    await expect(tokenService.getSessionStats()).resolves.not.toThrow();
  });
});
