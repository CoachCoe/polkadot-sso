import { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('security-middleware');

export const nonceMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const nonce = Buffer.from(uuidv4()).toString('base64');
  res.locals.nonce = nonce;
  next();
};

export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",  
        'https://cdn.jsdelivr.net',
        'https://polkadot.js.org',
        'https://unpkg.com',
        'https://telegram.org', 
      ],
      connectSrc: [
        "'self'",
        'http://localhost:*',
        'https://localhost:*',
        'https://api.coingecko.com',
        'https://unpkg.com',
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        'https://cdn.jsdelivr.net',
        'https://fonts.googleapis.com',
        'https://unpkg.com',
      ],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'https://cdn.jsdelivr.net'],
      imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
      frameSrc: ["'self'", 'https://oauth.telegram.org'],  
      frameAncestors: ["'none'"],
      objectSrc: ["'none'"],
      formAction: ["'self'"],
      baseUri: ["'self'"],
    },
  },
  hsts: {
    maxAge: 31536000,  
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
  crossOriginEmbedderPolicy: false,  
});

export const corsConfig = cors({
  origin: (origin, callback) => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:3000',
      'http://localhost:3001',
    ];

    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn('CORS blocked request', { origin, allowedOrigins });
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-Request-ID',
  ],
  exposedHeaders: ['X-Request-ID'],
});

export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const requestId = (req as any).requestId || uuidv4();
  (req as any).requestId = requestId;
  res.set('X-Request-ID', requestId);
  next();
};

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

export const ipWhitelistMiddleware = (allowedIPs: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const clientIP = req.ip || req.connection.remoteAddress;
    
    if (!clientIP || !allowedIPs.includes(clientIP)) {
      logger.warn('IP not in whitelist', { ip: clientIP, allowedIPs });
      res.status(403).json({ error: 'Access denied' });
      return;
    }
    
    next();
  };
};

export const rateLimitHeaders = (req: Request, res: Response, next: NextFunction): void => {
  res.set({
    'X-RateLimit-Limit': '100',
    'X-RateLimit-Remaining': '99',
    'X-RateLimit-Reset': new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 minutes
  });

  next();
};

export const securityAuditMiddleware = (req: Request, _res: Response, next: NextFunction): void => {
  const startTime = Date.now();


  const suspiciousPatterns = [
    /\.\.\//,  
    /<script/i,  
    /union.*select/i,  
    /javascript:/i,  
    /on\w+\s*=/i,  
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
        body: body.substring(0, 200), 
      });
    }
  }

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

export const securityMiddleware = [
  securityHeaders,
  corsConfig,
  nonceMiddleware,
  requestIdMiddleware,
  apiSecurityHeaders,
  securityAuditMiddleware,
];