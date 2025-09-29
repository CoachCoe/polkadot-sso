import { Request, Response } from 'express';
import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
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
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    login: createRateLimiter(
      isProduction ? 15 * 60 * 1000 : 5 * 60 * 1000,  
      isProduction ? 3 : 5,  
      'login',
      auditService
    ),
    challenge: createRateLimiter(
      isProduction ? 5 * 60 * 1000 : 2 * 60 * 1000,  
      isProduction ? 2 : 3,  
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
      isProduction ? 60 * 1000 : 30 * 1000,  
      isProduction ? 1 : 2, 
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
      isProduction ? 20 : 30,  
      'api',
      auditService
    ),
    status: createRateLimiter(
      60 * 1000, 
      30, 
      'status',
      auditService
    ),
  };
};

export type RateLimiters = {
  login: RateLimitRequestHandler;
  challenge: RateLimitRequestHandler;
  verify: RateLimitRequestHandler;
  token: RateLimitRequestHandler;
  refresh: RateLimitRequestHandler;
  logout: RateLimitRequestHandler;
  api: RateLimitRequestHandler;
  status: RateLimitRequestHandler;
};
