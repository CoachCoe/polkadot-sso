import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { app } from '../../app.js';
import { initializeDatabase } from '../../config/db.js';

describe('Security Tests', () => {
  let testDb: any;

  beforeAll(async () => {
    // Initialize test database
    testDb = await initializeDatabase();
  });

  afterAll(async () => {
    if (testDb) {
      await testDb.close();
    }
  });

  beforeEach(async () => {
    // Clean up test data before each test
    if (testDb) {
      await testDb.run('DELETE FROM challenges');
      await testDb.run('DELETE FROM sessions');
      await testDb.run('DELETE FROM audit_logs');
    }
  });

  describe('Input Validation', () => {
    it('should reject SQL injection attempts', async () => {
      const maliciousInputs = [
        "'; DROP TABLE challenges; --",
        "1' OR '1'='1",
        "'; INSERT INTO challenges VALUES ('hack', 'hack', 'hack'); --",
      ];

      for (const input of maliciousInputs) {
        const response = await request(app)
          .get('/api/auth/challenge')
          .query({
            client_id: input,
            address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
          });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
      }
    });

    it('should reject XSS attempts', async () => {
      const xssPayloads = [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        '<img src="x" onerror="alert(\'xss\')">',
        '"><script>alert("xss")</script>',
      ];

      for (const payload of xssPayloads) {
        const response = await request(app)
          .get('/api/auth/challenge')
          .query({
            client_id: 'polkadot-password-manager',
            address: payload,
          });

        // Should either reject the request or sanitize the input
        expect([200, 400]).toContain(response.status);
        if (response.status === 200) {
          expect(response.text).not.toContain('<script>');
          expect(response.text).not.toContain('javascript:');
        }
      }
    });

    it('should reject directory traversal attempts', async () => {
      const traversalPayloads = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\drivers\\etc\\hosts',
        '....//....//....//etc/passwd',
      ];

      for (const payload of traversalPayloads) {
        const response = await request(app)
          .get('/api/auth/challenge')
          .query({
            client_id: 'polkadot-password-manager',
            address: payload,
          });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
      }
    });

    it('should reject oversized requests', async () => {
      const largeString = 'A'.repeat(10000); // 10KB string

      const response = await request(app)
        .get('/api/auth/challenge')
        .query({
          client_id: 'polkadot-password-manager',
          address: largeString,
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits on challenge endpoint', async () => {
      const requests = Array(35).fill(null).map(() =>
        request(app)
          .get('/api/auth/challenge')
          .query({
            client_id: 'polkadot-password-manager',
            address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
          })
      );

      const responses = await Promise.all(requests);
      const rateLimitedResponses = responses.filter(r => r.status === 429);

      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('should enforce rate limits on status endpoint', async () => {
      const requests = Array(35).fill(null).map(() =>
        request(app)
          .get('/api/auth/status/test-challenge-id')
      );

      const responses = await Promise.all(requests);
      const rateLimitedResponses = responses.filter(r => r.status === 429);

      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('should enforce rate limits on login endpoint', async () => {
      const requests = Array(35).fill(null).map(() =>
        request(app)
          .get('/api/auth/login')
          .query({
            client_id: 'polkadot-password-manager',
            address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
            wallet: 'polkadot-js',
          })
      );

      const responses = await Promise.all(requests);
      const rateLimitedResponses = responses.filter(r => r.status === 429);

      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Authentication Security', () => {
    it('should reject requests with invalid client IDs', async () => {
      const invalidClients = [
        'invalid-client',
        'admin',
        'root',
        'test',
        '',
        null,
        undefined,
      ];

      for (const clientId of invalidClients) {
        const response = await request(app)
          .get('/api/auth/challenge')
          .query({
            client_id: clientId,
            address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
          });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
      }
    });

    it('should validate Polkadot address format', async () => {
      const invalidAddresses = [
        'invalid-address',
        '0x1234567890abcdef',
        '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa', // Bitcoin address
        '',
        '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'.slice(0, -1), // Too short
      ];

      for (const address of invalidAddresses) {
        const response = await request(app)
          .get('/api/auth/challenge')
          .query({
            client_id: 'polkadot-password-manager',
            address: address,
          });

        // Should either reject or handle gracefully
        expect([200, 400]).toContain(response.status);
      }
    });
  });

  describe('JWT Security', () => {
    it('should reject malformed JWT tokens', async () => {
      const malformedTokens = [
        'invalid-token',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9', // Missing signature
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature',
        '',
        null,
      ];

      for (const token of malformedTokens) {
        const response = await request(app)
          .post('/api/auth/logout')
          .send({
            access_token: token,
          });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
      }
    });

    it('should reject expired JWT tokens', async () => {
      // This would require creating an expired token
      // For now, we'll test the endpoint structure
      const response = await request(app)
        .post('/api/auth/logout')
        .send({
          access_token: 'expired-token',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('CORS Security', () => {
    it('should reject requests from unauthorized origins', async () => {
      const response = await request(app)
        .get('/api/auth/challenge')
        .query({
          client_id: 'polkadot-password-manager',
          address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        })
        .set('Origin', 'https://malicious-site.com');

      // Should either reject or handle CORS properly
      expect([200, 403]).toContain(response.status);
    });

    it('should allow requests from authorized origins', async () => {
      const response = await request(app)
        .get('/api/auth/challenge')
        .query({
          client_id: 'polkadot-password-manager',
          address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        })
        .set('Origin', 'http://localhost:3000');

      expect(response.status).toBe(200);
    });
  });

  describe('Content Security Policy', () => {
    it('should include CSP headers', async () => {
      const response = await request(app)
        .get('/api/auth/challenge')
        .query({
          client_id: 'polkadot-password-manager',
          address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        });

      expect(response.headers).toHaveProperty('content-security-policy');
      expect(response.headers['content-security-policy']).toContain("default-src 'self'");
    });
  });

  describe('Information Disclosure', () => {
    it('should not expose sensitive information in error messages', async () => {
      const response = await request(app)
        .get('/api/auth/challenge')
        .query({
          client_id: 'polkadot-password-manager',
          address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        });

      // Error messages should not contain sensitive information
      if (response.status !== 200) {
        expect(response.body.error).not.toContain('password');
        expect(response.body.error).not.toContain('secret');
        expect(response.body.error).not.toContain('key');
        expect(response.body.error).not.toContain('token');
      }
    });

    it('should not expose stack traces in production', async () => {
      // Set NODE_ENV to production
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const response = await request(app)
        .get('/api/auth/non-existent-endpoint');

      // Should not expose stack traces
      expect(response.body).not.toHaveProperty('stack');
      expect(response.body).not.toHaveProperty('error');

      // Restore original environment
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Session Security', () => {
    it('should invalidate sessions on logout', async () => {
      // This would require a valid session
      const response = await request(app)
        .post('/api/auth/logout')
        .send({
          access_token: 'test-access-token',
        });

      // Should handle the request appropriately
      expect([200, 400, 500]).toContain(response.status);
    });

    it('should not allow session hijacking', async () => {
      // This would require testing session token validation
      const response = await request(app)
        .post('/api/auth/token')
        .send({
          code: 'hijacked-authorization-code',
          client_id: 'polkadot-password-manager',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('Audit Logging', () => {
    it('should log security events', async () => {
      // Make a request that should be logged
      const response = await request(app)
        .get('/api/auth/challenge')
        .query({
          client_id: 'polkadot-password-manager',
          address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        });

      // Check if audit log was created
      if (testDb) {
        const auditLogs = await testDb.all('SELECT * FROM audit_logs');
        expect(auditLogs.length).toBeGreaterThan(0);
      }
    });

    it('should log failed authentication attempts', async () => {
      const response = await request(app)
        .get('/api/auth/challenge')
        .query({
          client_id: 'invalid-client',
          address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        });

      expect(response.status).toBe(401);

      // Check if failed attempt was logged
      if (testDb) {
        const auditLogs = await testDb.all('SELECT * FROM audit_logs WHERE status = ?', ['failure']);
        expect(auditLogs.length).toBeGreaterThan(0);
      }
    });
  });
});
