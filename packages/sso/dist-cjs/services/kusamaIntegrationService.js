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
exports.kusamaIntegrationService = exports.KusamaIntegrationService = void 0;
const crypto = __importStar(require("crypto"));
const encryption_1 = require("../utils/encryption");
const logger_1 = require("../utils/logger");
class KusamaIntegrationService {
    constructor() {
        this.isInitialized = false;
        this.logger = (0, logger_1.createLogger)('kusama-integration');
        const logger = (0, logger_1.createLogger)('kusama-integration');
        logger.debug('Environment variables check', {
            kusamaEndpoint: process.env.KUSAMA_ENDPOINT ? 'configured' : 'not configured',
            kusamaAccountType: process.env.KUSAMA_ACCOUNT_TYPE,
        });
    }
    async initialize() {
        try {
            if (this.isInitialized)
                return true;
            this.logger.info('Initializing Kusama integration service...');
            this.isInitialized = true;
            this.logger.info('✅ Kusama integration service initialized successfully');
            return true;
        }
        catch (error) {
            this.logger.error('Failed to initialize Kusama integration service:', error);
            return false;
        }
    }
    async storeCredential(credentialData, credentialType, userAddress, encryptionKey) {
        try {
            if (!this.isInitialized) {
                await this.initialize();
            }
            const credentialId = `cred_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const dataToEncrypt = JSON.stringify({
                type: credentialType,
                data: credentialData,
                timestamp: Date.now(),
                address: userAddress,
            });
            let encryptedData;
            if (encryptionKey) {
                encryptedData = this.encryptWithUserKey(dataToEncrypt, encryptionKey);
            }
            else {
                encryptedData = (0, encryption_1.encryptData)(dataToEncrypt);
            }
            const credential = {
                id: credentialId,
                type: credentialType,
                data: encryptedData,
                encrypted: !!encryptionKey,
                hash: this.generateHash(dataToEncrypt),
                timestamp: Date.now(),
                address: userAddress,
            };
            this.logger.info(`Storing credential ${credentialId} on Kusama for address ${userAddress}`);
            const result = { extrinsicHash: `mock_hash_${Date.now()}` };
            this.logger.info(`✅ Credential ${credentialId} stored successfully on Kusama`);
            return {
                success: true,
                transactionHash: result.extrinsicHash,
                cost: 0.001,
                credentialId,
            };
        }
        catch (error) {
            this.logger.error('Failed to store credential on Kusama:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }
    async retrieveCredential(credentialId, userAddress, encryptionKey) {
        try {
            if (!this.isInitialized) {
                await this.initialize();
            }
            this.logger.info(`Retrieving credential ${credentialId} from Kusama`);
            const mockCredential = await this.getMockCredential(credentialId);
            if (!mockCredential) {
                throw new Error('Credential not found');
            }
            if (mockCredential.encrypted && encryptionKey) {
                const dataString = String(mockCredential.data);
                const decryptedData = this.decryptWithUserKey(dataString, encryptionKey);
                return JSON.parse(decryptedData);
            }
            else if (mockCredential.encrypted && !encryptionKey) {
                try {
                    const dataString = String(mockCredential.data);
                    const decryptedData = (0, encryption_1.decryptData)(dataString);
                    return JSON.parse(decryptedData);
                }
                catch (error) {
                    throw new Error('Credential is encrypted but no valid decryption key provided');
                }
            }
            else {
                const dataString = String(mockCredential.data);
                return JSON.parse(dataString);
            }
        }
        catch (error) {
            this.logger.error('Failed to retrieve credential from Kusama:', error);
            throw error;
        }
    }
    async getStorageCostEstimate(dataSize) {
        try {
            if (!this.isInitialized) {
                await this.initialize();
            }
            const estimate = 0.001; // Mock estimate
            return estimate;
        }
        catch (error) {
            this.logger.error('Failed to get storage cost estimate:', error);
            return 0;
        }
    }
    async verifyCredential(credential) {
        try {
            const dataString = JSON.stringify({
                type: credential.type,
                data: credential.data,
                timestamp: credential.timestamp,
                address: credential.address,
            });
            const expectedHash = this.generateHash(dataString);
            return expectedHash === credential.hash;
        }
        catch (error) {
            this.logger.error('Failed to verify credential:', error);
            return false;
        }
    }
    async listUserCredentials(userAddress) {
        try {
            if (!this.isInitialized) {
                await this.initialize();
            }
            return this.getMockUserCredentials(userAddress);
        }
        catch (error) {
            this.logger.error('Failed to list user credentials:', error);
            return [];
        }
    }
    async getNetworkHealth() {
        try {
            if (!this.isInitialized) {
                await this.initialize();
            }
            return { status: 'healthy', peers: 10, latency: 100 };
        }
        catch (error) {
            this.logger.error('Failed to get network health:', error);
            throw error;
        }
    }
    async getActiveMonitors() {
        try {
            if (!this.isInitialized) {
                await this.initialize();
            }
            return [];
        }
        catch (error) {
            this.logger.error('Failed to get active monitors:', error);
            return [];
        }
    }
    generateHash(data) {
        return crypto.createHash('sha256').update(data).digest('hex');
    }
    encryptWithUserKey(data, userKey) {
        if (userKey.length < 32) {
            throw new Error('Encryption key must be at least 32 characters long');
        }
        const key = crypto.scryptSync(userKey, 'polkadot-sso-salt', 32);
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
        cipher.setAAD(Buffer.from('kusama-credential', 'utf8'));
        let encrypted = cipher.update(data, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const tag = cipher.getAuthTag();
        return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
    }
    decryptWithUserKey(encryptedData, userKey) {
        const parts = encryptedData.split(':');
        if (parts.length !== 3) {
            throw new Error('Invalid encrypted data format');
        }
        const [ivHex, tagHex, encrypted] = parts;
        const iv = Buffer.from(ivHex, 'hex');
        const tag = Buffer.from(tagHex, 'hex');
        const key = crypto.scryptSync(userKey, 'polkadot-sso-salt', 32);
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAAD(Buffer.from('kusama-credential', 'utf8'));
        decipher.setAuthTag(tag);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
    async getMockCredential(credentialId) {
        const mockCredentials = this.getMockUserCredentials('5Dy3rM7WVhwv58ogVn1RGK9rmnq7HwUBqeZheT9U5B26mXZd');
        return mockCredentials.find(c => c.id === credentialId) || null;
    }
    getMockUserCredentials(userAddress) {
        return [
            {
                id: 'cred_1234567890_abc123',
                type: 'academic_degree',
                data: JSON.stringify({
                    type: 'academic_degree',
                    data: {
                        institution: 'University of Example',
                        degree: 'Bachelor of Science',
                        year: '2023',
                        field: 'Computer Science',
                    },
                    timestamp: Date.now(),
                    address: userAddress,
                }),
                encrypted: false,
                hash: 'mock_hash_123',
                timestamp: Date.now(),
                address: userAddress,
            },
            {
                id: 'cred_1234567891_def456',
                type: 'professional_certification',
                data: JSON.stringify({
                    type: 'professional_certification',
                    data: {
                        organization: 'Blockchain Institute',
                        certification: 'Polkadot Developer',
                        year: '2024',
                        level: 'Advanced',
                    },
                    timestamp: Date.now(),
                    address: userAddress,
                }),
                encrypted: true,
                hash: 'mock_hash_456',
                timestamp: Date.now(),
                address: userAddress,
            },
        ];
    }
}
exports.KusamaIntegrationService = KusamaIntegrationService;
exports.kusamaIntegrationService = new KusamaIntegrationService();
//# sourceMappingURL=kusamaIntegrationService.js.map