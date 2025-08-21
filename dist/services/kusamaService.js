"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.kusamaService = exports.defaultKusamaConfig = exports.KusamaService = void 0;
const api_1 = require("@polkadot/api");
const keyring_1 = require("@polkadot/keyring");
const logger_1 = require("../utils/logger");
const logger = (0, logger_1.createLogger)('kusama-service');
class KusamaService {
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
            logger.info('Initializing Kusama service', { endpoint: this.config.endpoint });
            // Create WebSocket provider
            const provider = new api_1.WsProvider(this.config.endpoint);
            // Create API instance
            this.api = await api_1.ApiPromise.create({ provider });
            // Wait for API to be ready
            await this.api.isReady;
            // Initialize keyring if account seed is provided
            if (this.config.accountSeed) {
                this.keyring = new keyring_1.Keyring({ type: this.config.accountType || 'sr25519' });
                this.account = this.keyring.addFromSeed(Buffer.from(this.config.accountSeed, 'hex'));
                logger.info('Kusama account initialized', {
                    address: this.account.address,
                    type: this.config.accountType || 'sr25519',
                });
            }
            this.isConnected = true;
            logger.info('Kusama service initialized successfully');
        }
        catch (error) {
            logger.error('Failed to initialize Kusama service', { error });
            throw new Error(`Kusama initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Store credential reference on Kusama blockchain
     * @param userAddress - Polkadot address of the credential owner
     * @param ipfsHash - IPFS hash of the encrypted credential data
     * @param credentialHash - Hash of the credential for integrity verification
     * @returns Transaction hash and block information
     */
    async storeCredentialReference(userAddress, ipfsHash, credentialHash) {
        if (!this.api || !this.isConnected) {
            throw new Error('Kusama service not initialized');
        }
        if (!this.account) {
            throw new Error('No account configured for transactions');
        }
        try {
            logger.info('Storing credential reference on Kusama', {
                userAddress,
                ipfsHash,
                credentialHash,
            });
            // Create remark with credential data
            const remark = `CREDENTIAL:${userAddress}:${ipfsHash}:${credentialHash}:${Date.now()}`;
            // Create extrinsic
            const extrinsic = this.api.tx.system.remark(remark);
            // Sign and send transaction
            const hash = await extrinsic.signAndSend(this.account, {
                nonce: await this.api.rpc.system.accountNextIndex(this.account.address),
            });
            // Wait for transaction to be included in a block
            const block = { hash: hash.toString() };
            const credentialReference = {
                userAddress,
                ipfsHash,
                credentialHash,
                timestamp: Date.now(),
                blockHash: block.hash.toString(),
                extrinsicHash: hash.toString(),
            };
            logger.info('Successfully stored credential reference on Kusama', credentialReference);
            return credentialReference;
        }
        catch (error) {
            logger.error('Failed to store credential reference on Kusama', { error });
            throw new Error(`Kusama transaction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Retrieve credential references for a user from Kusama blockchain
     * @param userAddress - Polkadot address to search for
     * @param fromBlock - Optional starting block number
     * @returns Array of credential references
     */
    async getCredentialReferences(userAddress, fromBlock) {
        if (!this.api || !this.isConnected) {
            throw new Error('Kusama service not initialized');
        }
        try {
            logger.info('Retrieving credential references from Kusama', { userAddress, fromBlock });
            const references = [];
            // Get current block number
            const currentBlock = await this.api.rpc.chain.getHeader();
            const currentBlockNumber = currentBlock.number.toNumber();
            // Determine starting block
            const startBlock = fromBlock || Math.max(0, currentBlockNumber - 1000); // Default to last 1000 blocks
            // Query events for the specified range
            for (let blockNumber = startBlock; blockNumber <= currentBlockNumber; blockNumber++) {
                try {
                    const blockHash = await this.api.rpc.chain.getBlockHash(blockNumber);
                    const events = await this.api.query.system.events.at(blockHash);
                    // Process events to find credential references
                    if (events && Array.isArray(events)) {
                        events.forEach((event, _index) => {
                            if (event.event?.section === 'system' && event.event?.method === 'Remarked') {
                                const remark = event.event.data[1]?.toString();
                                // Parse credential reference from remark
                                if (remark?.startsWith('CREDENTIAL:')) {
                                    const parts = remark.split(':');
                                    if (parts.length >= 4 && parts[1] === userAddress) {
                                        const reference = {
                                            userAddress: String(parts[1]),
                                            ipfsHash: String(parts[2]),
                                            credentialHash: String(parts[3]),
                                            timestamp: parseInt(String(parts[4])) || Date.now(),
                                            blockHash: blockHash.toString(),
                                            extrinsicHash: event.extrinsic?.hash?.toString() || '',
                                        };
                                        references.push(reference);
                                    }
                                }
                            }
                        });
                    }
                }
                catch (error) {
                    logger.warn(`Failed to process block ${blockNumber}`, { error });
                    continue;
                }
            }
            logger.info('Retrieved credential references from Kusama', {
                userAddress,
                count: references.length,
            });
            return references;
        }
        catch (error) {
            logger.error('Failed to retrieve credential references from Kusama', { error });
            throw new Error(`Kusama query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Verify credential reference exists on Kusama
     * @param ipfsHash - IPFS hash to verify
     * @param credentialHash - Credential hash to verify
     * @returns True if reference exists, false otherwise
     */
    async verifyCredentialReference(ipfsHash, credentialHash) {
        if (!this.api || !this.isConnected) {
            throw new Error('Kusama service not initialized');
        }
        try {
            logger.info('Verifying credential reference on Kusama', { ipfsHash, credentialHash });
            // Get current block number
            const currentBlock = await this.api.rpc.chain.getHeader();
            const currentBlockNumber = currentBlock.number.toNumber();
            // Search last 1000 blocks for the reference
            for (let blockNumber = Math.max(0, currentBlockNumber - 1000); blockNumber <= currentBlockNumber; blockNumber++) {
                try {
                    const blockHash = await this.api.rpc.chain.getBlockHash(blockNumber);
                    const events = await this.api.query.system.events.at(blockHash);
                    if (events && Array.isArray(events)) {
                        for (const event of events) {
                            if (event.event?.section === 'system' && event.event?.method === 'Remarked') {
                                const remark = event.event.data[1]?.toString();
                                if (remark?.includes(ipfsHash) && remark.includes(credentialHash)) {
                                    logger.info('Credential reference verified on Kusama', {
                                        ipfsHash,
                                        credentialHash,
                                        blockNumber,
                                    });
                                    return true;
                                }
                            }
                        }
                    }
                }
                catch (error) {
                    continue;
                }
            }
            logger.warn('Credential reference not found on Kusama', { ipfsHash, credentialHash });
            return false;
        }
        catch (error) {
            logger.error('Failed to verify credential reference on Kusama', { error });
            throw new Error(`Kusama verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Get Kusama network information
     * @returns Network information
     */
    async getNetworkInfo() {
        if (!this.api || !this.isConnected) {
            throw new Error('Kusama service not initialized');
        }
        try {
            const [chain, nodeName, nodeVersion, properties] = await Promise.all([
                this.api.rpc.system.chain(),
                this.api.rpc.system.name(),
                this.api.rpc.system.version(),
                this.api.rpc.system.properties(),
            ]);
            return {
                chain: chain.toString(),
                nodeName: nodeName.toString(),
                nodeVersion: nodeVersion.toString(),
                properties: properties.toHuman(),
            };
        }
        catch (error) {
            logger.error('Failed to get Kusama network info', { error });
            throw new Error(`Failed to get network info: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Test Kusama connection
     * @returns True if connection is successful
     */
    async testConnection() {
        try {
            await this.initialize();
            const networkInfo = await this.getNetworkInfo();
            logger.info('Kusama connection test successful', networkInfo);
            return true;
        }
        catch (error) {
            logger.error('Kusama connection test failed', { error });
            return false;
        }
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
exports.KusamaService = KusamaService;
// Default Kusama configuration
exports.defaultKusamaConfig = {
    endpoint: process.env.KUSAMA_ENDPOINT || 'wss://kusama-rpc.polkadot.io',
    accountSeed: process.env.KUSAMA_ACCOUNT_SEED,
    accountType: process.env.KUSAMA_ACCOUNT_TYPE || 'sr25519',
};
// Create default Kusama service instance
exports.kusamaService = new KusamaService(exports.defaultKusamaConfig);
//# sourceMappingURL=kusamaService.js.map