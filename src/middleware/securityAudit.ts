import { Request, Response, NextFunction } from 'express';
import { AuditService } from '../services/auditService';
import rateLimit from 'express-rate-limit';

export const createSecurityAudit = (auditService: AuditService) => {
  return {
    rateLimitHandler: (req: Request, res: Response, next: NextFunction) => {
      auditService.log({
        type: 'SECURITY_EVENT',
        client_id: String(req.query.client_id || 'unknown'),
        action: 'RATE_LIMIT_EXCEEDED',
        status: 'failure',
        details: {
          endpoint: req.path,
          ip: req.ip
        },
        ip_address: req.ip || '0.0.0.0',
        user_agent: req.get('user-agent') || 'unknown'
      });
      res.status(429).json({
        error: 'Too many requests',
        retryAfter: res.get('Retry-After')
      });
    },

    corsErrorHandler: (req: Request, res: Response, next: NextFunction) => {
      auditService.log({
        type: 'SECURITY_EVENT',
        client_id: String(req.query.client_id || 'unknown'),
        action: 'CORS_VIOLATION',
        status: 'failure',
        details: {
          origin: req.get('origin'),
          ip: req.ip
        },
        ip_address: req.ip || '0.0.0.0',
        user_agent: req.get('user-agent') || 'unknown'
      });
      next();
    }
  };
}; 