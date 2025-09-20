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
const auth_js_1 = require("./routes/auth.js");
const logger_js_1 = require("./utils/logger.js");
const token_js_1 = require("./services/token.js");
const challengeService_js_1 = require("./services/challengeService.js");
const auditService_js_1 = require("./services/auditService.js");
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
// API routes
app.use('/api/auth', (0, auth_js_1.createAuthRouter)(tokenService, challengeService, auditService, clients));
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