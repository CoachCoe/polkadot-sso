"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessionConfig = exports.initializeDatabase = exports.corsConfig = exports.createLogger = exports.createAuthRouter = exports.TokenService = exports.SIWEStyleAuthService = exports.ChallengeService = exports.app = void 0;
const app_js_1 = __importDefault(require("./app.js"));
exports.app = app_js_1.default;
const logger_js_1 = require("./utils/logger.js");
const logger = (0, logger_js_1.createLogger)('polkadot-sso');
// Start the server
const PORT = process.env.PORT || 3001;
const server = app_js_1.default.listen(PORT, () => {
    logger.info(`🚀 Polkadot SSO server running on port ${PORT}`);
    logger.info(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
    logger.info(`🏥 Health Check: http://localhost:${PORT}/health`);
});
// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    server.close(() => {
        logger.info('Process terminated');
        process.exit(0);
    });
});
process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully');
    server.close(() => {
        logger.info('Process terminated');
        process.exit(0);
    });
});
// SSO Services
var challengeService_js_1 = require("./services/challengeService.js");
Object.defineProperty(exports, "ChallengeService", { enumerable: true, get: function () { return challengeService_js_1.ChallengeService; } });
var siweStyleAuthService_js_1 = require("./services/siweStyleAuthService.js");
Object.defineProperty(exports, "SIWEStyleAuthService", { enumerable: true, get: function () { return siweStyleAuthService_js_1.SIWEStyleAuthService; } });
var token_js_1 = require("./services/token.js");
Object.defineProperty(exports, "TokenService", { enumerable: true, get: function () { return token_js_1.TokenService; } });
// SSO Routes
var index_js_1 = require("./routes/auth/index.js");
Object.defineProperty(exports, "createAuthRouter", { enumerable: true, get: function () { return index_js_1.createAuthRouter; } });
// Shared Utilities
var index_js_2 = require("./utils/index.js");
Object.defineProperty(exports, "createLogger", { enumerable: true, get: function () { return index_js_2.createLogger; } });
// Configuration
var index_js_3 = require("./config/index.js");
Object.defineProperty(exports, "corsConfig", { enumerable: true, get: function () { return index_js_3.corsConfig; } });
Object.defineProperty(exports, "initializeDatabase", { enumerable: true, get: function () { return index_js_3.initializeDatabase; } });
Object.defineProperty(exports, "sessionConfig", { enumerable: true, get: function () { return index_js_3.sessionConfig; } });
exports.default = app_js_1.default;
//# sourceMappingURL=index.js.map