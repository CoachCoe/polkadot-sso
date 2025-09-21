import { RateLimitRequestHandler } from 'express-rate-limit';
import { AuditService } from '../services/auditService.js';
export declare const createRateLimiter: (windowMs: number, max: number, endpoint: string, auditService: AuditService) => RateLimitRequestHandler;
export declare const createRateLimiters: (auditService: AuditService) => {
    login: RateLimitRequestHandler;
    challenge: RateLimitRequestHandler;
    verify: RateLimitRequestHandler;
    token: RateLimitRequestHandler;
    refresh: RateLimitRequestHandler;
    logout: RateLimitRequestHandler;
    api: RateLimitRequestHandler;
    status: RateLimitRequestHandler;
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
//# sourceMappingURL=rateLimit.d.ts.map