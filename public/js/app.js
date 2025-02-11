"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = require("dotenv");
const security_1 = require("./middleware/security");
const db_1 = require("./config/db");
const token_1 = require("./services/token");
const challengeService_1 = require("./services/challengeService");
const auth_1 = require("./routes/auth");
const tokens_1 = require("./routes/tokens");
const clients_1 = require("./routes/clients");
// Load environment variables
(0, dotenv_1.config)();
const app = (0, express_1.default)();
// Apply security middleware
app.use(security_1.securityMiddleware);
app.use(express_1.default.json());
// Serve static files
app.use(express_1.default.static(path_1.default.join(__dirname, '../public')));
// Initialize services and routes
async function initializeApp() {
    const db = await (0, db_1.initializeDatabase)();
    const tokenService = new token_1.TokenService(db);
    const challengeService = new challengeService_1.ChallengeService(db);
    // Demo clients (to be replaced with database-backed system)
    const clients = new Map([
        ['demo-app', {
                client_id: 'demo-app',
                name: 'Polkadot SSO',
                redirect_url: 'http://localhost:3001/callback',
                allowed_origins: ['http://localhost:3001']
            }]
    ]);
    // Mount routes
    app.use('/', (0, auth_1.createAuthRouter)(tokenService, challengeService, clients));
    app.use('/api/tokens', (0, tokens_1.createTokenRouter)(tokenService, db));
    app.use('/api/clients', (0, clients_1.createClientRouter)(db));
    // Error handler
    app.use(security_1.errorHandler);
    const port = process.env.PORT || 3000;
    app.listen(port, () => {
        console.log(`SSO Service running on port ${port}`);
    });
}
initializeApp().catch(console.error);
exports.default = app;
