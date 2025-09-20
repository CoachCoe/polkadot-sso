import { AuditService } from '../services/auditService.js';
export declare const createRateLimiter: (windowMs: number, max: number, endpoint: string, auditService: AuditService) => import("express-rate-limit").RateLimitRequestHandler;
export declare const createRateLimiters: (auditService: AuditService) => {
    login: import("express-rate-limit").RateLimitRequestHandler;
    challenge: import("express-rate-limit").RateLimitRequestHandler;
    verify: import("express-rate-limit").RateLimitRequestHandler;
    token: import("express-rate-limit").RateLimitRequestHandler;
    refresh: import("express-rate-limit").RateLimitRequestHandler;
    logout: import("express-rate-limit").RateLimitRequestHandler;
    api: import("express-rate-limit").RateLimitRequestHandler;
};
//# sourceMappingURL=rateLimit.d.ts.map