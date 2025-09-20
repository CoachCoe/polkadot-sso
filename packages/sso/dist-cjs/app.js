"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
const compression_1 = __importDefault(require("compression"));
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const express_rate_limit_1 = require("express-rate-limit");
const express_session_1 = __importDefault(require("express-session"));
const helmet_1 = __importDefault(require("helmet"));
const path_1 = __importDefault(require("path"));
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const cors_2 = require("./config/cors");
const db_1 = require("./config/db");
const session_1 = require("./config/session");
const bruteForce_1 = require("./middleware/bruteForce");
const requestId_1 = require("./middleware/requestId");
const security_1 = require("./middleware/security");
const validation_1 = require("./middleware/validation");
const auth_1 = require("./routes/auth");
const clients_1 = require("./routes/clients");
const credentials_1 = require("./modules/credentials/routes/credentials");
const remittance_1 = __importDefault(require("./routes/remittance"));
const tokens_1 = require("./routes/tokens");
const auditService_1 = require("./services/auditService");
const cacheService_1 = require("./services/cacheService");
const rateLimiter_1 = require("./middleware/rateLimiter");
const challengeService_1 = require("./services/challengeService");
const credentialService_1 = require("./modules/credentials/services/credentialService");
const token_1 = require("./services/token");
const envValidation_1 = require("./utils/envValidation");
const logger_1 = require("./utils/logger");
const logger = (0, logger_1.createLogger)('app');
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Polkadot SSO API',
            version: '1.0.0',
            description: 'Polkadot Single Sign-On (SSO) service API for wallet-based authentication and credential management',
            contact: {
                name: 'Polkadot Auth Team',
                email: 'support@polkadot-auth.com',
            },
            license: {
                name: 'MIT',
                url: 'https://opensource.org/licenses/MIT',
            },
        },
        servers: [
            {
                url: process.env.NODE_ENV === 'production'
                    ? 'https://api.polkadot-auth.com'
                    : 'http://localhost:3000',
                description: process.env.NODE_ENV === 'production' ? 'Production server' : 'Development server',
            },
        ],
        components: {
            securitySchemes: {
                BearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'JWT token obtained from authentication',
                },
            },
        },
        security: [
            {
                BearerAuth: [],
            },
        ],
    },
    apis: ['./src/routes/*.ts', './src/app.ts'],
};
const swaggerSpec = (0, swagger_jsdoc_1.default)(swaggerOptions);
const envValidation = (0, envValidation_1.validateEnvironment)();
if (!envValidation.valid) {
    logger.error('Environment validation failed:', envValidation.errors);
    process.exit(1);
}
if (envValidation.warnings.length > 0) {
    logger.warn('Environment validation warnings:', envValidation.warnings);
}
const app = (0, express_1.default)();
app.use((0, compression_1.default)({
    level: 6,
    threshold: 1024,
    filter: (req, res) => {
        if (req.headers['x-no-compression']) {
            return false;
        }
        return compression_1.default.filter(req, res);
    },
}));
app.use(requestId_1.addRequestId);
app.use(express_1.default.json({ limit: '10kb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10kb' }));
app.use(express_1.default.static(path_1.default.join(__dirname, '../public'), {
    maxAge: process.env.NODE_ENV === 'production' ? '1h' : '0',
    etag: true,
    lastModified: true,
}));
app.use((0, helmet_1.default)({
    contentSecurityPolicy: process.env.NODE_ENV === 'production'
        ? {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "'unsafe-inline'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", 'data:', 'https:'],
                connectSrc: ["'self'", 'https://kusama-rpc.polkadot.io', 'https://kusama.subscan.io'],
                frameSrc: ["'none'"],
                objectSrc: ["'none'"],
                upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
            },
        }
        : false,
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: process.env.NODE_ENV === 'production',
    },
    noSniff: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    frameguard: { action: 'deny' },
    xssFilter: true,
}));
app.options('*', (0, cors_1.default)(cors_2.corsConfig));
app.use((req, res, next) => {
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
    windowMs: envValidation.env?.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000,
    max: envValidation.env?.RATE_LIMIT_MAX_REQUESTS || 100,
    standardHeaders: true,
    legacyHeaders: false,
}));
app.use((req, res, next) => (0, security_1.nonceMiddleware)(req, res, next));
async function initializeApp() {
    await (0, db_1.initializeDatabasePool)();
    const cacheService = (0, cacheService_1.getCacheService)();
    const cacheHealth = await cacheService.healthCheck();
    logger.info('Cache service health check', { healthy: cacheHealth });
    const tokenService = new token_1.TokenService();
    const challengeService = new challengeService_1.ChallengeService();
    const auditService = new auditService_1.AuditService();
    const credentialService = new credentialService_1.CredentialService();
    const clients = new Map();
    if (process.env.NODE_ENV === 'development') {
        clients.set('default-client', {
            client_id: 'default-client',
            name: 'Polkadot SSO Demo',
            client_secret: process.env.DEFAULT_CLIENT_SECRET || 'dev-secret-change-in-production',
            redirect_url: 'http://localhost:3000/callback',
            allowed_origins: ['http://localhost:3000'],
        });
    }
    const bruteForceMiddleware = (0, bruteForce_1.createBruteForceProtection)(auditService);
    app.use('/api-docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swaggerSpec, {
        customCss: '.swagger-ui .topbar { display: none }',
        customSiteTitle: 'Polkadot SSO API Documentation',
    }));
    /**
     * @swagger
     * /health:
     *   get:
     *     summary: Health check endpoint
     *     description: Check if the service is running and healthy
     *     tags: [Health]
     *     responses:
     *       200:
     *         description: Service is healthy
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 status:
     *                   type: string
     *                   example: "ok"
     *                 timestamp:
     *                   type: string
     *                   format: date-time
     *                   example: "2024-01-01T12:00:00.000Z"
     *                 version:
     *                   type: string
     *                   example: "1.0.0"
     */
    app.get('/health', (req, res) => {
        res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
        });
    });
    // Apply specific rate limiting to different route groups
    app.use('/', rateLimiter_1.challengeRateLimiter.middleware(), (0, auth_1.createAuthRouter)(tokenService, challengeService, auditService, clients));
    app.use('/api/tokens', rateLimiter_1.authRateLimiter.middleware(), (0, tokens_1.createTokenRouter)(tokenService, auditService));
    app.use('/api/clients', (0, clients_1.createClientRouter)());
    app.use('/api/credentials', (0, credentials_1.createCredentialRouter)(credentialService, auditService));
    app.use('/api/remittance', rateLimiter_1.remittanceRateLimiter.middleware(), remittance_1.default);
    app.use(bruteForceMiddleware);
    app.use((0, validation_1.sanitizeRequestParams)());
    app.use((err, req, res, next) => {
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
            ip: req.ip || 'unknown',
        });
        res.status(500).json({
            status: 'error',
            message: 'Internal server error',
            requestId,
            details: process.env.NODE_ENV === 'development' ? err.message : undefined,
        });
    });
    const port = process.env.PORT || 3000;
    app.listen(port, () => {
        logger.info(`SSO Service running on port ${port}`);
    });
}
process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM, starting graceful shutdown...');
    await (0, db_1.shutdownDatabasePool)();
    await (0, cacheService_1.shutdownCacheService)();
    process.exit(0);
});
process.on('SIGINT', async () => {
    logger.info('Received SIGINT, starting graceful shutdown...');
    await (0, db_1.shutdownDatabasePool)();
    await (0, cacheService_1.shutdownCacheService)();
    process.exit(0);
});
initializeApp().catch(console.error);
exports.default = app;
//# sourceMappingURL=app.js.map