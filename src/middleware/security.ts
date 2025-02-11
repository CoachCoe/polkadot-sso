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
          "'unsafe-eval'", 
          "'unsafe-inline'"
        ],
        connectSrc: ["'self'", "*"],
        imgSrc: ["'self'", "data:", "https:"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        workerSrc: ["'self'", "blob:"],
        childSrc: ["'self'", "blob:"],
      },
    }
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
