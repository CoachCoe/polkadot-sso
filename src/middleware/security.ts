// src/middleware/security.ts
import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';

export const securityMiddleware = [
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "https://cdn.jsdelivr.net",
          "https://polkadot.js.org",
          "'unsafe-inline'",
          "'unsafe-eval'"
        ],
        connectSrc: ["'self'", "*"],
        imgSrc: ["'self'", "data:", "https:"],
        styleSrc: ["'self'", "'unsafe-inline'"]
      }
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    },
    frameguard: {
      action: 'deny'
    },
    noSniff: true,
    referrerPolicy: { policy: 'same-origin' }
  }),
  cors({
    origin: process.env.CLIENT_WHITELIST?.split(',') || ['http://localhost:3001'],
    methods: ['GET', 'POST'],
    credentials: true
  })
];

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Global error:', err);
  res.status(500).json({
    error: 'Authentication failed',
    requestId: crypto.randomUUID()
  });
};
