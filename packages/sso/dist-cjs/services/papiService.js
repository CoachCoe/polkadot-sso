"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPapiService = exports.PapiService = void 0;
const polkadot_api_1 = require("polkadot-api");
const node_1 = require("polkadot-api/ws-provider/node");
const logger_1 = require("../utils/logger");
const logger = (0, logger_1.createLogger)('papi-service');
class PapiService {
    constructor(config) {
        this.isConnected = false;
        this.config = config;
    }
    async connect() {
        try {
            const endpoint = this.config.endpoint || this.getDefaultEndpoint();
            this.client = (0, polkadot_api_1.createClient)((0, node_1.getWsProvider)(endpoint));
            this.isConnected = true;
            logger.info('PAPI service connected', { chain: this.config.chain, endpoint });
        }
        catch (error) {
            logger.error('Failed to connect PAPI service', { error, chain: this.config.chain });
            throw error;
        }
    }
    getDefaultEndpoint() {
        switch (this.config.chain) {
            case 'polkadot':
                return 'wss://rpc.polkadot.io';
            case 'kusama':
                return 'wss://kusama-rpc.polkadot.io';
            default:
                throw new Error(`Unsupported chain: ${this.config.chain}`);
        }
    }
    async disconnect() {
        if (this.client && this.isConnected) {
            await this.client.destroy();
            this.isConnected = false;
            logger.info('PAPI service disconnected', { chain: this.config.chain });
        }
    }
    getClient() {
        if (!this.isConnected) {
            throw new Error('PAPI service is not connected');
        }
        return this.client;
    }
    async getAccountInfo(address) {
        const client = this.getClient();
        return client.call('Account', 'Account', [address]);
    }
    async getBalance(address) {
        const client = this.getClient();
        const accountInfo = await this.getAccountInfo(address);
        return accountInfo?.data?.free || 0n;
    }
    async getLatestBlock() {
        const client = this.getClient();
        return new Promise((resolve, reject) => {
            const subscription = client.finalizedBlock$.subscribe({
                next: (block) => {
                    subscription.unsubscribe();
                    resolve(block);
                },
                error: reject,
            });
        });
    }
    async submitTransaction(tx) {
        const client = this.getClient();
        return client.tx(tx);
    }
    async getChainProperties() {
        const client = this.getClient();
        return client.call('System', 'Properties');
    }
    async getRuntimeVersion() {
        const client = this.getClient();
        return client.call('System', 'Version');
    }
    isHealthy() {
        return this.isConnected;
    }
}
exports.PapiService = PapiService;
const createPapiService = (config) => {
    return new PapiService(config);
};
exports.createPapiService = createPapiService;
//# sourceMappingURL=papiService.js.map