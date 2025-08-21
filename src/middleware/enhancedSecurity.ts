import { NextFunction, Request, Response } from 'express';
import { createLogger } from '../utils/logger';
const logger = createLogger('enhanced-security');
const SECURITY_CONFIG = {
  MAX_REQUEST_SIZE: 1024 * 1024,
  MAX_CREDENTIAL_SIZE: 100 * 1024,
  RATE_LIMIT_WINDOW: 15 * 60 * 1000,
  MAX_REQUESTS_PER_WINDOW: 100,
  SUSPICIOUS_PATTERNS: [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /eval\s*\(/i,
    /document\./i,
    /window\./i,
  ],
  BLOCKED_HEADERS: ['x-forwarded-for', 'x-real-ip', 'x-forwarded-proto', 'x-forwarded-host'],
};
const requestTracker = new Map<
  string,
  {
    count: number;
    lastRequest: number;
    suspiciousActivity: number;
    blocked: boolean;
  }
>();
export class EnhancedSecurityMiddleware {
  static validateKusamaAddress(address: string): boolean {
    const kusamaAddressRegex = /^5[a-km-zA-HJ-NP-Z1-9]{46}$/;
    return kusamaAddressRegex.test(address);
  }
  static validateCredentialData(data: Record<string, unknown>): {
    valid: boolean;
    errors: string[];
    size: number;
  } {
    const errors: string[] = [];
    const dataString = JSON.stringify(data);
    const size = Buffer.byteLength(dataString, 'utf8');
    if (size > SECURITY_CONFIG.MAX_CREDENTIAL_SIZE) {
      errors.push(
        `Credential data too large: ${size} bytes (max: ${SECURITY_CONFIG.MAX_CREDENTIAL_SIZE})`
      );
    }
    if (!data['type']) {
      errors.push('Credential type is required');
    }
    if (SECURITY_CONFIG.SUSPICIOUS_PATTERNS.some(pattern => pattern.test(dataString))) {
      errors.push('Suspicious content detected in credential data');
    }
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string' && value.length > 10000) {
        errors.push(`Field '${key}' is too long (max: 10000 characters)`);
      }
    }
    return {
      valid: errors.length === 0,
      errors,
      size,
    };
  }
  static createEnhancedRateLimiter() {
    return (req: Request, res: Response, next: NextFunction) => {
      const ip = req.ip || '0.0.0.0';
      const now = Date.now();
      let tracker = requestTracker.get(ip);
      if (!tracker) {
        tracker = {
          count: 0,
          lastRequest: now,
          suspiciousActivity: 0,
          blocked: false,
        };
        requestTracker.set(ip, tracker);
      }
      if (tracker.blocked) {
        logger.warn('Blocked IP attempted access', { ip, path: req.path });
        return res.status(403).json({
          error: 'Access denied',
          reason: 'IP address blocked due to suspicious activity',
        });
      }
      tracker.count++;
      tracker.lastRequest = now;
      if (tracker.count > SECURITY_CONFIG.MAX_REQUESTS_PER_WINDOW) {
        tracker.suspiciousActivity++;
        logger.warn('Rate limit exceeded', { ip, count: tracker.count, path: req.path });
        if (tracker.suspiciousActivity >= 3) {
          tracker.blocked = true;
          logger.error('IP blocked due to repeated violations', { ip });
        }
        return res.status(429).json({
          error: 'Too many requests',
          retryAfter: Math.ceil(SECURITY_CONFIG.RATE_LIMIT_WINDOW / 1000),
        });
      }
      return next();
    };
  }
  static validateRequestSize() {
    return (req: Request, res: Response, next: NextFunction) => {
      const contentLength = parseInt(req.get('content-length') || '0');
      if (contentLength > SECURITY_CONFIG.MAX_REQUEST_SIZE) {
        logger.warn('Request too large', {
          ip: req.ip,
          size: contentLength,
          path: req.path,
        });
        return res.status(413).json({
          error: 'Request too large',
          maxSize: SECURITY_CONFIG.MAX_REQUEST_SIZE,
        });
      }
      return next();
    };
  }
  static validateKusamaRequest() {
    return (req: Request, res: Response, next: NextFunction) => {
      const { userAddress, credentialData, storageMethod } = req.body;
      if (userAddress && !EnhancedSecurityMiddleware.validateKusamaAddress(String(userAddress))) {
        logger.warn('Invalid Kusama address', {
          ip: req.ip,
          address: userAddress,
        });
        return res.status(400).json({
          error: 'Invalid Kusama address format',
        });
      }
      if (credentialData) {
        const validation = EnhancedSecurityMiddleware.validateCredentialData(
          credentialData as Record<string, unknown>
        );
        if (!validation.valid) {
          logger.warn('Invalid credential data', {
            ip: req.ip,
            errors: validation.errors,
          });
          return res.status(400).json({
            error: 'Invalid credential data',
            details: validation.errors,
          });
        }
      }
      const validMethods = ['remark', 'batch', 'custom_pallet'];
      if (storageMethod && !validMethods.includes(String(storageMethod))) {
        logger.warn('Invalid storage method', {
          ip: req.ip,
          method: storageMethod,
        });
        return res.status(400).json({
          error: 'Invalid storage method',
          validMethods,
        });
      }
      return next();
    };
  }
  static createEnhancedCORS() {
    return (req: Request, res: Response, next: NextFunction) => {
      const origin = req.get('origin');
      const allowedOrigins = [
        'http://localhost:3000',
        'https://localhost:3000',
        'https://kusama-rpc.polkadot.io',
      ];
      if (process.env['ALLOWED_ORIGINS']) {
        allowedOrigins.push(...process.env['ALLOWED_ORIGINS'].split(','));
      }
      if (origin && allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
      } else if (!origin) {
        res.setHeader('Access-Control-Allow-Origin', '*');
      } else {
        logger.warn('CORS violation', {
          ip: req.ip,
          origin,
          path: req.path,
        });
        return res.status(403).json({
          error: 'CORS violation',
        });
      }
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      if (req.method === 'OPTIONS') {
        return res.status(200).end();
      }
      return next();
    };
  }
  static sanitizeKusamaRequest() {
    return (req: Request, res: Response, next: NextFunction) => {
      SECURITY_CONFIG.BLOCKED_HEADERS.forEach(header => {
        delete req.headers[header];
      });
      if (req.body) {
        const bodyString = JSON.stringify(req.body);
        if (SECURITY_CONFIG.SUSPICIOUS_PATTERNS.some(pattern => pattern.test(bodyString))) {
          logger.warn('Suspicious content in request body', {
            ip: req.ip,
            path: req.path,
          });
          return res.status(400).json({
            error: 'Suspicious content detected',
          });
        }
      }
      if (req.query) {
        for (const [key, value] of Object.entries(req.query)) {
          if (
            typeof value === 'string' &&
            SECURITY_CONFIG.SUSPICIOUS_PATTERNS.some(pattern => pattern.test(value))
          ) {
            logger.warn('Suspicious content in query parameter', {
              ip: req.ip,
              key,
              path: req.path,
            });
            return res.status(400).json({
              error: 'Suspicious content detected in query parameters',
            });
          }
        }
      }
      return next();
    };
  }
  static auditKusamaOperation(operation: string) {
    return (req: Request, res: Response, next: NextFunction) => {
      const auditData = {
        operation,
        ip: req.ip,
        userAgent: req.get('user-agent'),
        method: req.method,
        path: req.path,
        timestamp: new Date().toISOString(),
        userAddress: req.body?.userAddress,
        storageMethod: req.body?.storageMethod,
        dataSize: req.body?.credentialData ? JSON.stringify(req.body.credentialData).length : 0,
      };
      logger.info('Kusama operation audit', auditData);
      (res.locals as any).auditData = auditData;
      return next();
    };
  }
  static cleanupRequestTrackers() {
    setInterval(() => {
      const now = Date.now();
      const cutoff = now - SECURITY_CONFIG.RATE_LIMIT_WINDOW;
      for (const [ip, tracker] of requestTracker.entries()) {
        if (tracker.lastRequest < cutoff && !tracker.blocked) {
          requestTracker.delete(ip);
        }
      }
    }, 60000);
  }
}
EnhancedSecurityMiddleware.cleanupRequestTrackers();
export const enhancedRateLimiter = EnhancedSecurityMiddleware.createEnhancedRateLimiter();
export const validateRequestSize = EnhancedSecurityMiddleware.validateRequestSize();
export const validateKusamaRequest = EnhancedSecurityMiddleware.validateKusamaRequest();
export const enhancedCORS = EnhancedSecurityMiddleware.createEnhancedCORS();
export const sanitizeKusamaRequest = EnhancedSecurityMiddleware.sanitizeKusamaRequest();
export const auditKusamaOperation = (operation: string) =>
  EnhancedSecurityMiddleware.auditKusamaOperation(operation);
