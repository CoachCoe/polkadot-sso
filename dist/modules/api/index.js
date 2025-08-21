"use strict";
// API Gateway Module
// Re-exports existing API functionality for gradual migration
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestIdMiddleware = exports.createTokenRouter = exports.createHybridCredentialRouter = exports.createCredentialRouter = exports.createClientRouter = exports.createAuthRouter = void 0;
// Route Factories
var auth_1 = require("../../routes/auth");
Object.defineProperty(exports, "createAuthRouter", { enumerable: true, get: function () { return auth_1.createAuthRouter; } });
var clients_1 = require("../../routes/clients");
Object.defineProperty(exports, "createClientRouter", { enumerable: true, get: function () { return clients_1.createClientRouter; } });
var credentials_1 = require("../../routes/credentials");
Object.defineProperty(exports, "createCredentialRouter", { enumerable: true, get: function () { return credentials_1.createCredentialRouter; } });
var hybridCredentials_1 = require("../../routes/hybridCredentials");
Object.defineProperty(exports, "createHybridCredentialRouter", { enumerable: true, get: function () { return hybridCredentials_1.createHybridCredentialRouter; } });
var tokens_1 = require("../../routes/tokens");
Object.defineProperty(exports, "createTokenRouter", { enumerable: true, get: function () { return tokens_1.createTokenRouter; } });
// Middleware
var requestId_1 = require("../../middleware/requestId");
Object.defineProperty(exports, "requestIdMiddleware", { enumerable: true, get: function () { return requestId_1.addRequestId; } });
//# sourceMappingURL=index.js.map