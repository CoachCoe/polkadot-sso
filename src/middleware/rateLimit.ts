import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

const createIPRateLimiter = (
  windowMs: number,
  max: number,
  endpoint: string
) => {
  const store = new Map();

  return rateLimit({
    windowMs,
    max,
    keyGenerator: (req: Request) => `${req.ip}:${endpoint}`,
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        error: 'Too many requests from this IP',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    },
    standardHeaders: true,
    legacyHeaders: false
  });
};

export const rateLimiters = {
  login: createIPRateLimiter(15 * 60 * 1000, 5, 'login'),
  token: createIPRateLimiter(60 * 1000, 10, 'token'),
  refresh: createIPRateLimiter(60 * 1000, 5, 'refresh')
}; 