import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuditService } from '../../services/auditService.js';
import { AuditEvent } from '../../types/audit.js';

// Mock the database connection
vi.mock('../../config/db.js', () => ({
  getDatabaseConnection: vi.fn(),
  releaseDatabaseConnection: vi.fn(),
}));

describe('AuditService', () => {
  let auditService: AuditService;

  beforeEach(() => {
    auditService = new AuditService();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('log', () => {
    it('should log an audit event successfully', async () => {
      const mockEvent: AuditEvent = {
        type: 'AUTH_ATTEMPT',
        user_address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        client_id: 'test-client',
        action: 'login',
        status: 'success',
        details: { method: 'polkadot-js' },
        ip_address: '127.0.0.1',
        user_agent: 'Mozilla/5.0 (Test Browser)',
      };

      const mockDb = {
        run: vi.fn().mockResolvedValue({ lastInsertRowid: 1 }),
      };

      vi.mocked(require('../../config/db.js').getDatabaseConnection).mockResolvedValue(mockDb);

      await auditService.log(mockEvent);

      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO audit_logs'),
        expect.arrayContaining([
          mockEvent.type,
          mockEvent.user_address,
          mockEvent.client_id,
          mockEvent.action,
          mockEvent.status,
          JSON.stringify(mockEvent.details),
          mockEvent.ip_address,
          mockEvent.user_agent,
        ])
      );
    });

    it('should handle database errors gracefully', async () => {
      const mockEvent: AuditEvent = {
        type: 'AUTH_ATTEMPT',
        user_address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        client_id: 'test-client',
        action: 'login',
        status: 'success',
        details: { method: 'polkadot-js' },
        ip_address: '127.0.0.1',
        user_agent: 'Mozilla/5.0 (Test Browser)',
      };

      vi.mocked(require('../../config/db.js').getDatabaseConnection).mockRejectedValue(
        new Error('Database connection failed')
      );

      // Should not throw error
      await expect(auditService.log(mockEvent)).resolves.not.toThrow();
    });
  });

  describe('getAuditLogs', () => {
    it('should retrieve audit logs with filters', async () => {
      const mockLogs = [
        {
          id: 1,
          type: 'AUTH_ATTEMPT',
          user_address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
          client_id: 'test-client',
          action: 'login',
          status: 'success',
          details: '{"method":"polkadot-js"}',
          ip_address: '127.0.0.1',
          user_agent: 'Mozilla/5.0 (Test Browser)',
          created_at: Date.now(),
        },
      ];

      const mockDb = {
        all: vi.fn().mockResolvedValue(mockLogs),
      };

      vi.mocked(require('../../config/db.js').getDatabaseConnection).mockResolvedValue(mockDb);

      const filters = {
        user_address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        type: 'AUTH_ATTEMPT',
        status: 'success',
        limit: 10,
        offset: 0,
      };

      const logs = await auditService.getAuditLogs(filters);

      expect(logs).toHaveLength(1);
      expect(logs[0]).toMatchObject({
        id: 1,
        type: 'AUTH_ATTEMPT',
        user_address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        client_id: 'test-client',
        action: 'login',
        status: 'success',
        details: { method: 'polkadot-js' },
        ip_address: '127.0.0.1',
        user_agent: 'Mozilla/5.0 (Test Browser)',
      });
    });

    it('should handle empty results', async () => {
      const mockDb = {
        all: vi.fn().mockResolvedValue([]),
      };

      vi.mocked(require('../../config/db.js').getDatabaseConnection).mockResolvedValue(mockDb);

      const logs = await auditService.getAuditLogs({});

      expect(logs).toHaveLength(0);
    });

    it('should handle database errors', async () => {
      vi.mocked(require('../../config/db.js').getDatabaseConnection).mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(auditService.getAuditLogs({})).rejects.toThrow('Database connection failed');
    });
  });

  describe('getAuditStats', () => {
    it('should return audit statistics', async () => {
      const mockStats = {
        total: 100,
        by_type: { AUTH_ATTEMPT: 50, CHALLENGE_CREATED: 30, TOKEN_EXCHANGE: 20 },
        by_status: { success: 80, failure: 20 },
        by_action: { login: 40, logout: 30, verify: 30 },
      };

      const mockDb = {
        get: vi.fn().mockResolvedValue({ count: 100 }),
        all: vi.fn()
          .mockResolvedValueOnce([
            { type: 'AUTH_ATTEMPT', count: 50 },
            { type: 'CHALLENGE_CREATED', count: 30 },
            { type: 'TOKEN_EXCHANGE', count: 20 },
          ])
          .mockResolvedValueOnce([
            { status: 'success', count: 80 },
            { status: 'failure', count: 20 },
          ])
          .mockResolvedValueOnce([
            { action: 'login', count: 40 },
            { action: 'logout', count: 30 },
            { action: 'verify', count: 30 },
          ]),
      };

      vi.mocked(require('../../config/db.js').getDatabaseConnection).mockResolvedValue(mockDb);

      const stats = await auditService.getAuditStats();

      expect(stats).toEqual(mockStats);
    });
  });

  describe('cleanupOldAuditLogs', () => {
    it('should clean up old audit logs', async () => {
      const mockDb = {
        run: vi.fn().mockResolvedValue({ changes: 25 }),
      };

      vi.mocked(require('../../config/db.js').getDatabaseConnection).mockResolvedValue(mockDb);

      const deletedCount = await auditService.cleanupOldAuditLogs(90);

      expect(deletedCount).toBe(25);
      expect(mockDb.run).toHaveBeenCalledWith(
        'DELETE FROM audit_logs WHERE created_at < ?',
        [expect.any(Number)]
      );
    });

    it('should use default 90 days if not specified', async () => {
      const mockDb = {
        run: vi.fn().mockResolvedValue({ changes: 10 }),
      };

      vi.mocked(require('../../config/db.js').getDatabaseConnection).mockResolvedValue(mockDb);

      const deletedCount = await auditService.cleanupOldAuditLogs();

      expect(deletedCount).toBe(10);
    });
  });
});
