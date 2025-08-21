"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ipfsService = exports.defaultIPFSConfig = exports.IPFSService = void 0;
const ipfs_http_client_1 = require("ipfs-http-client");
const logger_1 = require("../utils/logger");
const logger = (0, logger_1.createLogger)('ipfs-service');
class IPFSService {
    constructor(config) {
        this.config = config;
        this.initializeIPFS();
    }
    initializeIPFS() {
        try {
            this.ipfs = (0, ipfs_http_client_1.create)({
                host: this.config.host,
                port: this.config.port,
                protocol: this.config.protocol,
                apiPath: this.config.apiPath || '/api/v0',
            });
            logger.info('IPFS client initialized', {
                host: this.config.host,
                port: this.config.port,
                protocol: this.config.protocol,
            });
        }
        catch (error) {
            logger.error('Failed to initialize IPFS client', { error });
            throw new Error(`IPFS initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Upload encrypted data to IPFS
     * @param encryptedData - The encrypted credential data
     * @returns IPFS hash (CID) of the uploaded data
     */
    async uploadEncryptedData(encryptedData) {
        try {
            logger.info('Uploading encrypted data to IPFS');
            const result = await this.ipfs.add(encryptedData);
            const cid = result.cid.toString();
            logger.info('Successfully uploaded data to IPFS', { cid });
            return cid;
        }
        catch (error) {
            logger.error('Failed to upload data to IPFS', { error });
            throw new Error(`IPFS upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Retrieve encrypted data from IPFS
     * @param ipfsHash - The IPFS hash (CID) of the data
     * @returns The encrypted data as a string
     */
    async retrieveEncryptedData(ipfsHash) {
        try {
            logger.info('Retrieving encrypted data from IPFS', { ipfsHash });
            const chunks = [];
            for await (const chunk of this.ipfs.cat(ipfsHash)) {
                chunks.push(chunk);
            }
            const data = Buffer.concat(chunks).toString('utf8');
            logger.info('Successfully retrieved data from IPFS', { ipfsHash });
            return data;
        }
        catch (error) {
            logger.error('Failed to retrieve data from IPFS', { ipfsHash, error });
            throw new Error(`IPFS retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Check if data exists on IPFS
     * @param ipfsHash - The IPFS hash (CID) to check
     * @returns True if data exists, false otherwise
     */
    async dataExists(ipfsHash) {
        try {
            // Try to get file stats to check if it exists
            await this.ipfs.files.stat(`/ipfs/${ipfsHash}`);
            return true;
        }
        catch (error) {
            return false;
        }
    }
    /**
     * Pin data to IPFS to ensure it stays available
     * @param ipfsHash - The IPFS hash (CID) to pin
     */
    async pinData(ipfsHash) {
        try {
            logger.info('Pinning data to IPFS', { ipfsHash });
            await this.ipfs.pin.add(ipfsHash);
            logger.info('Successfully pinned data to IPFS', { ipfsHash });
        }
        catch (error) {
            logger.error('Failed to pin data to IPFS', { ipfsHash, error });
            throw new Error(`IPFS pin failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Unpin data from IPFS
     * @param ipfsHash - The IPFS hash (CID) to unpin
     */
    async unpinData(ipfsHash) {
        try {
            logger.info('Unpinning data from IPFS', { ipfsHash });
            await this.ipfs.pin.rm(ipfsHash);
            logger.info('Successfully unpinned data from IPFS', { ipfsHash });
        }
        catch (error) {
            logger.error('Failed to unpin data from IPFS', { ipfsHash, error });
            throw new Error(`IPFS unpin failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Get IPFS node information
     * @returns Node information
     */
    async getNodeInfo() {
        try {
            const id = await this.ipfs.id();
            return id;
        }
        catch (error) {
            logger.error('Failed to get IPFS node info', { error });
            throw new Error(`Failed to get IPFS node info: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Test IPFS connection
     * @returns True if connection is successful
     */
    async testConnection() {
        try {
            await this.getNodeInfo();
            logger.info('IPFS connection test successful');
            return true;
        }
        catch (error) {
            logger.error('IPFS connection test failed', { error });
            return false;
        }
    }
}
exports.IPFSService = IPFSService;
// Default IPFS configuration
exports.defaultIPFSConfig = {
    host: process.env.IPFS_HOST || 'ipfs.infura.io',
    port: parseInt(process.env.IPFS_PORT || '5001'),
    protocol: process.env.IPFS_PROTOCOL || 'https',
    apiPath: process.env.IPFS_API_PATH || '/api/v0',
};
// Create default IPFS service instance
exports.ipfsService = new IPFSService(exports.defaultIPFSConfig);
//# sourceMappingURL=ipfsService.js.map