"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = exports.securityMiddleware = void 0;
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
exports.securityMiddleware = [
    (0, helmet_1.default)({
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
    (0, cors_1.default)({
        origin: process.env.CLIENT_WHITELIST?.split(',') || ['http://localhost:3001'],
        methods: ['GET', 'POST'],
        credentials: true
    })
];
const errorHandler = (err, req, res, next) => {
    console.error('Global error:', err);
    res.status(500).json({
        error: 'Authentication failed',
        requestId: crypto.randomUUID()
    });
};
exports.errorHandler = errorHandler;
