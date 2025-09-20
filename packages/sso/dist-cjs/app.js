"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const db_js_1 = require("./config/db.js");
const rateLimit_js_1 = require("./middleware/rateLimit.js");
const index_js_1 = require("./routes/auth/index.js");
const auditService_js_1 = require("./services/auditService.js");
const challengeService_js_1 = require("./services/challengeService.js");
const token_js_1 = require("./services/token.js");
const logger_js_1 = require("./utils/logger.js");
const logger = (0, logger_js_1.createLogger)('polkadot-sso-app');
const app = (0, express_1.default)();
// Security middleware
app.use((0, helmet_1.default)());
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
app.get('/health', (req, res) => {
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
        return res.status(503).json({ error: 'Database not initialized' });
    }
    const authRouter = (0, index_js_1.createAuthRouter)(tokenService, challengeService, auditService, clients, db, rateLimiters);
    authRouter(req, res, next);
});
// Error handling middleware
app.use((err, req, res, next) => {
    logger.error('Unhandled error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
    });
});
// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Not found',
        message: `Route ${req.originalUrl} not found`,
    });
});
logger.info('Polkadot SSO application initialized successfully');
exports.default = app;
//# sourceMappingURL=app.js.map