import * as crypto from 'crypto';
import { NextFunction, Request, Response } from 'express';
import { createLogger } from '../utils/logger';
const logger = createLogger('security-headers');
export interface SecurityConfig {
  enableCSP: boolean;
  enableHSTS: boolean;
  enableReferrerPolicy: boolean;
  enablePermissionsPolicy: boolean;
  strictTransportSecurity: {
    maxAge: number;
    includeSubDomains: boolean;
    preload: boolean;
  };
  contentSecurityPolicy: {
    enableNonce: boolean;
    allowedDomains: string[];
    reportUri?: string;
  };
}
export class AdvancedSecurityHeaders {
  private config: SecurityConfig;
  private nonceStore = new Map<string, { nonce: string; timestamp: number }>();
  constructor(config: SecurityConfig) {
    this.config = config;
    setInterval(() => this.cleanupNonces(), 5 * 60 * 1000);
  }
  generateNonce(): string {
    return crypto.randomBytes(16).toString('base64');
  }
  private storeNonce(requestId: string, nonce: string): void {
    this.nonceStore.set(requestId, {
      nonce,
      timestamp: Date.now(),
    });
  }
  getNonce(requestId: string): string | null {
    const stored = this.nonceStore.get(requestId);
    return stored ? stored.nonce : null;
  }
  private cleanupNonces(): void {
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    for (const [requestId, data] of this.nonceStore.entries()) {
      if (data.timestamp < fiveMinutesAgo) {
        this.nonceStore.delete(requestId);
      }
    }
  }
  getCSPMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!this.config.enableCSP) {
        return next();
      }
      const requestId = req.get('x-request-id') ?? req.ip ?? 'default';
      const nonce = this.generateNonce();
      this.storeNonce(requestId, nonce);
      (res.locals as any).nonce = nonce;
      const cspDirectives = {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          this.config.contentSecurityPolicy.enableNonce ? `'nonce-${nonce}'` : null,
          ...this.config.contentSecurityPolicy.allowedDomains,
        ].filter(Boolean),
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          ...this.config.contentSecurityPolicy.allowedDomains,
        ],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: [
          "'self'",
          'wss://kusama-rpc.polkadot.io',
          'wss://kusama-rpc.polkadot.io',
          'https://kusama-rpc.polkadot.io',
          ...this.config.contentSecurityPolicy.allowedDomains,
        ],
        fontSrc: ["'self'", 'https://fonts.googleapis.com'],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        upgradeInsecureRequests: process.env['NODE_ENV'] === 'production' ? [] : undefined,
      };
      if (this.config.contentSecurityPolicy.reportUri) {
        (cspDirectives as any).reportUri = this.config.contentSecurityPolicy.reportUri;
      }
      res.setHeader(
        'Content-Security-Policy',
        Object.entries(cspDirectives)
          .filter(([_, value]) => value !== undefined)
          .map(([key, value]) => {
            const directive = key.replace(/([A-Z])/g, '-$1').toLowerCase();
            return Array.isArray(value)
              ? `${directive} ${value.join(' ')}`
              : `${directive} ${value}`;
          })
          .join('; ')
      );
      next();
    };
  }
  getHSTSMiddleware() {
    return (_req: Request, res: Response, next: NextFunction) => {
      if (!this.config.enableHSTS || process.env['NODE_ENV'] !== 'production') {
        return next();
      }
      const { maxAge, includeSubDomains, preload } = this.config.strictTransportSecurity;
      let hstsValue = `max-age=${maxAge}`;
      if (includeSubDomains) {
        hstsValue += '; includeSubDomains';
      }
      if (preload) {
        hstsValue += '; preload';
      }
      res.setHeader('Strict-Transport-Security', hstsValue);
      return next();
    };
  }
  getReferrerPolicyMiddleware() {
    return (_req: Request, res: Response, next: NextFunction) => {
      if (!this.config.enableReferrerPolicy) {
        return next();
      }
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      return next();
    };
  }
  getPermissionsPolicyMiddleware() {
    return (_req: Request, res: Response, next: NextFunction) => {
      if (!this.config.enablePermissionsPolicy) {
        return next();
      }
      const permissionsPolicy = [
        'geolocation=()',
        'camera=()',
        'microphone=()',
        'payment=()',
        'usb=()',
        'magnetometer=()',
        'gyroscope=()',
        'accelerometer=()',
        'autoplay=()',
        'encrypted-media=()',
        'fullscreen=(self)',
        'picture-in-picture=()',
      ].join(', ');
      res.setHeader('Permissions-Policy', permissionsPolicy);
      return next();
    };
  }
  getAdditionalHeadersMiddleware() {
    return (_req: Request, res: Response, next: NextFunction) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('X-DNS-Prefetch-Control', 'off');
      res.setHeader('X-Download-Options', 'noopen');
      res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
      if (_req.path.includes('/api/')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
      return next();
    };
  }
  getViolationReporter() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (req.path === '/security/csp-report' && req.method === 'POST') {
        logger.warn('CSP Violation Report', {
          violation: req.body,
          ip: req.ip,
          userAgent: req.get('user-agent'),
        });
        return res.status(204).end();
      }
      return next();
    };
  }
  getAllSecurityMiddleware() {
    return [
      this.getCSPMiddleware(),
      this.getHSTSMiddleware(),
      this.getReferrerPolicyMiddleware(),
      this.getPermissionsPolicyMiddleware(),
      this.getAdditionalHeadersMiddleware(),
      this.getViolationReporter(),
    ];
  }
}
export const defaultSecurityConfig: SecurityConfig = {
  enableCSP: true,
  enableHSTS: process.env['NODE_ENV'] === 'production',
  enableReferrerPolicy: true,
  enablePermissionsPolicy: true,
  strictTransportSecurity: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  contentSecurityPolicy: {
    enableNonce: true,
    allowedDomains: ['https://kusama-rpc.polkadot.io'],
    reportUri: '/security/csp-report',
  },
};
export const advancedSecurityHeaders = new AdvancedSecurityHeaders(defaultSecurityConfig);
