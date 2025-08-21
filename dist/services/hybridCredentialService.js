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
exports.HybridCredentialService = void 0;
const crypto = __importStar(require("crypto"));
// Import from modular structure
const security_1 = require("../modules/security");
const logger_1 = require("../utils/logger");
const logger = (0, logger_1.createLogger)('hybrid-credential-service');
class HybridCredentialService {
    constructor(db, credentialService, ipfsService, kusamaService) {
        this.db = db;
        this.credentialService = credentialService;
        this.ipfsService = ipfsService;
        this.kusamaService = kusamaService;
    }
    /**
     * Initialize the hybrid service
     */
    async initialize() {
        try {
            logger.info('Initializing hybrid credential service');
            // Test IPFS connection
            const ipfsConnected = await this.ipfsService.testConnection();
            if (!ipfsConnected) {
                logger.warn('IPFS connection failed - will use local storage only');
            }
            // Test Kusama connection
            const kusamaConnected = await this.kusamaService.testConnection();
            if (!kusamaConnected) {
                logger.warn('Kusama connection failed - will use local storage only');
            }
            logger.info('Hybrid credential service initialized', {
                ipfsConnected,
                kusamaConnected,
            });
        }
        catch (error) {
            logger.error('Failed to initialize hybrid credential service', { error });
            throw error;
        }
    }
    /**
     * Create a credential using hybrid storage approach
     */
    async createCredential(issuerAddress, userAddress, request) {
        try {
            logger.info('Creating hybrid credential', {
                issuerAddress,
                userAddress,
                storagePreference: request.storage_preference || 'hybrid',
            });
            const storageType = request.storage_preference || 'hybrid';
            const now = Date.now();
            // Encrypt credential data
            const encryptedData = (0, security_1.encryptData)(JSON.stringify(request.credential_data));
            const dataHash = crypto
                .createHash('sha256')
                .update(JSON.stringify(request.credential_data))
                .digest('hex');
            let ipfsHash;
            let kusamaReference;
            // Store on IPFS if requested
            if (storageType === 'ipfs' || storageType === 'hybrid') {
                try {
                    ipfsHash = await this.ipfsService.uploadEncryptedData(encryptedData);
                    // Pin to IPFS if requested
                    if (request.pin_to_ipfs) {
                        await this.ipfsService.pinData(ipfsHash);
                    }
                    logger.info('Credential data stored on IPFS', { ipfsHash });
                }
                catch (error) {
                    logger.error('Failed to store on IPFS, falling back to local storage', { error });
                    // Fall back to local storage
                }
            }
            // Store reference on Kusama if requested
            if ((storageType === 'ipfs' || storageType === 'hybrid') &&
                ipfsHash &&
                request.store_on_kusama) {
                try {
                    kusamaReference = await this.kusamaService.storeCredentialReference(userAddress, ipfsHash, dataHash);
                    logger.info('Credential reference stored on Kusama', { kusamaReference });
                }
                catch (error) {
                    logger.error('Failed to store on Kusama', { error });
                    // Continue without Kusama storage
                }
            }
            // Create credential record
            const credentialId = crypto.randomUUID();
            const credential = {
                id: credentialId,
                user_address: userAddress,
                credential_type_id: request.credential_type_id,
                issuer_address: issuerAddress,
                issuer_name: request.issuer_name,
                credential_data: storageType === 'local' ? encryptedData : '', // Store locally only if not using IPFS
                credential_hash: dataHash,
                proof_signature: request.proof_signature,
                proof_type: request.proof_type,
                status: 'active',
                issued_at: now,
                expires_at: request.expires_at,
                created_at: now,
                updated_at: now,
                metadata: request.metadata ? JSON.stringify(request.metadata) : undefined,
                ipfs_hash: ipfsHash,
                kusama_reference: kusamaReference,
                storage_type: storageType,
            };
            // Store in local database
            await this.db.run(`INSERT INTO credentials (
          id, user_address, credential_type_id, issuer_address, issuer_name,
          credential_data, credential_hash, proof_signature, proof_type,
          status, issued_at, expires_at, created_at, updated_at, metadata,
          ipfs_hash, kusama_block_hash, kusama_extrinsic_hash, storage_type
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                credential.id,
                credential.user_address,
                credential.credential_type_id,
                credential.issuer_address,
                credential.issuer_name,
                credential.credential_data,
                credential.credential_hash,
                credential.proof_signature,
                credential.proof_type,
                credential.status,
                credential.issued_at,
                credential.expires_at,
                credential.created_at,
                credential.updated_at,
                credential.metadata,
                credential.ipfs_hash,
                credential.kusama_reference?.blockHash,
                credential.kusama_reference?.extrinsicHash,
                credential.storage_type,
            ]);
            logger.info('Hybrid credential created successfully', {
                credentialId,
                storageType,
                ipfsHash,
                kusamaReference: kusamaReference ? 'stored' : 'not stored',
            });
            return credential;
        }
        catch (error) {
            logger.error('Failed to create hybrid credential', { error });
            throw error;
        }
    }
    /**
     * Retrieve credential data from appropriate storage
     */
    async getCredentialData(credentialId) {
        try {
            const credential = await this.getCredential(credentialId);
            if (!credential)
                return null;
            let encryptedData;
            // Retrieve from appropriate storage
            if (credential.storage_type === 'ipfs' && credential.ipfs_hash) {
                // Retrieve from IPFS
                encryptedData = await this.ipfsService.retrieveEncryptedData(credential.ipfs_hash);
            }
            else if (credential.storage_type === 'hybrid' && credential.ipfs_hash) {
                // Try IPFS first, fall back to local
                try {
                    encryptedData = await this.ipfsService.retrieveEncryptedData(credential.ipfs_hash);
                }
                catch (error) {
                    logger.warn('Failed to retrieve from IPFS, using local storage', { error });
                    encryptedData = credential.credential_data;
                }
            }
            else {
                // Use local storage
                encryptedData = credential.credential_data;
            }
            // Decrypt and return data
            const decryptedData = (0, security_1.decryptData)(encryptedData);
            return JSON.parse(decryptedData);
        }
        catch (error) {
            logger.error('Failed to get credential data', { credentialId, error });
            return null;
        }
    }
    /**
     * Get credential with hybrid storage information
     */
    async getCredential(id) {
        try {
            const credential = await this.db.get(`SELECT *,
         ipfs_hash,
         kusama_block_hash,
         kusama_extrinsic_hash,
         storage_type
         FROM credentials WHERE id = ?`, [id]);
            if (credential?.kusama_block_hash && credential.kusama_extrinsic_hash) {
                credential.kusama_reference = {
                    userAddress: credential.user_address,
                    ipfsHash: credential.ipfs_hash || '',
                    credentialHash: credential.credential_hash,
                    timestamp: credential.created_at,
                    blockHash: credential.kusama_block_hash,
                    extrinsicHash: credential.kusama_extrinsic_hash,
                };
            }
            return credential;
        }
        catch (error) {
            logger.error('Failed to get credential', { id, error });
            return undefined;
        }
    }
    /**
     * Verify credential integrity across all storage layers
     */
    async verifyCredentialIntegrity(credentialId) {
        const result = {
            valid: true,
            localValid: true,
            ipfsValid: true,
            kusamaValid: true,
            errors: [],
        };
        try {
            const credential = await this.getCredential(credentialId);
            if (!credential) {
                result.valid = false;
                result.errors.push('Credential not found');
                return result;
            }
            // Verify local storage
            if (credential.storage_type === 'local' || credential.storage_type === 'hybrid') {
                try {
                    const localData = await this.getCredentialData(credentialId);
                    if (!localData) {
                        result.localValid = false;
                        result.errors.push('Local data verification failed');
                    }
                }
                catch (error) {
                    result.localValid = false;
                    result.errors.push(`Local verification error: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
            }
            // Verify IPFS storage
            if (credential.storage_type === 'ipfs' || credential.storage_type === 'hybrid') {
                if (credential.ipfs_hash) {
                    try {
                        const exists = await this.ipfsService.dataExists(credential.ipfs_hash);
                        if (!exists) {
                            result.ipfsValid = false;
                            result.errors.push('IPFS data not found');
                        }
                    }
                    catch (error) {
                        result.ipfsValid = false;
                        result.errors.push(`IPFS verification error: ${error instanceof Error ? error.message : 'Unknown error'}`);
                    }
                }
            }
            // Verify Kusama storage
            if (credential.kusama_reference) {
                try {
                    const kusamaValid = await this.kusamaService.verifyCredentialReference(credential.kusama_reference.ipfsHash, credential.kusama_reference.credentialHash);
                    if (!kusamaValid) {
                        result.kusamaValid = false;
                        result.errors.push('Kusama reference not found');
                    }
                }
                catch (error) {
                    result.kusamaValid = false;
                    result.errors.push(`Kusama verification error: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
            }
            result.valid = result.localValid && result.ipfsValid && result.kusamaValid;
            return result;
        }
        catch (error) {
            result.valid = false;
            result.errors.push(`Verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return result;
        }
    }
    /**
     * Migrate credential from local to IPFS storage
     */
    async migrateToIPFS(credentialId) {
        try {
            const credential = await this.getCredential(credentialId);
            if (!credential) {
                throw new Error('Credential not found');
            }
            if (credential.storage_type === 'ipfs' || credential.storage_type === 'hybrid') {
                throw new Error('Credential already uses IPFS storage');
            }
            // Get encrypted data from local storage
            const encryptedData = credential.credential_data;
            // Upload to IPFS
            const ipfsHash = await this.ipfsService.uploadEncryptedData(encryptedData);
            await this.ipfsService.pinData(ipfsHash);
            // Store reference on Kusama
            const kusamaReference = await this.kusamaService.storeCredentialReference(credential.user_address, ipfsHash, credential.credential_hash);
            // Update credential record
            await this.db.run(`UPDATE credentials SET
         ipfs_hash = ?,
         kusama_block_hash = ?,
         kusama_extrinsic_hash = ?,
         storage_type = ?,
         updated_at = ?
         WHERE id = ?`, [
                ipfsHash,
                kusamaReference.blockHash,
                kusamaReference.extrinsicHash,
                'hybrid',
                Date.now(),
                credentialId,
            ]);
            // Return updated credential
            return (await this.getCredential(credentialId));
        }
        catch (error) {
            logger.error('Failed to migrate credential to IPFS', { credentialId, error });
            throw error;
        }
    }
    /**
     * Get storage statistics
     */
    async getStorageStats() {
        try {
            const stats = await this.db.get(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN storage_type = 'local' THEN 1 ELSE 0 END) as local_count,
          SUM(CASE WHEN storage_type = 'ipfs' THEN 1 ELSE 0 END) as ipfs_count,
          SUM(CASE WHEN storage_type = 'hybrid' THEN 1 ELSE 0 END) as hybrid_count,
          SUM(CASE WHEN kusama_block_hash IS NOT NULL THEN 1 ELSE 0 END) as kusama_count
        FROM credentials
      `);
            return {
                totalCredentials: stats.total || 0,
                localStorage: stats.local_count || 0,
                ipfsStorage: stats.ipfs_count || 0,
                hybridStorage: stats.hybrid_count || 0,
                kusamaReferences: stats.kusama_count || 0,
            };
        }
        catch (error) {
            logger.error('Failed to get storage stats', { error });
            throw error;
        }
    }
    // Delegate other methods to the original credential service
    async createUserProfile(address, profile) {
        return this.credentialService.createUserProfile(address, profile);
    }
    async getUserProfile(address) {
        return this.credentialService.getUserProfile(address);
    }
    async createCredentialType(creatorAddress, typeData) {
        return this.credentialService.createCredentialType(creatorAddress, typeData);
    }
    async getCredentialType(id) {
        return this.credentialService.getCredentialType(id);
    }
    async getUserCredentials(userAddress) {
        const credentials = await this.db.all(`SELECT *,
       ipfs_hash,
       kusama_block_hash,
       kusama_extrinsic_hash,
       storage_type
       FROM credentials WHERE user_address = ? ORDER BY created_at DESC`, [userAddress]);
        // Add Kusama reference objects
        return (credentials || []).map(credential => {
            if (credential.kusama_block_hash && credential.kusama_extrinsic_hash) {
                credential.kusama_reference = {
                    userAddress: credential.user_address,
                    ipfsHash: credential.ipfs_hash || '',
                    credentialHash: credential.credential_hash,
                    timestamp: credential.created_at,
                    blockHash: credential.kusama_block_hash,
                    extrinsicHash: credential.kusama_extrinsic_hash,
                };
            }
            return credential;
        });
    }
    async shareCredential(ownerAddress, request) {
        return this.credentialService.shareCredential(ownerAddress, request);
    }
    async getSharedCredentials(userAddress) {
        return this.credentialService.getSharedCredentials(userAddress);
    }
    async verifyCredential(verifierAddress, request) {
        return this.credentialService.verifyCredential(verifierAddress, request);
    }
    async createIssuanceRequest(requesterAddress, request) {
        return this.credentialService.createIssuanceRequest(requesterAddress, request);
    }
}
exports.HybridCredentialService = HybridCredentialService;
//# sourceMappingURL=hybridCredentialService.js.map