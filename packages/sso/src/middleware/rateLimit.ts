import { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { AuditService } from '../services/auditService.js';

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

export const createRateLimiters = (auditService: AuditService) => {
  // Environment-based rate limiting configuration
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    login: createRateLimiter(
      isProduction ? 15 * 60 * 1000 : 5 * 60 * 1000, // 15 min in prod, 5 min in dev
      isProduction ? 3 : 5, // Stricter in production
      'login',
      auditService
    ),
    challenge: createRateLimiter(
      isProduction ? 5 * 60 * 1000 : 2 * 60 * 1000, // 5 min in prod, 2 min in dev
      isProduction ? 2 : 3, // Stricter in production
      'challenge',
      auditService
    ),
    verify: createRateLimiter(
      isProduction ? 5 * 60 * 1000 : 2 * 60 * 1000,
      isProduction ? 2 : 3,
      'verify',
      auditService
    ),
    token: createRateLimiter(
      isProduction ? 60 * 1000 : 30 * 1000, // 1 min in prod, 30 sec in dev
      isProduction ? 1 : 2, // Stricter in production
      'token',
      auditService
    ),
    refresh: createRateLimiter(
      isProduction ? 60 * 1000 : 30 * 1000,
      isProduction ? 1 : 2,
      'refresh',
      auditService
    ),
    logout: createRateLimiter(
      isProduction ? 60 * 1000 : 30 * 1000,
      isProduction ? 3 : 5,
      'logout',
      auditService
    ),
    api: createRateLimiter(
      isProduction ? 60 * 1000 : 30 * 1000,
      isProduction ? 20 : 30, // Stricter in production
      'api',
      auditService
    ),
  };
};
