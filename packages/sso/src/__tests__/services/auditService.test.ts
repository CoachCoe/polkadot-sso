import { AuditService } from '../../services/auditService';

// Mock the database
jest.mock('../../config/db');

describe('AuditService', () => {
  let auditService: AuditService;

  beforeEach(() => {
    auditService = new AuditService();
    jest.clearAllMocks();
  });

  describe('logEvent', () => {
    it('should log an authentication event', async () => {
      const eventData = {
        event_type: 'authentication',
        user_address: 'test-address',
        client_id: 'test-client',
        ip_address: '127.0.0.1',
        user_agent: 'test-user-agent',
        success: true,
        details: { method: 'wallet' },
      };

      const result = await auditService.logEvent(eventData);

      expect(result).toBeDefined();
      expect(result?.event_type).toBe(eventData.event_type);
      expect(result?.user_address).toBe(eventData.user_address);
      expect(result?.client_id).toBe(eventData.client_id);
      expect(result?.ip_address).toBe(eventData.ip_address);
      expect(result?.user_agent).toBe(eventData.user_agent);
      expect(result?.success).toBe(eventData.success);
      expect(result?.details).toEqual(eventData.details);
      expect(result?.created_at).toBeDefined();
    });

    it('should log a failed authentication event', async () => {
      const eventData = {
        event_type: 'authentication',
        user_address: 'test-address',
        client_id: 'test-client',
        ip_address: '127.0.0.1',
        user_agent: 'test-user-agent',
        success: false,
        details: { reason: 'invalid_signature' },
      };

      const result = await auditService.logEvent(eventData);

      expect(result).toBeDefined();
      expect(result?.success).toBe(false);
      expect(result?.details).toEqual(eventData.details);
    });

    it('should log a token event', async () => {
      const eventData = {
        event_type: 'token',
        user_address: 'test-address',
        client_id: 'test-client',
        ip_address: '127.0.0.1',
        user_agent: 'test-user-agent',
        success: true,
        details: { action: 'refresh' },
      };

      const result = await auditService.logEvent(eventData);

      expect(result).toBeDefined();
      expect(result?.event_type).toBe('token');
      expect(result?.details).toEqual(eventData.details);
    });

    it('should log a credential event', async () => {
      const eventData = {
        event_type: 'credential',
        user_address: 'test-address',
        client_id: 'test-client',
        ip_address: '127.0.0.1',
        user_agent: 'test-user-agent',
        success: true,
        details: { action: 'create', credential_type: 'identity' },
      };

      const result = await auditService.logEvent(eventData);

      expect(result).toBeDefined();
      expect(result?.event_type).toBe('credential');
      expect(result?.details).toEqual(eventData.details);
    });
  });

  describe('getUserAuditLog', () => {
    it('should retrieve audit logs for a user', async () => {
      const userAddress = 'test-address';
      const limit = 10;
      const offset = 0;

      const result = await auditService.getUserAuditLog(userAddress, limit, offset);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should retrieve audit logs with pagination', async () => {
      const userAddress = 'test-address';
      const limit = 5;
      const offset = 10;

      const result = await auditService.getUserAuditLog(userAddress, limit, offset);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getClientAuditLog', () => {
    it('should retrieve audit logs for a client', async () => {
      const clientId = 'test-client';
      const limit = 10;
      const offset = 0;

      const result = await auditService.getClientAuditLog(clientId, limit, offset);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getSystemAuditLog', () => {
    it('should retrieve system-wide audit logs', async () => {
      const limit = 10;
      const offset = 0;
      const eventType = 'authentication';

      const result = await auditService.getSystemAuditLog(limit, offset, eventType);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should retrieve system-wide audit logs without event type filter', async () => {
      const limit = 10;
      const offset = 0;

      const result = await auditService.getSystemAuditLog(limit, offset);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getAuditStats', () => {
    it('should return audit statistics', async () => {
      const stats = await auditService.getAuditStats();

      expect(stats).toBeDefined();
      expect(typeof stats.totalEvents).toBe('number');
      expect(typeof stats.successfulEvents).toBe('number');
      expect(typeof stats.failedEvents).toBe('number');
      expect(typeof stats.eventsByType).toBe('object');
      expect(typeof stats.eventsByClient).toBe('object');
    });
  });

  describe('cleanupOldAuditLogs', () => {
    it('should cleanup old audit logs', async () => {
      const daysToKeep = 30;

      const result = await auditService.cleanupOldAuditLogs(daysToKeep);

      expect(result).toBeDefined();
      expect(typeof result.cleanedUp).toBe('number');
    });

    it('should cleanup old audit logs with default retention period', async () => {
      const result = await auditService.cleanupOldAuditLogs();

      expect(result).toBeDefined();
      expect(typeof result.cleanedUp).toBe('number');
    });
  });

  describe('exportAuditLog', () => {
    it('should export audit logs for a date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const format = 'json';

      const result = await auditService.exportAuditLog(startDate, endDate, format);

      expect(result).toBeDefined();
      expect(result?.data).toBeDefined();
      expect(result?.format).toBe(format);
      expect(result?.recordCount).toBeDefined();
    });

    it('should export audit logs in CSV format', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const format = 'csv';

      const result = await auditService.exportAuditLog(startDate, endDate, format);

      expect(result).toBeDefined();
      expect(result?.format).toBe(format);
    });
  });
});
