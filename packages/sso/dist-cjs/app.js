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
const credentials_1 = require("./modules/credentials/routes/credentials");
const credentialService_1 = require("./modules/credentials/services/credentialService");
const logger_1 = require("./utils/logger");
// Mock AuditService for testing
class MockAuditService {
    async log() { return Promise.resolve(); }
    async audit() { return Promise.resolve(); }
    getAuditLogs() { return []; }
    getAuditStats() { return {}; }
    cleanupOldAuditLogs() { return Promise.resolve(); }
}
const logger = (0, logger_1.createLogger)('password-manager-app');
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
            title: 'Polkadot Password Manager API',
            version: '1.0.0',
            description: 'Secure password management service for Polkadot ecosystem',
        },
        servers: [
            {
                url: process.env.API_BASE_URL || 'http://localhost:3001',
                description: 'Development server',
            },
        ],
    },
    apis: ['./src/modules/credentials/routes/*.ts'],
};
const swaggerSpec = (0, swagger_jsdoc_1.default)(swaggerOptions);
app.use('/api-docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swaggerSpec));
// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'polkadot-password-manager',
        version: '1.0.0',
    });
});
// Initialize services
const credentialService = new credentialService_1.CredentialService();
// API routes
app.use('/api/credentials', (0, credentials_1.createCredentialRouter)(credentialService));
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
logger.info('Password Manager application initialized successfully');
exports.default = app;
//# sourceMappingURL=app.js.map