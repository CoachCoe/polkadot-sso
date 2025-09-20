"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.nonceMiddleware = exports.securityHeaders = exports.errorHandler = exports.csrfProtection = exports.securityMiddleware = void 0;
const cors_1 = __importDefault(require("cors"));
const csurf_1 = __importDefault(require("csurf"));
const helmet_1 = __importDefault(require("helmet"));
const nonce_js_1 = require("../utils/nonce.js");
exports.securityMiddleware = [
    (0, helmet_1.default)({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: [
                    "'self'",
                    (_, res) => `'nonce-${res.locals.nonce}'`,
                    'https://cdn.jsdelivr.net',
                    'https://polkadot.js.org',
                ],
                connectSrc: ["'self'", 'wss://rpc.polkadot.io'],
                styleSrc: ["'self'"],
                frameAncestors: ["'none'"],
                objectSrc: ["'none'"],
                formAction: ["'self'"],
                upgradeInsecureRequests: [],
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
    }),
    (0, cors_1.default)({
        origin: (origin, callback) => {
            const allowedOrigins = process.env.CLIENT_WHITELIST?.split(',') || ['http://localhost:3001'];
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            }
            else {
                callback(new Error('Not allowed by CORS'));
            }
        },
        methods: ['GET', 'POST'],
        credentials: true,
        maxAge: 86400,
        allowedHeaders: ['Content-Type', 'Authorization'],
        exposedHeaders: ['X-Request-Id'],
    }),
];
exports.csrfProtection = (0, csurf_1.default)({
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
    },
});
const errorHandler = (err, req, res) => {
    console.error('Global error:', err);
    res.status(500).json({
        error: 'Authentication failed',
        requestId: crypto.randomUUID(),
    });
};
exports.errorHandler = errorHandler;
const securityHeaders = (req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    next();
};
exports.securityHeaders = securityHeaders;
const nonceMiddleware = (req, res, next) => {
    res.locals.nonce = (0, nonce_js_1.generateNonce)();
    next();
};
exports.nonceMiddleware = nonceMiddleware;
//# sourceMappingURL=security.js.map