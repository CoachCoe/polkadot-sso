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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessionConfig = exports.initializeDatabase = exports.corsConfig = exports.createLogger = exports.createCredentialRouter = exports.CredentialService = exports.app = void 0;
const app_1 = __importDefault(require("./app"));
exports.app = app_1.default;
const logger_1 = require("./utils/logger");
const logger = (0, logger_1.createLogger)('password-manager-package');
// Start the server
const PORT = process.env.PORT || 3001;
const server = app_1.default.listen(PORT, () => {
    logger.info(`🚀 Password Manager server running on port ${PORT}`);
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
// Password Manager Types
__exportStar(require("./modules/credentials/types/credential"), exports);
// Password Manager Services
var credentialService_1 = require("./modules/credentials/services/credentialService");
Object.defineProperty(exports, "CredentialService", { enumerable: true, get: function () { return credentialService_1.CredentialService; } });
// Password Manager Routes
var credentials_1 = require("./modules/credentials/routes/credentials");
Object.defineProperty(exports, "createCredentialRouter", { enumerable: true, get: function () { return credentials_1.createCredentialRouter; } });
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