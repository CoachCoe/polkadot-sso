"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generalRateLimiter = exports.remittanceRateLimiter = exports.challengeRateLimiter = exports.authRateLimiter = exports.RateLimiter = void 0;
class RateLimiter {
    constructor(config) {
        this.store = {};
        this.config = {
            message: 'Too many requests, please try again later.',
            skipSuccessfulRequests: false,
            ...config,
        };
        // Clean up expired entries every minute
        setInterval(() => this.cleanup(), 60000);
    }
    /**
     * Get client identifier from request
     */
    getClientId(req) {
        // Use IP address as primary identifier
        const ip = req.ip || req.connection.remoteAddress || 'unknown';
        // In production, you might want to use user ID if authenticated
        // const userId = req.session?.userId;
        // return userId ? `user:${userId}` : `ip:${ip}`;
        return `ip:${ip}`;
    }
    /**
     * Check if request should be rate limited
     */
    isRateLimited(clientId) {
        const now = Date.now();
        const entry = this.store[clientId];
        if (!entry || now > entry.resetTime) {
            // No entry or expired, create new entry
            this.store[clientId] = {
                count: 1,
                resetTime: now + this.config.windowMs,
            };
            return false;
        }
        // Check if limit exceeded
        if (entry.count >= this.config.maxRequests) {
            return true;
        }
        // Increment counter
        entry.count++;
        return false;
    }
    /**
     * Clean up expired entries
     */
    cleanup() {
        const now = Date.now();
        Object.keys(this.store).forEach(key => {
            if (this.store[key].resetTime < now) {
                delete this.store[key];
            }
        });
    }
    /**
     * Express middleware function
     */
    middleware() {
        return (req, res, next) => {
            const clientId = this.getClientId(req);
            if (this.isRateLimited(clientId)) {
                const entry = this.store[clientId];
                const retryAfter = Math.ceil((entry.resetTime - Date.now()) / 1000);
                res.status(429).json({
                    error: this.config.message,
                    code: 'RATE_LIMIT_EXCEEDED',
                    retryAfter,
                    limit: this.config.maxRequests,
                    windowMs: this.config.windowMs,
                });
                return;
            }
            // Add rate limit headers
            const entry = this.store[clientId];
            res.set({
                'X-RateLimit-Limit': this.config.maxRequests.toString(),
                'X-RateLimit-Remaining': Math.max(0, this.config.maxRequests - entry.count).toString(),
                'X-RateLimit-Reset': new Date(entry.resetTime).toISOString(),
            });
            next();
        };
    }
}
exports.RateLimiter = RateLimiter;
// Pre-configured rate limiters for different endpoints
exports.authRateLimiter = new RateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 attempts per 15 minutes
    message: 'Too many authentication attempts, please try again later.',
});
exports.challengeRateLimiter = new RateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10, // 10 challenges per minute
    message: 'Too many challenge requests, please try again later.',
});
exports.remittanceRateLimiter = new RateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 20, // 20 requests per minute
    message: 'Too many remittance requests, please try again later.',
});
exports.generalRateLimiter = new RateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100, // 100 requests per 15 minutes
    message: 'Too many requests, please try again later.',
});
//# sourceMappingURL=rateLimiter.js.map