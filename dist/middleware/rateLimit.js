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
const createRateLimiters = (auditService) => ({
    login: (0, exports.createRateLimiter)(15 * 60 * 1000, 5, 'login', auditService),
    challenge: (0, exports.createRateLimiter)(5 * 60 * 1000, 3, 'challenge', auditService),
    verify: (0, exports.createRateLimiter)(5 * 60 * 1000, 3, 'verify', auditService),
    token: (0, exports.createRateLimiter)(60 * 1000, 2, 'token', auditService),
    refresh: (0, exports.createRateLimiter)(60 * 1000, 2, 'refresh', auditService),
    api: (0, exports.createRateLimiter)(60 * 1000, 30, 'api', auditService),
});
exports.createRateLimiters = createRateLimiters;
//# sourceMappingURL=rateLimit.js.map