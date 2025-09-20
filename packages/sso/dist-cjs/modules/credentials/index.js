"use strict";
// Credential Management Module
// Centralized exports for credential functionality
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CREDENTIAL_MODULE_CONFIG = exports.createCredentialRouter = exports.CredentialService = void 0;
// Services
var credentialService_1 = require("./services/credentialService");
Object.defineProperty(exports, "CredentialService", { enumerable: true, get: function () { return credentialService_1.CredentialService; } });
// Routes
var credentials_1 = require("./routes/credentials");
Object.defineProperty(exports, "createCredentialRouter", { enumerable: true, get: function () { return credentials_1.createCredentialRouter; } });
// Types
__exportStar(require("./types/credential"), exports);
// Utils
__exportStar(require("./utils/credentialUtils"), exports);
// Module configuration
exports.CREDENTIAL_MODULE_CONFIG = {
    name: 'Credentials Core',
    dependencies: ['security', 'storage'],
    initOrder: 4,
    enabled: true,
    description: 'Credential and password management functionality'
};
//# sourceMappingURL=index.js.map