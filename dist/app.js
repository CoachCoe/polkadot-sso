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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const express_rate_limit_1 = require("express-rate-limit");
const express_session_1 = __importDefault(require("express-session"));
const helmet_1 = __importDefault(require("helmet"));
const path_1 = __importDefault(require("path"));
const cors_2 = require("./config/cors");
const db_1 = require("./config/db");
const session_1 = require("./config/session");
// Import from modular structure
const modules_1 = require("./modules");
// Legacy imports that don't have modular equivalents yet
const security_1 = require("./middleware/security");
const logger_1 = require("./utils/logger");
const logger = (0, logger_1.createLogger)('app');
// Validate secrets before starting the application
const secretManager = modules_1.SecretManager.getInstance();
const secretValidation = secretManager.validateSecrets();
if (!secretValidation.valid) {
    logger.error('Secret validation failed:', secretValidation.errors);
    process.exit(1);
}
const app = (0, express_1.default)();
app.use(modules_1.requestIdMiddleware);
app.use(express_1.default.json());
app.use(express_1.default.static(path_1.default.join(__dirname, '../public')));
app.use((0, helmet_1.default)({
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
            frameAncestors: ["'none'"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: [],
        },
    },
    referrerPolicy: { policy: 'same-origin' },
    permittedCrossDomainPolicies: { permittedPolicies: 'none' },
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    crossOriginResourcePolicy: { policy: 'same-site' },
}));
app.options('*', (0, cors_1.default)(cors_2.corsConfig));
app.use((req, res, _next) => {
    res.setHeader('X-Request-ID', req.id);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('Expect-CT', 'enforce, max-age=86400');
    next();
});
app.use((0, express_session_1.default)(session_1.sessionConfig));
app.use((0, express_rate_limit_1.rateLimit)({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
}));
app.use(express_1.default.json({ limit: '10kb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10kb' }));
app.use((req, res, next) => (0, security_1.nonceMiddleware)(req, res, next));
app.use(security_1.securityMiddleware);
const initializeApp = async () => {
    const db = await (0, db_1.initializeDatabase)();
    const tokenService = new modules_1.TokenService(db);
    const challengeService = new modules_1.ChallengeService(db);
    const auditService = new modules_1.AuditService(db);
    const credentialService = new modules_1.CredentialService(db);
    // Initialize hybrid storage services
    const { IPFSService, defaultIPFSConfig } = await Promise.resolve().then(() => __importStar(require('./services/ipfsService')));
    const { KusamaService, defaultKusamaConfig } = await Promise.resolve().then(() => __importStar(require('./services/kusamaService')));
    const { HybridCredentialService } = await Promise.resolve().then(() => __importStar(require('./services/hybridCredentialService')));
    const ipfsService = new IPFSService(defaultIPFSConfig);
    const kusamaService = new KusamaService(defaultKusamaConfig);
    const hybridCredentialService = new HybridCredentialService(db, credentialService, ipfsService, kusamaService);
    // Initialize hybrid service
    await hybridCredentialService.initialize();
    const clients = new Map([
        [
            'demo-app',
            {
                client_id: 'demo-app',
                name: 'Polkadot SSO',
                redirect_url: 'http://localhost:3001/callback',
                allowed_origins: ['http://localhost:3001'],
            },
        ],
    ]);
    const bruteForceMiddleware = (0, modules_1.createBruteForceProtection)(auditService);
    // Enhanced security middleware for all routes
    app.use(modules_1.enhancedRateLimiter);
    app.use(modules_1.validateRequestSize);
    app.use(modules_1.enhancedCORS);
    app.use((0, modules_1.sanitizeRequestParams)());
    app.use('/', (0, modules_1.createAuthRouter)(tokenService, challengeService, auditService, clients, db));
    app.use('/api/tokens', (0, modules_1.createTokenRouter)(tokenService, db, auditService));
    app.use('/api/clients', (0, modules_1.createClientRouter)(db));
    app.use('/api/credentials', (0, modules_1.createCredentialRouter)(credentialService, auditService));
    // Enhanced security for Kusama operations
    app.use('/api/hybrid-credentials', modules_1.sanitizeKusamaRequest, modules_1.validateKusamaRequest, (0, modules_1.auditKusamaOperation)('hybrid_credentials'), (0, modules_1.createHybridCredentialRouter)(hybridCredentialService, auditService));
    // Apply brute force protection after other middleware
    app.use(bruteForceMiddleware);
    app.use(((err, req, res, next) => {
        const requestId = req.id;
        logger.error({
            requestId,
            error: {
                name: err.name,
                message: err.message,
                stack: err.stack,
                details: err,
            },
            method: req.method,
            url: req.url,
            query: req.query,
            body: req.body,
            ip: req.ip ?? 'unknown',
        });
        res.status(500).json({
            status: 'error',
            message: 'Internal server error',
            requestId,
            details: process.env.NODE_ENV === 'development' ? err.message : undefined,
        });
    }));
    const port = process.env.PORT ?? 3000;
    app.listen(port, () => {
        logger.info(`SSO Service running on port ${port}`);
    });
};
initializeApp().catch(console.error);
exports.default = app;
//# sourceMappingURL=app.js.map