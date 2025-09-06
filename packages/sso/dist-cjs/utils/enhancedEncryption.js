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
exports.decryptData = exports.encryptData = exports.enhancedEncryption = exports.EnhancedEncryption = void 0;
const crypto = __importStar(require("crypto"));
const secrets_1 = require("./secrets");
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 12;
const SALT_LENGTH = 32;
const ITERATIONS = 100000;
const DIGEST = 'sha512';
class EnhancedEncryption {
    constructor() {
        this.secretManager = secrets_1.SecretManager.getInstance();
    }
    static getInstance() {
        if (!EnhancedEncryption.instance) {
            EnhancedEncryption.instance = new EnhancedEncryption();
        }
        return EnhancedEncryption.instance;
    }
    deriveKey(masterKey, salt, purpose) {
        const purposeKey = crypto.pbkdf2Sync(masterKey + purpose, salt, ITERATIONS, KEY_LENGTH, DIGEST);
        return purposeKey;
    }
    generateHMAC(data, key) {
        return crypto.createHmac('sha256', key).update(data).digest('hex');
    }
    async encryptData(data, context, additionalData) {
        try {
            const masterKey = this.secretManager.getSecret('DATABASE_ENCRYPTION_KEY');
            const salt = crypto.randomBytes(SALT_LENGTH);
            const key = this.deriveKey(masterKey, salt, context.purpose);
            const iv = crypto.randomBytes(IV_LENGTH);
            const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
            const aad = Buffer.from(JSON.stringify({
                purpose: context.purpose,
                version: context.version,
                timestamp: context.timestamp,
                userId: context.userId,
            }), 'utf8');
            cipher.setAAD(aad);
            if (additionalData) {
                cipher.setAAD(Buffer.from(additionalData, 'utf8'));
            }
            let encrypted = cipher.update(data, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            const tag = cipher.getAuthTag();
            const encryptedData = {
                version: '2.0',
                algorithm: ALGORITHM,
                salt: salt.toString('hex'),
                iv: iv.toString('hex'),
                tag: tag.toString('hex'),
                encrypted,
                context,
            };
            const hmacKey = this.deriveKey(masterKey, salt, `${context.purpose}_hmac`);
            encryptedData.signature = this.generateHMAC(JSON.stringify({
                version: encryptedData.version,
                algorithm: encryptedData.algorithm,
                salt: encryptedData.salt,
                iv: encryptedData.iv,
                tag: encryptedData.tag,
                encrypted: encryptedData.encrypted,
                context: encryptedData.context,
            }), hmacKey);
            return JSON.stringify(encryptedData);
        }
        catch (error) {
            throw new Error(`Enhanced encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async decryptData(encryptedDataString) {
        try {
            const encryptedData = JSON.parse(encryptedDataString);
            if (encryptedData.version !== '2.0') {
                throw new Error('Unsupported encryption version');
            }
            const masterKey = this.secretManager.getSecret('DATABASE_ENCRYPTION_KEY');
            const salt = Buffer.from(encryptedData.salt, 'hex');
            const iv = Buffer.from(encryptedData.iv, 'hex');
            const tag = Buffer.from(encryptedData.tag, 'hex');
            const hmacKey = this.deriveKey(masterKey, salt, `${encryptedData.context.purpose}_hmac`);
            const expectedSignature = this.generateHMAC(JSON.stringify({
                version: encryptedData.version,
                algorithm: encryptedData.algorithm,
                salt: encryptedData.salt,
                iv: encryptedData.iv,
                tag: encryptedData.tag,
                encrypted: encryptedData.encrypted,
                context: encryptedData.context,
            }), hmacKey);
            if (encryptedData.signature !== expectedSignature) {
                throw new Error('Data integrity check failed - possible tampering detected');
            }
            const key = this.deriveKey(masterKey, salt, encryptedData.context.purpose);
            const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
            const aad = Buffer.from(JSON.stringify({
                purpose: encryptedData.context.purpose,
                version: encryptedData.context.version,
                timestamp: encryptedData.context.timestamp,
                userId: encryptedData.context.userId,
            }), 'utf8');
            decipher.setAAD(aad);
            decipher.setAuthTag(tag);
            let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            return {
                data: decrypted,
                context: encryptedData.context,
            };
        }
        catch (error) {
            throw new Error(`Enhanced decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async encryptCredentialForKusama(credentialData, userAddress, _metadata) {
        const context = {
            purpose: 'kusama',
            version: '2.0',
            timestamp: Date.now(),
            userId: userAddress,
            ...(_metadata && { metadata: _metadata }),
        };
        return this.encryptData(JSON.stringify(credentialData), context);
    }
    async decryptCredentialFromKusama(encryptedData) {
        const result = await this.decryptData(encryptedData);
        if (result.context.purpose !== 'kusama') {
            throw new Error('Invalid encryption context - not a Kusama credential');
        }
        return JSON.parse(result.data);
    }
    generateSecureRandom(length = 32) {
        return crypto.randomBytes(length).toString('hex');
    }
    hashData(data, salt) {
        const dataSalt = salt || crypto.randomBytes(16).toString('hex');
        const hash = crypto.pbkdf2Sync(data, dataSalt, 10000, 64, 'sha512').toString('hex');
        return { hash, salt: dataSalt };
    }
    verifyHash(data, hash, salt) {
        const computedHash = crypto.pbkdf2Sync(data, salt, 10000, 64, 'sha512').toString('hex');
        return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(computedHash, 'hex'));
    }
}
exports.EnhancedEncryption = EnhancedEncryption;
exports.enhancedEncryption = EnhancedEncryption.getInstance();
const encryptData = (_data) => {
    throw new Error('Use enhancedEncryption.encryptCredentialForKusama() for Kusama storage');
};
exports.encryptData = encryptData;
const decryptData = (_data) => {
    throw new Error('Use enhancedEncryption.decryptCredentialFromKusama() for Kusama storage');
};
exports.decryptData = decryptData;
//# sourceMappingURL=enhancedEncryption.js.map