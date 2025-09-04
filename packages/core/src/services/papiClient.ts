import { createClient } from 'polkadot-api';
import { chainSpec } from 'polkadot-api/chains/polkadot';
import { getSmProvider } from 'polkadot-api/sm-provider';
import { start } from 'polkadot-api/smoldot';
import { getWsProvider } from 'polkadot-api/ws-provider/node';
import { createLogger } from '../utils/logger';

const logger = createLogger('papi-client');

export interface PapiClientConfig {
  chain: 'polkadot' | 'kusama';
  endpoint?: string;
  useLightClient?: boolean;
}

export class PapiClientService {
  private client: any;
  private config: PapiClientConfig;
  private isConnected = false;

  constructor(config: PapiClientConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    try {
      if (this.config.useLightClient) {
        await this.connectLightClient();
      } else {
        await this.connectWebSocket();
      }
      this.isConnected = true;
      logger.info('PAPI client connected successfully', { chain: this.config.chain });
    } catch (error) {
      logger.error('Failed to connect PAPI client', { error, chain: this.config.chain });
      throw error;
    }
  }

  private async connectLightClient(): Promise<void> {
    const smoldot = start();
    const chain = await smoldot.addChain({ chainSpec });
    this.client = createClient(getSmProvider(chain));
  }

  private async connectWebSocket(): Promise<void> {
    const endpoint = this.config.endpoint || this.getDefaultEndpoint();
    this.client = createClient(getWsProvider(endpoint));
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
      logger.info('PAPI client disconnected', { chain: this.config.chain });
    }
  }

  getClient() {
    if (!this.isConnected) {
      throw new Error('PAPI client is not connected');
    }
    return this.client;
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

  async getAccountInfo(address: string): Promise<any> {
    const client = this.getClient();
    return client.call('Account', 'Account', [address]);
  }

  async getBalance(address: string): Promise<any> {
    const client = this.getClient();
    const accountInfo = await this.getAccountInfo(address);
    return accountInfo?.data?.free || 0;
  }

  async submitTransaction(tx: any): Promise<string> {
    const client = this.getClient();
    return client.tx(tx);
  }

  isHealthy(): boolean {
    return this.isConnected;
  }
}

export const createPapiClient = (config: PapiClientConfig): PapiClientService => {
  return new PapiClientService(config);
};
