import { Request, Response, NextFunction } from 'express';
interface RateLimitConfig {
    windowMs: number;
    maxRequests: number;
    message?: string;
    skipSuccessfulRequests?: boolean;
}
export declare class RateLimiter {
    private store;
    private config;
    constructor(config: RateLimitConfig);
    /**
     * Get client identifier from request
     */
    private getClientId;
    /**
     * Check if request should be rate limited
     */
    private isRateLimited;
    /**
     * Clean up expired entries
     */
    private cleanup;
    /**
     * Express middleware function
     */
    middleware(): (req: Request, res: Response, next: NextFunction) => void;
}
export declare const authRateLimiter: RateLimiter;
export declare const challengeRateLimiter: RateLimiter;
export declare const remittanceRateLimiter: RateLimiter;
export declare const generalRateLimiter: RateLimiter;
export {};
//# sourceMappingURL=rateLimiter.d.ts.map