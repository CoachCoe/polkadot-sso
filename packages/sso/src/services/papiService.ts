import { createClient } from 'polkadot-api';
import { getWsProvider } from 'polkadot-api/ws-provider/node';
import { createLogger } from '../utils/logger';

const logger = createLogger('papi-service');

export interface PapiServiceConfig {
  chain: 'polkadot' | 'kusama';
  endpoint?: string;
}

export class PapiService {
  private client: any;
  private config: PapiServiceConfig;
  private isConnected = false;

  constructor(config: PapiServiceConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    try {
      const endpoint = this.config.endpoint || this.getDefaultEndpoint();
      this.client = createClient(getWsProvider(endpoint));
      this.isConnected = true;
      logger.info('PAPI service connected', { chain: this.config.chain, endpoint });
    } catch (error) {
      logger.error('Failed to connect PAPI service', { error, chain: this.config.chain });
      throw error;
    }
  }

  private getDefaultEndpoint(): string {
    switch (this.config.chain) {
      case 'polkadot':
        return 'wss://rpc.polkadot.io';
      case 'kusama':
        return 'wss://kusama-rpc.polkadot.io';
      default:
        throw new Error(`Unsupported chain: ${this.config.chain}`);
    }
  }

  async disconnect(): Promise<void> {
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

  async getAccountInfo(address: string): Promise<any> {
    const client = this.getClient();
    return client.call('Account', 'Account', [address]);
  }

  async getBalance(address: string): Promise<bigint> {
    const client = this.getClient();
    const accountInfo = await this.getAccountInfo(address);
    return accountInfo?.data?.free || 0n;
  }

  async getLatestBlock(): Promise<any> {
    const client = this.getClient();
    return new Promise((resolve, reject) => {
      const subscription = client.finalizedBlock$.subscribe({
        next: (block: any) => {
          subscription.unsubscribe();
          resolve(block);
        },
        error: reject,
      });
    });
  }

  async submitTransaction(tx: any): Promise<string> {
    const client = this.getClient();
    return client.tx(tx);
  }

  async getChainProperties(): Promise<any> {
    const client = this.getClient();
    return client.call('System', 'Properties');
  }

  async getRuntimeVersion(): Promise<any> {
    const client = this.getClient();
    return client.call('System', 'Version');
  }

  isHealthy(): boolean {
    return this.isConnected;
  }
}

export const createPapiService = (config: PapiServiceConfig): PapiService => {
  return new PapiService(config);
};
