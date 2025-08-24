"use strict";
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
const bruteForce_1 = require("./middleware/bruteForce");
const requestId_1 = require("./middleware/requestId");
const security_1 = require("./middleware/security");
const validation_1 = require("./middleware/validation");
const auth_1 = require("./routes/auth");
const clients_1 = require("./routes/clients");
const credentials_1 = require("./routes/credentials");
const tokens_1 = require("./routes/tokens");
const auditService_1 = require("./services/auditService");
const challengeService_1 = require("./services/challengeService");
const credentialService_1 = require("./services/credentialService");
const token_1 = require("./services/token");
const logger_1 = require("./utils/logger");
const secrets_1 = require("./utils/secrets");
const logger = (0, logger_1.createLogger)('app');
// Validate secrets before starting the application
const secretValidation = (0, secrets_1.validateAllSecrets)();
if (!secretValidation.valid) {
    logger.error('Secret validation failed:', secretValidation.errors);
    process.exit(1);
}
const app = (0, express_1.default)();
app.use(requestId_1.addRequestId);
app.use(express_1.default.json());
app.use(express_1.default.static(path_1.default.join(__dirname, '../public')));
app.use((0, helmet_1.default)({
    contentSecurityPolicy: false, // Temporarily disable CSP to allow WebAssembly to work
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
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
}));
app.use(express_1.default.json({ limit: '10kb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10kb' }));
// Temporarily disabled security middleware to allow WebAssembly to work
// app.use(securityMiddleware);
// But keep nonce middleware for proper nonce generation
app.use((req, res, next) => (0, security_1.nonceMiddleware)(req, res, next));
async function initializeApp() {
    const db = await (0, db_1.initializeDatabase)();
    const tokenService = new token_1.TokenService(db);
    const challengeService = new challengeService_1.ChallengeService(db);
    const auditService = new auditService_1.AuditService(db);
    const credentialService = new credentialService_1.CredentialService(db);
    // Create demo client with secret for testing
    const demoClientSecret = 'demo-client-secret-32-chars-minimum-required';
    // Insert demo client into database if it doesn't exist
    await db.run(`
    INSERT OR IGNORE INTO clients (
      client_id, client_secret, name, redirect_urls, allowed_origins, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [
        'demo-app',
        demoClientSecret,
        'Polkadot SSO Demo',
        JSON.stringify(['http://localhost:3000/callback']),
        JSON.stringify(['http://localhost:3000']),
        Date.now(),
        Date.now(),
    ]);
    const clients = new Map([
        [
            'demo-app',
            {
                client_id: 'demo-app',
                name: 'Polkadot SSO Demo',
                redirect_url: 'http://localhost:3000/callback',
                allowed_origins: ['http://localhost:3000'],
            },
        ],
    ]);
    const bruteForceMiddleware = (0, bruteForce_1.createBruteForceProtection)(auditService);
    app.use('/', (0, auth_1.createAuthRouter)(tokenService, challengeService, auditService, clients, db));
    app.use('/api/tokens', (0, tokens_1.createTokenRouter)(tokenService, db, auditService));
    app.use('/api/clients', (0, clients_1.createClientRouter)(db));
    app.use('/api/credentials', (0, credentials_1.createCredentialRouter)(credentialService, auditService));
    // Temporarily disabled due to Polkadot.js dependency issues
    // app.use('/api/kusama', kusamaRoutes);
    // app.use('/api/wallet-kusama', walletKusamaRoutes);
    // Demo page routes (temporarily disabled)
    // app.get('/kusama-demo', (req, res) => {
    //   res.sendFile(path.join(__dirname, '../public/views/kusama-demo.html'));
    // });
    // app.get('/wallet-kusama-demo', (req, res) => {
    //   res.sendFile(path.join(__dirname, '../public/views/wallet-kusama-demo.html'));
    // });
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
initializeApp().catch(console.error);
exports.default = app;
//# sourceMappingURL=app.js.map