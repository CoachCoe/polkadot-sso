import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';

export const createClientRateLimit = (windowMs: number, max: number) => 
  rateLimit({
    windowMs,
    max,
    keyGenerator: (req) => `${req.ip}-${req.get('x-client-id')}`,
    handler: (req, res) => {
      res.status(429).json({
        error: 'Too many requests, please try again later',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
  }); 