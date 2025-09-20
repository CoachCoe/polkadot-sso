"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessionConfig = exports.initializeDatabase = exports.corsConfig = exports.createLogger = exports.createAuthRouter = exports.TokenService = exports.SIWEStyleAuthService = exports.ChallengeService = exports.app = void 0;
const app_1 = __importDefault(require("./app"));
exports.app = app_1.default;
const logger_1 = require("./utils/logger");
const logger = (0, logger_1.createLogger)('polkadot-sso');
// Start the server
const PORT = process.env.PORT || 3001;
const server = app_1.default.listen(PORT, () => {
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
var challengeService_1 = require("./services/challengeService");
Object.defineProperty(exports, "ChallengeService", { enumerable: true, get: function () { return challengeService_1.ChallengeService; } });
var siweStyleAuthService_1 = require("./services/siweStyleAuthService");
Object.defineProperty(exports, "SIWEStyleAuthService", { enumerable: true, get: function () { return siweStyleAuthService_1.SIWEStyleAuthService; } });
var token_1 = require("./services/token");
Object.defineProperty(exports, "TokenService", { enumerable: true, get: function () { return token_1.TokenService; } });
// SSO Routes
var auth_1 = require("./routes/auth");
Object.defineProperty(exports, "createAuthRouter", { enumerable: true, get: function () { return auth_1.createAuthRouter; } });
// Shared Utilities
var utils_1 = require("./utils");
Object.defineProperty(exports, "createLogger", { enumerable: true, get: function () { return utils_1.createLogger; } });
// Configuration
var config_1 = require("./config");
Object.defineProperty(exports, "corsConfig", { enumerable: true, get: function () { return config_1.corsConfig; } });
Object.defineProperty(exports, "initializeDatabase", { enumerable: true, get: function () { return config_1.initializeDatabase; } });
Object.defineProperty(exports, "sessionConfig", { enumerable: true, get: function () { return config_1.sessionConfig; } });
exports.default = app_1.default;
//# sourceMappingURL=index.js.map