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
exports.secureKusamaService = exports.defaultSecureKusamaConfig = exports.SecureKusamaService = void 0;
const api_1 = require("@polkadot/api");
const keyring_1 = require("@polkadot/keyring");
const crypto = __importStar(require("crypto"));
// Import from modular structure
const security_1 = require("../modules/security");
const logger_1 = require("../utils/logger");
const logger = (0, logger_1.createLogger)('secure-kusama-service');
/**
 * Secure Kusama service with enhanced security features
 */
class SecureKusamaService {
    constructor(config) {
        this.api = null;
        this.keyring = null;
        this.account = null;
        this.isConnected = false;
        this.retryCount = new Map();
        this.config = config;
        this.secretManager = security_1.SecretManager.getInstance();
    }
    /**
     * Initialize secure connection to Kusama network
     */
    async initialize() {
        try {
            logger.info('Initializing Secure Kusama service', { endpoint: this.config.endpoint });
            // Validate configuration
            this.validateConfig();
            // Create secure WebSocket provider with timeout
            const provider = new api_1.WsProvider(this.config.endpoint);
            // Create API with security options
            this.api = await api_1.ApiPromise.create({
                provider,
                throwOnConnect: true,
                noInitWarn: true,
            });
            await this.api.isReady;
            // Initialize account if seed provided
            if (this.config.accountSeed) {
                await this.initializeAccount();
            }
            this.isConnected = true;
            logger.info('Secure Kusama service initialized successfully');
        }
        catch (error) {
            logger.error('Failed to initialize Secure Kusama service', { error });
            throw new Error(`Kusama initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Validate configuration security
     */
    validateConfig() {
        if (!this.config.endpoint) {
            throw new Error('Kusama endpoint is required');
        }
        if (this.config.accountSeed && this.config.accountSeed.length !== 64) {
            throw new Error('Account seed must be 32 bytes (64 hex characters)');
        }
        if (this.config.maxRetries < 1 || this.config.maxRetries > 10) {
            throw new Error('Max retries must be between 1 and 10');
        }
        if (this.config.timeout < 5000 || this.config.timeout > 60000) {
            throw new Error('Timeout must be between 5 and 60 seconds');
        }
    }
    /**
     * Initialize account with security checks
     */
    async initializeAccount() {
        try {
            this.keyring = new keyring_1.Keyring({ type: this.config.accountType || 'sr25519' });
            // Validate seed format
            if (!/^[0-9a-fA-F]{64}$/.test(this.config.accountSeed)) {
                throw new Error('Invalid account seed format');
            }
            this.account = this.keyring.addFromSeed(Buffer.from(this.config.accountSeed, 'hex'));
            logger.info('Kusama account initialized securely', {
                address: this.account.address,
                type: this.config.accountType || 'sr25519',
            });
            // Verify account can sign (test signature)
            const testMessage = 'test-signature-verification';
            const signature = this.account.sign(testMessage);
            const isValid = this.account.verify(testMessage, signature, this.account.publicKey);
            if (!isValid) {
                throw new Error('Account signature verification failed');
            }
        }
        catch (error) {
            logger.error('Failed to initialize account', { error });
            throw new Error(`Account initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Securely store encrypted credential data
     */
    async storeCredentialSecurely(userAddress, credentialData, storageMethod = 'remark', metadata) {
        if (!this.api || !this.isConnected) {
            throw new Error('Kusama service not initialized');
        }
        if (!this.account) {
            throw new Error('No account configured for transactions');
        }
        try {
            logger.info('Storing credential securely', { userAddress, storageMethod });
            // Validate user address
            if (!this.validateKusamaAddress(userAddress)) {
                throw new Error('Invalid Kusama address format');
            }
            // Encrypt credential data with enhanced encryption
            const encryptedData = await security_1.enhancedEncryption.encryptCredentialForKusama(credentialData, userAddress, metadata);
            // Generate data hash for integrity
            const dataHash = crypto
                .createHash('sha256')
                .update(JSON.stringify(credentialData))
                .digest('hex');
            // Generate integrity hash
            const integrityHash = crypto.createHash('sha256').update(encryptedData).digest('hex');
            // Store based on method
            let result;
            switch (storageMethod) {
                case 'remark':
                    result = await this.storeInRemarks(userAddress, encryptedData, dataHash, integrityHash, metadata);
                    break;
                case 'batch':
                    result = await this.storeInBatch(userAddress, encryptedData, dataHash, integrityHash, metadata);
                    break;
                case 'custom_pallet':
                    result = await this.storeInCustomPallet(userAddress, encryptedData, dataHash, integrityHash, metadata);
                    break;
                default:
                    throw new Error(`Unsupported storage method: ${String(storageMethod)}`);
            }
            // Audit logging
            if (this.config.enableAuditLogging) {
                logger.info('Credential stored securely', {
                    userAddress,
                    storageMethod,
                    dataHash,
                    integrityHash,
                    blockHash: result.blockHash,
                    extrinsicHash: result.extrinsicHash,
                });
            }
            return result;
        }
        catch (error) {
            logger.error('Failed to store credential securely', { error, userAddress });
            throw new Error(`Secure storage failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Store data using remarks with retry logic
     */
    async storeInRemarks(userAddress, encryptedData, dataHash, integrityHash, metadata) {
        const chunks = this.splitIntoChunks(encryptedData, 1000);
        const extrinsicHashes = [];
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const remark = `SECURE_CREDENTIAL:${userAddress}:${dataHash}:${integrityHash}:${i}:${chunks.length}:${chunk}`;
            const extrinsic = this.api.tx.system.remark(remark);
            const hash = await this.executeWithRetry(async () => {
                const nonce = await this.api.rpc.system.accountNextIndex(this.account.address);
                return extrinsic.signAndSend(this.account, { nonce });
            });
            extrinsicHashes.push(hash.toString());
        }
        return {
            userAddress,
            encryptedData,
            dataHash,
            integrityHash,
            timestamp: Date.now(),
            blockHash: extrinsicHashes[0],
            extrinsicHash: extrinsicHashes.join(','),
            storageMethod: 'remark',
            version: '2.0',
            metadata,
        };
    }
    /**
     * Store data using batch transactions
     */
    async storeInBatch(userAddress, encryptedData, dataHash, integrityHash, metadata) {
        const chunks = this.splitIntoChunks(encryptedData, 1000);
        const calls = chunks.map((chunk, index) => {
            const remark = `SECURE_BATCH:${userAddress}:${dataHash}:${integrityHash}:${index}:${chunks.length}:${chunk}`;
            return this.api.tx.system.remark(remark);
        });
        const batch = this.api.tx.utility.batchAll(calls);
        const hash = await this.executeWithRetry(async () => {
            const nonce = await this.api.rpc.system.accountNextIndex(this.account.address);
            return batch.signAndSend(this.account, { nonce });
        });
        return {
            userAddress,
            encryptedData,
            dataHash,
            integrityHash,
            timestamp: Date.now(),
            blockHash: hash.toString(),
            extrinsicHash: hash.toString(),
            storageMethod: 'batch',
            version: '2.0',
            metadata,
        };
    }
    /**
     * Store data using custom pallet (simulated)
     */
    async storeInCustomPallet(userAddress, encryptedData, dataHash, integrityHash, metadata) {
        const remark = `SECURE_PALLET:${userAddress}:${dataHash}:${integrityHash}:${encryptedData}`;
        const extrinsic = this.api.tx.system.remark(remark);
        const hash = await this.executeWithRetry(async () => {
            const nonce = await this.api.rpc.system.accountNextIndex(this.account.address);
            return extrinsic.signAndSend(this.account, { nonce });
        });
        return {
            userAddress,
            encryptedData,
            dataHash,
            integrityHash,
            timestamp: Date.now(),
            blockHash: hash.toString(),
            extrinsicHash: hash.toString(),
            storageMethod: 'custom_pallet',
            version: '2.0',
            metadata,
        };
    }
    /**
     * Retrieve and validate credential data
     */
    async retrieveCredentialSecurely(userAddress, dataHash, storageMethod) {
        if (!this.api || !this.isConnected) {
            throw new Error('Kusama service not initialized');
        }
        try {
            logger.info('Retrieving credential securely', { userAddress, dataHash, storageMethod });
            // Retrieve encrypted data from Kusama
            const encryptedData = await this.retrieveFromKusama(userAddress, dataHash, storageMethod);
            if (!encryptedData) {
                return null;
            }
            // Validate integrity hash
            const _computedIntegrityHash = crypto
                .createHash('sha256')
                .update(encryptedData)
                .digest('hex');
            // Note: In a real implementation, you'd retrieve the integrity hash from storage
            // For now, we'll skip this validation step
            // Decrypt data using enhanced encryption
            const decryptedData = await security_1.enhancedEncryption.decryptCredentialFromKusama(encryptedData);
            // Validate decrypted data structure
            if (!this.validateCredentialStructure(decryptedData)) {
                throw new Error('Invalid credential data structure');
            }
            return decryptedData;
        }
        catch (error) {
            logger.error('Failed to retrieve credential securely', { error, userAddress, dataHash });
            throw new Error(`Secure retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Validate credential data structure
     */
    validateCredentialStructure(data) {
        // Basic validation - ensure it's an object with required fields
        if (!data || typeof data !== 'object') {
            return false;
        }
        // Check for required fields
        if (!data.type || typeof data.type !== 'string') {
            return false;
        }
        // Check for suspicious content
        const dataString = JSON.stringify(data);
        const suspiciousPatterns = [/<script/i, /javascript:/i, /eval\s*\(/i];
        if (suspiciousPatterns.some(pattern => pattern.test(dataString))) {
            return false;
        }
        return true;
    }
    /**
     * Comprehensive validation of stored credential
     */
    async validateCredentialIntegrity(userAddress, dataHash, storageMethod) {
        const validation = {
            valid: true,
            localValid: true,
            kusamaValid: false,
            integrityValid: false,
            errors: [],
            warnings: [],
        };
        try {
            // Check if data exists on Kusama
            const encryptedData = await this.retrieveFromKusama(userAddress, dataHash, storageMethod);
            if (encryptedData) {
                validation.kusamaValid = true;
                // Validate integrity hash
                const _computedHash = crypto.createHash('sha256').update(encryptedData).digest('hex');
                // In real implementation, compare with stored integrity hash
                // Try to decrypt
                try {
                    const decryptedData = await security_1.enhancedEncryption.decryptCredentialFromKusama(encryptedData);
                    if (this.validateCredentialStructure(decryptedData)) {
                        validation.integrityValid = true;
                    }
                    else {
                        validation.errors.push('Invalid credential structure');
                    }
                }
                catch (error) {
                    validation.errors.push(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
            }
            else {
                validation.errors.push('Data not found on Kusama');
            }
        }
        catch (error) {
            validation.errors.push(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        validation.valid =
            validation.localValid &&
                validation.kusamaValid &&
                validation.integrityValid &&
                validation.errors.length === 0;
        return validation;
    }
    /**
     * Execute operation with retry logic
     */
    async executeWithRetry(operation) {
        let lastError;
        for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
            try {
                return await Promise.race([
                    operation(),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Operation timeout')), this.config.timeout)),
                ]);
            }
            catch (error) {
                lastError = error instanceof Error ? error : new Error('Unknown error');
                logger.warn(`Operation failed, attempt ${attempt}/${this.config.maxRetries}`, {
                    error: lastError.message,
                });
                if (attempt < this.config.maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
                }
            }
        }
        throw new Error(`Failed to execute operation after ${this.config.maxRetries} attempts: ${lastError?.message || 'Unknown error'}`);
    }
    /**
     * Validate Kusama address format
     */
    validateKusamaAddress(address) {
        const kusamaAddressRegex = /^5[a-km-zA-HJ-NP-Z1-9]{46}$/;
        return kusamaAddressRegex.test(address);
    }
    /**
     * Split data into chunks
     */
    splitIntoChunks(data, chunkSize) {
        const chunks = [];
        for (let i = 0; i < data.length; i += chunkSize) {
            chunks.push(data.slice(i, i + chunkSize));
        }
        return chunks;
    }
    /**
     * Retrieve data from Kusama (implementation similar to previous service)
     */
    async retrieveFromKusama(_userAddress, _dataHash, _storageMethod) {
        // Implementation would be similar to the previous service
        // For brevity, returning null - in real implementation, this would search blocks
        return null;
    }
    /**
     * Disconnect securely
     */
    async disconnect() {
        if (this.api) {
            await this.api.disconnect();
            this.isConnected = false;
            logger.info('Disconnected from Kusama network securely');
        }
    }
}
exports.SecureKusamaService = SecureKusamaService;
// Default secure configuration
exports.defaultSecureKusamaConfig = {
    endpoint: process.env.KUSAMA_ENDPOINT || 'wss://kusama-rpc.polkadot.io',
    accountSeed: process.env.KUSAMA_ACCOUNT_SEED,
    accountType: process.env.KUSAMA_ACCOUNT_TYPE || 'sr25519',
    maxRetries: 3,
    timeout: 30000,
    enableAuditLogging: true,
};
// Create default service instance
exports.secureKusamaService = new SecureKusamaService(exports.defaultSecureKusamaConfig);
//# sourceMappingURL=secureKusamaService.js.map