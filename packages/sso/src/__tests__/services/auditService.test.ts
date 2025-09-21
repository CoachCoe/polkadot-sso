import { describe, expect, it } from 'vitest';
import { AuditService } from '../../services/auditService.js';

describe('AuditService', () => {
  let auditService: AuditService;

  it('should create an instance', () => {
    auditService = new AuditService();
    expect(auditService).toBeDefined();
  });

  it('should have required methods', () => {
    auditService = new AuditService();
    expect(typeof auditService.log).toBe('function');
    expect(typeof auditService.getAuditLogs).toBe('function');
    expect(typeof auditService.getAuditStats).toBe('function');
    expect(typeof auditService.cleanupOldAuditLogs).toBe('function');
  });

  it('should handle log method without throwing', async () => {
    auditService = new AuditService();
    const mockEvent = {
      type: 'AUTH_ATTEMPT' as const,
      user_address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
      client_id: 'test-client',
      action: 'login',
      status: 'success' as const,
      details: { method: 'polkadot-js' },
      ip_address: '127.0.0.1',
      user_agent: 'Mozilla/5.0 (Test Browser)',
    };

    // Should not throw even if database is not available
    await expect(auditService.log(mockEvent)).resolves.not.toThrow();
  });

  it('should handle getAuditLogs method without throwing', async () => {
    auditService = new AuditService();

    // Should not throw even if database is not available
    await expect(auditService.getAuditLogs({})).resolves.not.toThrow();
  });

  it('should handle getAuditStats method without throwing', async () => {
    auditService = new AuditService();

    // Should not throw even if database is not available
    await expect(auditService.getAuditStats()).resolves.not.toThrow();
  });

  it('should handle cleanupOldAuditLogs method without throwing', async () => {
    auditService = new AuditService();

    // Should not throw even if database is not available
    await expect(auditService.cleanupOldAuditLogs(90)).resolves.not.toThrow();
  });
});
