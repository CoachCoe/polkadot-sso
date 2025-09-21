"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRateLimiters = exports.createRateLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const createRateLimiter = (windowMs, max, endpoint, auditService) => {
    return (0, express_rate_limit_1.default)({
        windowMs,
        max,
        keyGenerator: (req) => `${req.ip}:${endpoint}`,
        handler: async (req, res) => {
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
exports.createRateLimiter = createRateLimiter;
const createRateLimiters = (auditService) => {
    // Environment-based rate limiting configuration
    const isProduction = process.env.NODE_ENV === 'production';
    return {
        login: (0, exports.createRateLimiter)(isProduction ? 15 * 60 * 1000 : 5 * 60 * 1000, // 15 min in prod, 5 min in dev
        isProduction ? 3 : 5, // Stricter in production
        'login', auditService),
        challenge: (0, exports.createRateLimiter)(isProduction ? 5 * 60 * 1000 : 2 * 60 * 1000, // 5 min in prod, 2 min in dev
        isProduction ? 2 : 3, // Stricter in production
        'challenge', auditService),
        verify: (0, exports.createRateLimiter)(isProduction ? 5 * 60 * 1000 : 2 * 60 * 1000, isProduction ? 2 : 3, 'verify', auditService),
        token: (0, exports.createRateLimiter)(isProduction ? 60 * 1000 : 30 * 1000, // 1 min in prod, 30 sec in dev
        isProduction ? 1 : 2, // Stricter in production
        'token', auditService),
        refresh: (0, exports.createRateLimiter)(isProduction ? 60 * 1000 : 30 * 1000, isProduction ? 1 : 2, 'refresh', auditService),
        logout: (0, exports.createRateLimiter)(isProduction ? 60 * 1000 : 30 * 1000, isProduction ? 3 : 5, 'logout', auditService),
        api: (0, exports.createRateLimiter)(isProduction ? 60 * 1000 : 30 * 1000, isProduction ? 20 : 30, // Stricter in production
        'api', auditService),
        status: (0, exports.createRateLimiter)(60 * 1000, // 1 minute window
        30, // 30 requests per minute
        'status', auditService),
    };
};
exports.createRateLimiters = createRateLimiters;
//# sourceMappingURL=rateLimit.js.map