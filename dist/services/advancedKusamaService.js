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
exports.advancedKusamaService = exports.defaultAdvancedKusamaConfig = exports.AdvancedKusamaService = void 0;
const api_1 = require("@polkadot/api");
const keyring_1 = require("@polkadot/keyring");
const crypto = __importStar(require("crypto"));
const encryption_1 = require("../utils/encryption");
const logger_1 = require("../utils/logger");
const logger = (0, logger_1.createLogger)('advanced-kusama-service');
class AdvancedKusamaService {
    constructor(config) {
        this.api = null;
        this.keyring = null;
        this.account = null;
        this.isConnected = false;
        this.config = config;
    }
    /**
     * Initialize connection to Kusama network
     */
    async initialize() {
        try {
            logger.info('Initializing Advanced Kusama service', { endpoint: this.config.endpoint });
            const provider = new api_1.WsProvider(this.config.endpoint);
            this.api = await api_1.ApiPromise.create({ provider });
            await this.api.isReady;
            if (this.config.accountSeed) {
                this.keyring = new keyring_1.Keyring({ type: this.config.accountType || 'sr25519' });
                this.account = this.keyring.addFromSeed(Buffer.from(this.config.accountSeed, 'hex'));
                logger.info('Kusama account initialized', {
                    address: this.account.address,
                    type: this.config.accountType || 'sr25519',
                });
            }
            this.isConnected = true;
            logger.info('Advanced Kusama service initialized successfully');
        }
        catch (error) {
            logger.error('Failed to initialize Advanced Kusama service', { error });
            throw new Error(`Kusama initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Method 1: Store encrypted data in Kusama remarks (limited size)
     */
    async storeEncryptedDataInRemarks(userAddress, credentialData) {
        if (!this.api || !this.isConnected || !this.account) {
            throw new Error('Kusama service not initialized or no account configured');
        }
        try {
            logger.info('Storing encrypted data in Kusama remarks', { userAddress });
            // Encrypt the credential data
            const encryptedData = (0, encryption_1.encryptData)(JSON.stringify(credentialData));
            const dataHash = crypto
                .createHash('sha256')
                .update(JSON.stringify(credentialData))
                .digest('hex');
            // Split encrypted data into chunks (Kusama remarks have size limits)
            const chunks = this.splitIntoChunks(encryptedData, 1000); // 1000 chars per chunk
            const extrinsicHashes = [];
            // Store each chunk as a separate remark
            for (let i = 0; i < chunks.length; i++) {
                const chunk = chunks[i];
                const remark = `CREDENTIAL_DATA:${userAddress}:${dataHash}:${i}:${chunks.length}:${chunk}`;
                const extrinsic = this.api.tx.system.remark(remark);
                const hash = await extrinsic.signAndSend(this.account, {
                    nonce: await this.api.rpc.system.accountNextIndex(this.account.address),
                });
                extrinsicHashes.push(hash.toString());
            }
            const block = { hash: extrinsicHashes[0] }; // Use first transaction hash as block reference
            const result = {
                userAddress,
                encryptedData,
                dataHash,
                timestamp: Date.now(),
                blockHash: block.hash.toString(),
                extrinsicHash: extrinsicHashes.join(','),
                storageMethod: 'remark',
            };
            logger.info('Successfully stored encrypted data in Kusama remarks', result);
            return result;
        }
        catch (error) {
            logger.error('Failed to store encrypted data in Kusama remarks', { error });
            throw new Error(`Kusama storage failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Method 2: Store encrypted data using batch calls (more efficient)
     */
    async storeEncryptedDataInBatch(userAddress, credentialData) {
        if (!this.api || !this.isConnected || !this.account) {
            throw new Error('Kusama service not initialized or no account configured');
        }
        try {
            logger.info('Storing encrypted data in Kusama batch', { userAddress });
            // Encrypt the credential data
            const encryptedData = (0, encryption_1.encryptData)(JSON.stringify(credentialData));
            const dataHash = crypto
                .createHash('sha256')
                .update(JSON.stringify(credentialData))
                .digest('hex');
            // Split into chunks
            const chunks = this.splitIntoChunks(encryptedData, 1000);
            // Create batch of remark calls
            const calls = chunks.map((chunk, index) => {
                const remark = `CREDENTIAL_BATCH:${userAddress}:${dataHash}:${index}:${chunks.length}:${chunk}`;
                return this.api.tx.system.remark(remark);
            });
            // Execute batch transaction
            const batch = this.api.tx.utility.batchAll(calls);
            const hash = await batch.signAndSend(this.account, {
                nonce: await this.api.rpc.system.accountNextIndex(this.account.address),
            });
            const block = { hash: hash.toString() };
            const result = {
                userAddress,
                encryptedData,
                dataHash,
                timestamp: Date.now(),
                blockHash: block.hash.toString(),
                extrinsicHash: hash.toString(),
                storageMethod: 'batch',
            };
            logger.info('Successfully stored encrypted data in Kusama batch', result);
            return result;
        }
        catch (error) {
            logger.error('Failed to store encrypted data in Kusama batch', { error });
            throw new Error(`Kusama batch storage failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Method 3: Store encrypted data using custom pallet (most efficient)
     * Note: This requires a custom pallet to be deployed on Kusama
     */
    async storeEncryptedDataInCustomPallet(userAddress, credentialData) {
        if (!this.api || !this.isConnected || !this.account) {
            throw new Error('Kusama service not initialized or no account configured');
        }
        try {
            logger.info('Storing encrypted data in custom pallet', { userAddress });
            // Encrypt the credential data
            const encryptedData = (0, encryption_1.encryptData)(JSON.stringify(credentialData));
            const dataHash = crypto
                .createHash('sha256')
                .update(JSON.stringify(credentialData))
                .digest('hex');
            // This would call a custom pallet method if available
            // For now, we'll simulate it with a remark that includes the full data
            const remark = `CREDENTIAL_PALLET:${userAddress}:${dataHash}:${encryptedData}`;
            const extrinsic = this.api.tx.system.remark(remark);
            const hash = await extrinsic.signAndSend(this.account, {
                nonce: await this.api.rpc.system.accountNextIndex(this.account.address),
            });
            const block = { hash: hash.toString() };
            const result = {
                userAddress,
                encryptedData,
                dataHash,
                timestamp: Date.now(),
                blockHash: block.hash.toString(),
                extrinsicHash: hash.toString(),
                storageMethod: 'custom_pallet',
            };
            logger.info('Successfully stored encrypted data in custom pallet', result);
            return result;
        }
        catch (error) {
            logger.error('Failed to store encrypted data in custom pallet', { error });
            throw new Error(`Custom pallet storage failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Retrieve encrypted data from Kusama
     */
    async retrieveEncryptedData(userAddress, dataHash, storageMethod) {
        if (!this.api || !this.isConnected) {
            throw new Error('Kusama service not initialized');
        }
        try {
            logger.info('Retrieving encrypted data from Kusama', {
                userAddress,
                dataHash,
                storageMethod,
            });
            let encryptedData = '';
            if (storageMethod === 'remark' || storageMethod === 'batch') {
                // Retrieve data from remarks
                const currentBlock = await this.api.rpc.chain.getHeader();
                const currentBlockNumber = currentBlock.number.toNumber();
                const chunks = [];
                let totalChunks = 0;
                let foundChunks = 0;
                // Search last 1000 blocks for the data chunks
                for (let blockNumber = Math.max(0, currentBlockNumber - 1000); blockNumber <= currentBlockNumber; blockNumber++) {
                    try {
                        const blockHash = await this.api.rpc.chain.getBlockHash(blockNumber);
                        const events = await this.api.query.system.events.at(blockHash);
                        if (events && Array.isArray(events)) {
                            for (const event of events) {
                                if (event.event?.section === 'system' && event.event?.method === 'Remarked') {
                                    const remark = event.event.data[1]?.toString();
                                    if (remark?.includes(dataHash) && remark.includes(userAddress)) {
                                        const parts = remark.split(':');
                                        if (parts.length >= 6) {
                                            const chunkIndex = parseInt(String(parts[3]));
                                            const chunkTotal = parseInt(String(parts[4]));
                                            const chunkData = String(parts[5]);
                                            if (chunkIndex === 0) {
                                                totalChunks = chunkTotal;
                                            }
                                            chunks[chunkIndex] = chunkData;
                                            foundChunks++;
                                            if (foundChunks === totalChunks) {
                                                encryptedData = chunks.join('');
                                                break;
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                    catch (error) {
                        continue;
                    }
                    if (encryptedData)
                        break;
                }
            }
            else if (storageMethod === 'custom_pallet') {
                // Retrieve from custom pallet (simulated)
                const currentBlock = await this.api.rpc.chain.getHeader();
                const currentBlockNumber = currentBlock.number.toNumber();
                for (let blockNumber = Math.max(0, currentBlockNumber - 1000); blockNumber <= currentBlockNumber; blockNumber++) {
                    try {
                        const blockHash = await this.api.rpc.chain.getBlockHash(blockNumber);
                        const events = await this.api.query.system.events.at(blockHash);
                        if (events && Array.isArray(events)) {
                            for (const event of events) {
                                if (event.event?.section === 'system' && event.event?.method === 'Remarked') {
                                    const remark = event.event.data[1]?.toString();
                                    if (remark?.includes(`CREDENTIAL_PALLET:${userAddress}:${dataHash}`)) {
                                        const parts = remark.split(':');
                                        if (parts.length >= 4) {
                                            encryptedData = String(parts[3]);
                                            break;
                                        }
                                    }
                                }
                            }
                        }
                    }
                    catch (error) {
                        continue;
                    }
                    if (encryptedData)
                        break;
                }
            }
            if (!encryptedData) {
                logger.warn('Encrypted data not found on Kusama', { userAddress, dataHash });
                return null;
            }
            // Decrypt the data
            const decryptedData = (0, encryption_1.decryptData)(encryptedData);
            const result = JSON.parse(decryptedData);
            logger.info('Successfully retrieved and decrypted data from Kusama', {
                userAddress,
                dataHash,
            });
            return result;
        }
        catch (error) {
            logger.error('Failed to retrieve encrypted data from Kusama', { error });
            throw new Error(`Data retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Verify encrypted data exists on Kusama
     */
    async verifyEncryptedData(userAddress, dataHash, storageMethod) {
        try {
            const data = await this.retrieveEncryptedData(userAddress, dataHash, storageMethod);
            return data !== null;
        }
        catch (error) {
            return false;
        }
    }
    /**
     * Get storage cost estimate
     */
    async getStorageCostEstimate(dataSize, storageMethod) {
        const baseCost = 0.001; // Base KSM cost per transaction
        let transactionCount = 1;
        let costMultiplier = 1;
        if (storageMethod === 'remark') {
            // Each remark can store ~1000 characters
            transactionCount = Math.ceil(dataSize / 1000);
            costMultiplier = 1;
        }
        else if (storageMethod === 'batch') {
            // Batch transactions are more efficient
            transactionCount = Math.ceil(dataSize / 1000);
            costMultiplier = 0.8; // 20% discount for batching
        }
        else if (storageMethod === 'custom_pallet') {
            // Custom pallet is most efficient
            transactionCount = 1;
            costMultiplier = 0.5; // 50% discount for custom pallet
        }
        const estimatedCost = (baseCost * transactionCount * costMultiplier).toFixed(6);
        return {
            estimatedCost: `${estimatedCost} KSM`,
            transactionCount,
            storageMethod,
        };
    }
    /**
     * Split data into chunks for storage
     */
    splitIntoChunks(data, chunkSize) {
        const chunks = [];
        for (let i = 0; i < data.length; i += chunkSize) {
            chunks.push(data.slice(i, i + chunkSize));
        }
        return chunks;
    }
    /**
     * Disconnect from Kusama network
     */
    async disconnect() {
        if (this.api) {
            await this.api.disconnect();
            this.isConnected = false;
            logger.info('Disconnected from Kusama network');
        }
    }
}
exports.AdvancedKusamaService = AdvancedKusamaService;
// Default configuration
exports.defaultAdvancedKusamaConfig = {
    endpoint: process.env.KUSAMA_ENDPOINT || 'wss://kusama-rpc.polkadot.io',
    accountSeed: process.env.KUSAMA_ACCOUNT_SEED,
    accountType: process.env.KUSAMA_ACCOUNT_TYPE || 'sr25519',
};
// Create default service instance
exports.advancedKusamaService = new AdvancedKusamaService(exports.defaultAdvancedKusamaConfig);
//# sourceMappingURL=advancedKusamaService.js.map