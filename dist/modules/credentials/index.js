"use strict";
// Credentials Core Module
// Re-exports existing credential functionality for gradual migration
Object.defineProperty(exports, "__esModule", { value: true });
exports.HybridCredentialService = exports.CredentialService = void 0;
// Services
var credentialService_1 = require("../../services/credentialService");
Object.defineProperty(exports, "CredentialService", { enumerable: true, get: function () { return credentialService_1.CredentialService; } });
var hybridCredentialService_1 = require("../../services/hybridCredentialService");
Object.defineProperty(exports, "HybridCredentialService", { enumerable: true, get: function () { return hybridCredentialService_1.HybridCredentialService; } });
//# sourceMappingURL=index.js.map