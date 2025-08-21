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
exports.decryptData = exports.encryptData = exports.validateSecret = exports.generateSecureKey = exports.decryptField = exports.encryptField = void 0;
const crypto = __importStar(require("crypto"));
const secrets_1 = require("./secrets");
// Use a more secure encryption algorithm
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 12; // 96 bits for GCM
// Validate and derive encryption key
function getEncryptionKey() {
    const secretManager = secrets_1.SecretManager.getInstance();
    const envKey = secretManager.getSecret('DATABASE_ENCRYPTION_KEY');
    if (!envKey) {
        throw new Error('DATABASE_ENCRYPTION_KEY environment variable is required');
    }
    if (envKey.length < 32) {
        throw new Error('DATABASE_ENCRYPTION_KEY must be at least 32 characters long');
    }
    // Use the first 32 bytes as the key
    return Buffer.from(envKey).subarray(0, KEY_LENGTH);
}
const encryptField = (text) => {
    try {
        const key = getEncryptionKey();
        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
        cipher.setAAD(Buffer.from('polkadot-sso', 'utf8')); // Additional authenticated data
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const tag = cipher.getAuthTag();
        // Return format: iv:tag:encrypted
        return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
    }
    catch (error) {
        throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
};
exports.encryptField = encryptField;
const decryptField = (encryptedText) => {
    try {
        const key = getEncryptionKey();
        const parts = encryptedText.split(':');
        if (parts.length !== 3) {
            throw new Error('Invalid encrypted data format');
        }
        const [ivHex, tagHex, encrypted] = parts;
        const iv = Buffer.from(ivHex, 'hex');
        const tag = Buffer.from(tagHex, 'hex');
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAAD(Buffer.from('polkadot-sso', 'utf8'));
        decipher.setAuthTag(tag);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
    catch (error) {
        throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
};
exports.decryptField = decryptField;
// Generate a secure random key for environment variables
const generateSecureKey = (length = 64) => {
    return crypto.randomBytes(length).toString('base64');
};
exports.generateSecureKey = generateSecureKey;
// Validate secret strength
const validateSecret = (secret, minLength = 32) => {
    if (!secret || secret.length < minLength) {
        return false;
    }
    // Check for sufficient entropy (basic check)
    const uniqueChars = new Set(secret).size;
    return uniqueChars >= minLength / 2;
};
exports.validateSecret = validateSecret;
exports.encryptData = exports.encryptField;
exports.decryptData = exports.decryptField;
//# sourceMappingURL=encryption.js.map