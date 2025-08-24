"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTokenRouter = exports.requestIdMiddleware = exports.createCredentialRouter = exports.createClientRouter = exports.createAuthRouter = void 0;
var auth_1 = require("../../routes/auth");
Object.defineProperty(exports, "createAuthRouter", { enumerable: true, get: function () { return auth_1.createAuthRouter; } });
var clients_1 = require("../../routes/clients");
Object.defineProperty(exports, "createClientRouter", { enumerable: true, get: function () { return clients_1.createClientRouter; } });
var credentials_1 = require("../../routes/credentials");
Object.defineProperty(exports, "createCredentialRouter", { enumerable: true, get: function () { return credentials_1.createCredentialRouter; } });
// Removed hybrid credentials router - no longer needed
var requestId_1 = require("../../middleware/requestId");
Object.defineProperty(exports, "requestIdMiddleware", { enumerable: true, get: function () { return requestId_1.addRequestId; } });
var tokens_1 = require("../../routes/tokens");
Object.defineProperty(exports, "createTokenRouter", { enumerable: true, get: function () { return tokens_1.createTokenRouter; } });
//# sourceMappingURL=index.js.map