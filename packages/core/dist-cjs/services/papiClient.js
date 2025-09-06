"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPapiClient = exports.PapiClientService = void 0;
const polkadot_api_1 = require("polkadot-api");
const polkadot_1 = require("polkadot-api/chains/polkadot");
const sm_provider_1 = require("polkadot-api/sm-provider");
const smoldot_1 = require("polkadot-api/smoldot");
const node_1 = require("polkadot-api/ws-provider/node");
const logger_1 = require("../utils/logger");
const logger = (0, logger_1.createLogger)('papi-client');
class PapiClientService {
    constructor(config) {
        this.isConnected = false;
        this.config = config;
    }
    async connect() {
        try {
            if (this.config.useLightClient) {
                await this.connectLightClient();
            }
            else {
                await this.connectWebSocket();
            }
            this.isConnected = true;
            logger.info('PAPI client connected successfully', { chain: this.config.chain });
        }
        catch (error) {
            logger.error('Failed to connect PAPI client', { error, chain: this.config.chain });
            throw error;
        }
    }
    async connectLightClient() {
        const smoldot = (0, smoldot_1.start)();
        const chain = await smoldot.addChain({ chainSpec: polkadot_1.chainSpec });
        this.client = (0, polkadot_api_1.createClient)((0, sm_provider_1.getSmProvider)(chain));
    }
    async connectWebSocket() {
        const endpoint = this.config.endpoint || this.getDefaultEndpoint();
        this.client = (0, polkadot_api_1.createClient)((0, node_1.getWsProvider)(endpoint));
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
            logger.info('PAPI client disconnected', { chain: this.config.chain });
        }
    }
    getClient() {
        if (!this.isConnected) {
            throw new Error('PAPI client is not connected');
        }
        return this.client;
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
    async getAccountInfo(address) {
        const client = this.getClient();
        return client.call('Account', 'Account', [address]);
    }
    async getBalance(address) {
        const client = this.getClient();
        const accountInfo = await this.getAccountInfo(address);
        return accountInfo?.data?.free || 0;
    }
    async submitTransaction(tx) {
        const client = this.getClient();
        return client.tx(tx);
    }
    isHealthy() {
        return this.isConnected;
    }
}
exports.PapiClientService = PapiClientService;
const createPapiClient = (config) => {
    return new PapiClientService(config);
};
exports.createPapiClient = createPapiClient;
//# sourceMappingURL=papiClient.js.map