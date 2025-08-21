"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.advancedSecurityHeaders = exports.defaultSecurityConfig = exports.AdvancedSecurityHeaders = void 0;
const crypto = __importStar(require("crypto"));
// import helmet from 'helmet'; // Unused for now
const logger_1 = require("../utils/logger");
const logger = (0, logger_1.createLogger)('security-headers');
/**
 * Advanced Security Headers Middleware
 */
class AdvancedSecurityHeaders {
    constructor(config) {
        this.nonceStore = new Map();
        this.config = config;
        // Cleanup old nonces every 5 minutes
        setInterval(() => this.cleanupNonces(), 5 * 60 * 1000);
    }
    /**
     * Generate cryptographically secure nonce
     */
    generateNonce() {
        return crypto.randomBytes(16).toString('base64');
    }
    /**
     * Store nonce for request
     */
    storeNonce(requestId, nonce) {
        this.nonceStore.set(requestId, {
            nonce,
            timestamp: Date.now(),
        });
    }
    /**
     * Get nonce for request
     */
    getNonce(requestId) {
        const stored = this.nonceStore.get(requestId);
        return stored ? stored.nonce : null;
    }
    /**
     * Cleanup old nonces
     */
    cleanupNonces() {
        const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
        for (const [requestId, data] of this.nonceStore.entries()) {
            if (data.timestamp < fiveMinutesAgo) {
                this.nonceStore.delete(requestId);
            }
        }
    }
    /**
     * Content Security Policy with dynamic nonce
     */
    getCSPMiddleware() {
        return (req, res, next) => {
            if (!this.config.enableCSP) {
                return next();
            }
            const requestId = req.get('x-request-id') ?? req.ip ?? 'default';
            const nonce = this.generateNonce();
            // Store nonce for later use
            this.storeNonce(requestId, nonce);
            // Add nonce to response locals for template use
            res.locals.nonce = nonce;
            // Build CSP directive
            const cspDirectives = {
                defaultSrc: ["'self'"],
                scriptSrc: [
                    "'self'",
                    this.config.contentSecurityPolicy.enableNonce ? `'nonce-${nonce}'` : null,
                    // Only allow specific trusted domains
                    ...this.config.contentSecurityPolicy.allowedDomains,
                ].filter(Boolean),
                styleSrc: [
                    "'self'",
                    "'unsafe-inline'", // Needed for some CSS frameworks
                    ...this.config.contentSecurityPolicy.allowedDomains,
                ],
                imgSrc: ["'self'", 'data:', 'https:'],
                connectSrc: [
                    "'self'",
                    'wss://kusama-rpc.polkadot.io',
                    'wss://westend-rpc.polkadot.io',
                    'https://polkadot.js.org',
                    ...this.config.contentSecurityPolicy.allowedDomains,
                ],
                fontSrc: ["'self'", 'https://fonts.gstatic.com'],
                objectSrc: ["'none'"],
                mediaSrc: ["'self'"],
                frameSrc: ["'none'"],
                frameAncestors: ["'none'"],
                baseUri: ["'self'"],
                formAction: ["'self'"],
                upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : undefined,
            };
            // Add report URI if configured
            if (this.config.contentSecurityPolicy.reportUri) {
                cspDirectives.reportUri = this.config.contentSecurityPolicy.reportUri;
            }
            res.setHeader('Content-Security-Policy', Object.entries(cspDirectives)
                .filter(([_, value]) => value !== undefined)
                .map(([key, value]) => {
                const directive = key.replace(/([A-Z])/g, '-$1').toLowerCase();
                return Array.isArray(value)
                    ? `${directive} ${value.join(' ')}`
                    : `${directive} ${value}`;
            })
                .join('; '));
            next();
        };
    }
    /**
     * HTTP Strict Transport Security
     */
    getHSTSMiddleware() {
        return (req, res, next) => {
            if (!this.config.enableHSTS || process.env.NODE_ENV !== 'production') {
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
            next();
        };
    }
    /**
     * Referrer Policy
     */
    getReferrerPolicyMiddleware() {
        return (req, res, next) => {
            if (!this.config.enableReferrerPolicy) {
                return next();
            }
            res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
            next();
        };
    }
    /**
     * Permissions Policy (formerly Feature Policy)
     */
    getPermissionsPolicyMiddleware() {
        return (req, res, next) => {
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
            next();
        };
    }
    /**
     * Additional Security Headers
     */
    getAdditionalHeadersMiddleware() {
        return (req, res, next) => {
            // X-Content-Type-Options
            res.setHeader('X-Content-Type-Options', 'nosniff');
            // X-Frame-Options
            res.setHeader('X-Frame-Options', 'DENY');
            // X-XSS-Protection (deprecated but still useful for older browsers)
            res.setHeader('X-XSS-Protection', '1; mode=block');
            // X-DNS-Prefetch-Control
            res.setHeader('X-DNS-Prefetch-Control', 'off');
            // X-Download-Options (IE specific)
            res.setHeader('X-Download-Options', 'noopen');
            // X-Permitted-Cross-Domain-Policies
            res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
            // Cache-Control for sensitive endpoints
            if (req.path.includes('/api/')) {
                res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
                res.setHeader('Pragma', 'no-cache');
                res.setHeader('Expires', '0');
            }
            next();
        };
    }
    /**
     * Security Headers Violation Reporter
     */
    getViolationReporter() {
        return (req, res, next) => {
            if (req.path === '/security/csp-report' && req.method === 'POST') {
                logger.warn('CSP Violation Report', {
                    violation: req.body,
                    ip: req.ip,
                    userAgent: req.get('user-agent'),
                });
                return res.status(204).end();
            }
            next();
        };
    }
    /**
     * Complete security headers middleware
     */
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
exports.AdvancedSecurityHeaders = AdvancedSecurityHeaders;
/**
 * Default security configuration
 */
exports.defaultSecurityConfig = {
    enableCSP: true,
    enableHSTS: process.env.NODE_ENV === 'production',
    enableReferrerPolicy: true,
    enablePermissionsPolicy: true,
    strictTransportSecurity: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true,
    },
    contentSecurityPolicy: {
        enableNonce: true,
        allowedDomains: ['https://polkadot.js.org', 'https://kusama.network'],
        reportUri: '/security/csp-report',
    },
};
// Export singleton instance
exports.advancedSecurityHeaders = new AdvancedSecurityHeaders(exports.defaultSecurityConfig);
//# sourceMappingURL=advancedSecurityHeaders.js.map