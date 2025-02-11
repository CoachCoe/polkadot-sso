import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

// Store for tracking IP-based limits
const ipStore = new Map();

export const createIPRateLimiter = (
  windowMs: number,
  max: number,
  endpoint: string
) => {
  return rateLimit({
    windowMs,
    max,
    keyGenerator: (req: Request) => `${req.ip}:${endpoint}`,
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        error: `Too many ${endpoint} attempts from this IP`,
        retryAfter: Math.ceil(windowMs / 1000)
      });
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false // Count successful requests too
  });
};

// Define rate limiters for different endpoints
export const rateLimiters = {
  login: createIPRateLimiter(15 * 60 * 1000, 5, 'login'),         // 5 attempts per 15 minutes
  challenge: createIPRateLimiter(5 * 60 * 1000, 3, 'challenge'),  // 3 attempts per 5 minutes
  verify: createIPRateLimiter(5 * 60 * 1000, 3, 'verify'),        // 3 attempts per 5 minutes
  token: createIPRateLimiter(60 * 1000, 2, 'token'),             // 2 attempts per minute
  refresh: createIPRateLimiter(60 * 1000, 2, 'refresh')          // 2 attempts per minute
}; 