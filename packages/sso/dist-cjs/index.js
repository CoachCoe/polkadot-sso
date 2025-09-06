"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessionConfig = exports.initializeDatabase = exports.corsConfig = exports.createLogger = exports.createTokenRouter = exports.createCredentialRouter = exports.createClientRouter = exports.createAuthRouter = exports.WalletBasedKusamaService = exports.TokenService = exports.CredentialService = exports.ChallengeService = exports.AuditService = exports.app = void 0;
const app_1 = __importDefault(require("./app"));
exports.app = app_1.default;
const logger_1 = require("./utils/logger");
const logger = (0, logger_1.createLogger)('sso-package');
var services_1 = require("./services");
Object.defineProperty(exports, "AuditService", { enumerable: true, get: function () { return services_1.AuditService; } });
Object.defineProperty(exports, "ChallengeService", { enumerable: true, get: function () { return services_1.ChallengeService; } });
Object.defineProperty(exports, "CredentialService", { enumerable: true, get: function () { return services_1.CredentialService; } });
Object.defineProperty(exports, "TokenService", { enumerable: true, get: function () { return services_1.TokenService; } });
Object.defineProperty(exports, "WalletBasedKusamaService", { enumerable: true, get: function () { return services_1.WalletBasedKusamaService; } });
var routes_1 = require("./routes");
Object.defineProperty(exports, "createAuthRouter", { enumerable: true, get: function () { return routes_1.createAuthRouter; } });
Object.defineProperty(exports, "createClientRouter", { enumerable: true, get: function () { return routes_1.createClientRouter; } });
Object.defineProperty(exports, "createCredentialRouter", { enumerable: true, get: function () { return routes_1.createCredentialRouter; } });
Object.defineProperty(exports, "createTokenRouter", { enumerable: true, get: function () { return routes_1.createTokenRouter; } });
var utils_1 = require("./utils");
Object.defineProperty(exports, "createLogger", { enumerable: true, get: function () { return utils_1.createLogger; } });
var config_1 = require("./config");
Object.defineProperty(exports, "corsConfig", { enumerable: true, get: function () { return config_1.corsConfig; } });
Object.defineProperty(exports, "initializeDatabase", { enumerable: true, get: function () { return config_1.initializeDatabase; } });
Object.defineProperty(exports, "sessionConfig", { enumerable: true, get: function () { return config_1.sessionConfig; } });
exports.default = app_1.default;
//# sourceMappingURL=index.js.map