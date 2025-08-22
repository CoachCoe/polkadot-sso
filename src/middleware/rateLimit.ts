import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { AuditService } from '../services/auditService';

export const createRateLimiter = (
  windowMs: number,
  max: number,
  endpoint: string,
  auditService: AuditService
) => {
  return rateLimit({
    windowMs,
    max,
    keyGenerator: (req: Request) => `${req.ip}:${endpoint}`,
    handler: async (req: Request, res: Response) => {
      await auditService.log({
        type: 'SECURITY_EVENT',
        client_id: String(req.query.client_id || 'unknown'),
        action: 'RATE_LIMIT_EXCEEDED',
        status: 'failure',
        details: { endpoint, attempts: max },
        ip_address: req.ip || '0.0.0.0',
        user_agent: req.get('user-agent') || 'unknown',
      });

      res.status(429).json({
        error: `Too many ${endpoint} attempts from this IP`,
        retryAfter: Math.ceil(windowMs / 1000),
      });
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

export const createRateLimiters = (auditService: AuditService) => ({
  login: createRateLimiter(15 * 60 * 1000, 5, 'login', auditService),
  challenge: createRateLimiter(5 * 60 * 1000, 3, 'challenge', auditService),
  verify: createRateLimiter(5 * 60 * 1000, 3, 'verify', auditService),
  token: createRateLimiter(60 * 1000, 2, 'token', auditService),
  refresh: createRateLimiter(60 * 1000, 2, 'refresh', auditService),
  api: createRateLimiter(60 * 1000, 30, 'api', auditService),
});
