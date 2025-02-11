// src/middleware/security.ts
import { Request, Response as ExpressResponse, NextFunction, RequestHandler } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import csurf from 'csurf';
import { generateNonce } from '../utils/nonce';

export interface ResponseWithLocals extends ExpressResponse {
  locals: {
    nonce: string;
    [key: string]: any;
  };
}

export const securityMiddleware: RequestHandler[] = [
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-eval'",
          "https://cdn.jsdelivr.net",
          "https://polkadot.js.org"
        ],
        connectSrc: ["'self'", "wss://rpc.polkadot.io"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        frameAncestors: ["'none'"],
        objectSrc: ["'none'"]
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

export const csrfProtection = csurf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  }
});

export const errorHandler = (
  err: Error,
  req: Request,
  res: ResponseWithLocals,
  next: NextFunction
) => {
  console.error('Global error:', err);
  res.status(500).json({
    error: 'Authentication failed',
    requestId: crypto.randomUUID()
  });
};

export const securityHeaders = (req: Request, res: ResponseWithLocals, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
};

type NonceMiddleware = (
  req: Request,
  res: ResponseWithLocals,
  next: NextFunction
) => void;

export const nonceMiddleware: NonceMiddleware = (req, res, next) => {
  res.locals.nonce = generateNonce();
  next();
};
