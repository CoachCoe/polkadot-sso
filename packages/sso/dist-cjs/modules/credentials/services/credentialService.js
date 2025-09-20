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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.CredentialService = void 0;
const crypto = __importStar(require("crypto"));
const logger_1 = require("../../../utils/logger");
const logger = (0, logger_1.createLogger)('credential-service');
class CredentialService {
    constructor() {
        this.credentials = new Map();
    }
    async createCredential(data) {
        const id = crypto.randomUUID();
        const credential = {
            id,
            ...data,
            created_at: Date.now(),
            updated_at: Date.now(),
        };
        this.credentials.set(id, credential);
        logger.info('Credential created', { id });
        return credential;
    }
    async getCredential(id) {
        const credential = this.credentials.get(id);
        if (!credential) {
            throw new Error('Credential not found');
        }
        return credential;
    }
    async listCredentials() {
        return Array.from(this.credentials.values());
    }
}
exports.CredentialService = CredentialService;
//# sourceMappingURL=credentialService.js.map