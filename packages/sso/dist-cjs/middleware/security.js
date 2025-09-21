"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.securityMiddleware = exports.securityAuditMiddleware = exports.rateLimitHeaders = exports.ipWhitelistMiddleware = exports.apiSecurityHeaders = exports.requestIdMiddleware = exports.nonceMiddleware = exports.corsConfig = exports.securityHeaders = void 0;
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const logger_js_1 = require("../utils/logger.js");
const logger = (0, logger_js_1.createLogger)('security-middleware');
/**
 * Enhanced security headers middleware
 */
exports.securityHeaders = (0, helmet_1.default)({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: [
                "'self'",
                (_, res) => `'nonce-${res.locals.nonce}'`,
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
            fontSrc: [
                "'self'",
                'https://fonts.gstatic.com',
                'https://cdn.jsdelivr.net',
            ],
            imgSrc: [
                "'self'",
                'data:',
                'https:',
                'blob:',
            ],
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
exports.corsConfig = (0, cors_1.default)({
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
const nonceMiddleware = (_req, res, next) => {
    const nonce = require('crypto').randomBytes(16).toString('base64');
    res.locals.nonce = nonce;
    res.set('X-Nonce', nonce);
    next();
};
exports.nonceMiddleware = nonceMiddleware;
/**
 * Request ID middleware for tracking
 */
const requestIdMiddleware = (req, res, next) => {
    const requestId = require('crypto').randomUUID();
    req.requestId = requestId;
    res.set('X-Request-ID', requestId);
    next();
};
exports.requestIdMiddleware = requestIdMiddleware;
/**
 * Security headers for API responses
 */
const apiSecurityHeaders = (req, res, next) => {
    // Prevent caching of sensitive endpoints
    if (req.path.startsWith('/api/auth/')) {
        res.set({
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
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
exports.apiSecurityHeaders = apiSecurityHeaders;
/**
 * IP whitelist middleware (optional)
 */
const ipWhitelistMiddleware = (allowedIPs) => {
    return (req, res, next) => {
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
exports.ipWhitelistMiddleware = ipWhitelistMiddleware;
/**
 * Rate limiting headers middleware
 */
const rateLimitHeaders = (_req, res, next) => {
    // These will be set by the rate limiter
    res.set({
        'X-RateLimit-Limit': '100',
        'X-RateLimit-Remaining': '99',
        'X-RateLimit-Reset': new Date(Date.now() + 900000).toISOString(), // 15 minutes
    });
    next();
};
exports.rateLimitHeaders = rateLimitHeaders;
/**
 * Security audit middleware
 */
const securityAuditMiddleware = (req, _res, next) => {
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
        if (duration > 5000) { // Log slow requests
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
exports.securityAuditMiddleware = securityAuditMiddleware;
/**
 * Combined security middleware
 */
exports.securityMiddleware = [
    exports.securityHeaders,
    exports.corsConfig,
    exports.nonceMiddleware,
    exports.requestIdMiddleware,
    exports.apiSecurityHeaders,
    exports.securityAuditMiddleware,
];
//# sourceMappingURL=security.js.map