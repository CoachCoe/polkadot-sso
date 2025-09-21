import cors from 'cors';
import crypto from 'crypto';
import { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('security-middleware');

export interface ResponseWithLocals extends Response {
  locals: {
    nonce?: string;
  };
}

/**
 * Enhanced security headers middleware
 */
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        (_, res) => `'nonce-${(res as ResponseWithLocals).locals.nonce}'`,
        'https://cdn.jsdelivr.net',
        'https://polkadot.js.org',
        'https://unpkg.com',
      ],
      connectSrc: [
        "'self'",
        'wss://rpc.polkadot.io',
        'wss://kusama-rpc.polkadot.io',
        'wss://polkadot-rpc.polkadot.io',
        'https://api.coingecko.com',
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        'https://cdn.jsdelivr.net',
        'https://fonts.googleapis.com',
      ],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'https://cdn.jsdelivr.net'],
      imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
      frameAncestors: ["'none'"],
      objectSrc: ["'none'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: [],
      baseUri: ["'self'"],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  frameguard: {
    action: 'deny',
  },
  noSniff: true,
  referrerPolicy: { policy: 'same-origin' },
  xssFilter: true,
  hidePoweredBy: true,
  crossOriginEmbedderPolicy: false, // Disable for compatibility
});

/**
 * Enhanced CORS configuration
 */
export const corsConfig = cors({
  origin: (origin, callback) => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:3000',
      'http://localhost:3001',
    ];

    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    logger.warn('CORS blocked request', {
      origin,
      allowedOrigins,
    });

    return callback(new Error('Not allowed by CORS policy'), false);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
  maxAge: 86400, // 24 hours
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-Request-ID',
    'X-CSRF-Token',
  ],
  exposedHeaders: ['X-Request-ID', 'X-Rate-Limit-Remaining'],
  optionsSuccessStatus: 200,
});

/**
 * Nonce generation middleware
 */
export const nonceMiddleware = (
  _req: Request,
  res: ResponseWithLocals,
  next: NextFunction
): void => {
  const nonce = crypto.randomBytes(16).toString('base64');
  res.locals.nonce = nonce;
  res.set('X-Nonce', nonce);
  next();
};

/**
 * Request ID middleware for tracking
 */
export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const requestId = crypto.randomUUID();
  (req as Request & { requestId: string }).requestId = requestId;
  res.set('X-Request-ID', requestId);
  next();
};

/**
 * Security headers for API responses
 */
export const apiSecurityHeaders = (req: Request, res: Response, next: NextFunction): void => {
  // Prevent caching of sensitive endpoints
  if (req.path.startsWith('/api/auth/')) {
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
      'Surrogate-Control': 'no-store',
    });
  }

  // Add security headers
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    'Referrer-Policy': 'same-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
  });

  next();
};

/**
 * IP whitelist middleware (optional)
 */
export const ipWhitelistMiddleware = (allowedIPs: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';

    if (allowedIPs.length > 0 && !allowedIPs.includes(clientIP)) {
      logger.warn('IP not in whitelist', {
        ip: clientIP,
        allowedIPs,
        path: req.path,
      });

      res.status(403).json({
        error: 'Forbidden',
        message: 'Your IP address is not allowed',
        code: 'IP_NOT_ALLOWED',
      });
      return;
    }

    next();
  };
};

/**
 * Rate limiting headers middleware
 */
export const rateLimitHeaders = (_req: Request, res: Response, next: NextFunction): void => {
  // These will be set by the rate limiter
  res.set({
    'X-RateLimit-Limit': '100',
    'X-RateLimit-Remaining': '99',
    'X-RateLimit-Reset': new Date(Date.now() + 900000).toISOString(), // 15 minutes
  });

  next();
};

/**
 * Security audit middleware
 */
export const securityAuditMiddleware = (req: Request, _res: Response, next: NextFunction): void => {
  const startTime = Date.now();

  // Log suspicious patterns
  const suspiciousPatterns = [
    /\.\.\//, // Directory traversal
    /<script/i, // XSS attempts
    /union.*select/i, // SQL injection
    /javascript:/i, // JavaScript protocol
    /on\w+\s*=/i, // Event handlers
  ];

  const userAgent = req.get('User-Agent') || '';
  const url = req.url;
  const body = JSON.stringify(req.body || {});

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(url) || pattern.test(body) || pattern.test(userAgent)) {
      logger.warn('Suspicious request detected', {
        ip: req.ip,
        userAgent,
        url,
        pattern: pattern.toString(),
        body: body.substring(0, 200), // Limit body size
      });
    }
  }

  // Log response time for performance monitoring
  _res.on('finish', () => {
    const duration = Date.now() - startTime;
    if (duration > 5000) {
      // Log slow requests
      logger.warn('Slow request detected', {
        method: req.method,
        url: req.url,
        duration,
        ip: req.ip,
        userAgent,
      });
    }
  });

  next();
};

/**
 * Combined security middleware
 */
export const securityMiddleware = [
  securityHeaders,
  corsConfig,
  nonceMiddleware,
  requestIdMiddleware,
  apiSecurityHeaders,
  securityAuditMiddleware,
];
