"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
const express_1 = __importDefault(require("express"));
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const db_js_1 = require("./config/db.js");
const errorHandler_js_1 = require("./middleware/errorHandler.js");
const rateLimit_js_1 = require("./middleware/rateLimit.js");
const security_js_1 = require("./middleware/security.js");
const validation_js_1 = require("./middleware/validation.js");
const index_js_1 = require("./routes/auth/index.js");
const auditService_js_1 = require("./services/auditService.js");
const challengeService_js_1 = require("./services/challengeService.js");
const token_js_1 = require("./services/token.js");
const errors_js_1 = require("./utils/errors.js");
const logger_js_1 = require("./utils/logger.js");
const logger = (0, logger_js_1.createLogger)('polkadot-sso-app');
const app = (0, express_1.default)();
// Apply security middleware
security_js_1.securityMiddleware.forEach(middleware => {
    if (middleware) {
        app.use(middleware);
    }
});
// Apply validation middleware
validation_js_1.validationMiddleware.forEach(middleware => {
    if (middleware) {
        app.use(middleware);
    }
});
// Body parsing middleware
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Swagger documentation
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Polkadot SSO API',
            version: '1.0.0',
            description: 'Single Sign-On service for Polkadot ecosystem applications',
        },
        servers: [
            {
                url: process.env.API_BASE_URL || 'http://localhost:3001',
                description: 'Development server',
            },
        ],
    },
    apis: ['./src/routes/*.ts'],
};
const swaggerSpec = (0, swagger_jsdoc_1.default)(swaggerOptions);
app.use('/api-docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swaggerSpec));
// Health check endpoint
app.get('/health', (_req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'polkadot-sso',
        version: '1.0.0',
    });
});
// Initialize services
const tokenService = new token_js_1.TokenService();
const challengeService = new challengeService_js_1.ChallengeService();
const auditService = new auditService_js_1.AuditService();
const clients = new Map(); // Empty clients map for now
// Add default client for password manager
clients.set('polkadot-password-manager', {
    client_id: 'polkadot-password-manager',
    client_secret: process.env.DEFAULT_CLIENT_SECRET || 'default-client-secret-for-development-only',
    name: 'Polkadot Password Manager',
    redirect_url: 'http://localhost:3000/callback',
    allowed_origins: ['http://localhost:3000', 'http://localhost:3001']
});
// Create rate limiters once at app initialization
const rateLimiters = (0, rateLimit_js_1.createRateLimiters)(auditService);
// Initialize database
let db = null;
(0, db_js_1.initializeDatabase)().then(database => {
    db = database;
    logger.info('Database initialized successfully');
}).catch(error => {
    logger.error('Failed to initialize database:', error);
    process.exit(1);
});
// API routes
app.use('/api/auth', (req, res, next) => {
    if (!db) {
        const error = new errors_js_1.ServiceUnavailableError('Database not initialized', undefined, req.requestId);
        return next(error);
    }
    const authRouter = (0, index_js_1.createAuthRouter)(tokenService, challengeService, auditService, clients, db, rateLimiters);
    authRouter(req, res, next);
});
// 404 handler (must be before error handler)
app.use('*', errorHandler_js_1.notFoundHandler);
// Global error handling middleware (must be last)
app.use(errorHandler_js_1.globalErrorHandler);
logger.info('Polkadot SSO application initialized successfully');
exports.default = app;
//# sourceMappingURL=app.js.map