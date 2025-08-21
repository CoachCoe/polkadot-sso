import { ApiPromise, WsProvider } from '@polkadot/api';
import { Keyring } from '@polkadot/keyring';
import { KeyringPair } from '@polkadot/keyring/types';
import { createLogger } from '../utils/logger';
const logger = createLogger('kusama-service');
export interface KusamaConfig {
  endpoint: string;
  accountSeed?: string;
  accountType?: 'sr25519' | 'ed25519' | 'ecdsa';
}
export interface CredentialReference {
  userAddress: string;
  ipfsHash: string;
  credentialHash: string;
  timestamp: number;
  blockHash: string;
  extrinsicHash: string;
}
export class KusamaService {
  private api: ApiPromise | null = null;
  private keyring: Keyring | null = null;
  private account: KeyringPair | null = null;
  private config: KusamaConfig;
  private isConnected: boolean = false;
  constructor(config: KusamaConfig) {
    this.config = config;
  }
  async initialize(): Promise<void> {
    try {
      logger.info('Initializing Kusama service', { endpoint: this.config.endpoint });
      const provider = new WsProvider(this.config.endpoint);
      this.api = await ApiPromise.create({ provider });
      await this.api.isReady;
      if (this.config.accountSeed) {
        this.keyring = new Keyring({ type: this.config.accountType || 'sr25519' });
        this.account = this.keyring.addFromSeed(Buffer.from(this.config.accountSeed, 'hex'));
        logger.info('Kusama account initialized', {
          address: this.account.address,
          type: this.config.accountType || 'sr25519',
        });
      }
      this.isConnected = true;
      logger.info('Kusama service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Kusama service', { error });
      throw new Error(
        `Kusama initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
  async storeCredentialReference(
    userAddress: string,
    ipfsHash: string,
    credentialHash: string
  ): Promise<CredentialReference> {
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
      const remark = `CREDENTIAL:${userAddress}:${ipfsHash}:${credentialHash}:${Date.now()}`;
      const extrinsic = this.api.tx['system']['remark'](remark);
      const hash = await extrinsic.signAndSend(this.account, {
        nonce: await this.api.rpc.system.accountNextIndex(this.account.address),
      });
      const block = { hash: hash.toString() };
      const credentialReference: CredentialReference = {
        userAddress,
        ipfsHash,
        credentialHash,
        timestamp: Date.now(),
        blockHash: block.hash.toString(),
        extrinsicHash: hash.toString(),
      };
      logger.info('Successfully stored credential reference on Kusama', credentialReference);
      return credentialReference;
    } catch (error) {
      logger.error('Failed to store credential reference on Kusama', { error });
      throw new Error(
        `Kusama transaction failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
  async getCredentialReferences(
    userAddress: string,
    fromBlock?: number
  ): Promise<CredentialReference[]> {
    if (!this.api || !this.isConnected) {
      throw new Error('Kusama service not initialized');
    }
    try {
      logger.info('Retrieving credential references from Kusama', { userAddress, fromBlock });
      const references: CredentialReference[] = [];
      const currentBlock = await this.api.rpc.chain.getHeader();
      const currentBlockNumber = currentBlock.number.toNumber();
      const startBlock = fromBlock || Math.max(0, currentBlockNumber - 1000);
      for (let blockNumber = startBlock; blockNumber <= currentBlockNumber; blockNumber++) {
        try {
          const blockHash = await this.api.rpc.chain.getBlockHash(blockNumber);
          const events = await this.api.query['system']['events'].at(blockHash);
          if (events && Array.isArray(events)) {
            events.forEach((event: any, _index: number) => {
              if (event.event?.section === 'system' && event.event?.method === 'Remarked') {
                const remark = event.event.data[1]?.toString();
                if (remark?.startsWith('CREDENTIAL:')) {
                  const parts = remark.split(':');
                  if (parts.length >= 4 && parts[1] === userAddress) {
                    const reference: CredentialReference = {
                      userAddress: String(parts[1]),
                      ipfsHash: String(parts[2]),
                      credentialHash: String(parts[3]),
                      timestamp: parseInt(String(parts[4])) || Date.now(),
                      blockHash: blockHash?.toString() || '',
                      extrinsicHash: event.extrinsic?.hash?.toString() || '',
                    };
                    references.push(reference);
                  }
                }
              }
            });
          }
        } catch (error) {
          logger.warn(`Failed to process block ${blockNumber}`, { error });
          continue;
        }
      }
      logger.info('Retrieved credential references from Kusama', {
        userAddress,
        count: references.length,
      });
      return references;
    } catch (error) {
      logger.error('Failed to retrieve credential references from Kusama', { error });
      throw new Error(
        `Kusama query failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
  async verifyCredentialReference(ipfsHash: string, credentialHash: string): Promise<boolean> {
    if (!this.api || !this.isConnected) {
      throw new Error('Kusama service not initialized');
    }
    try {
      logger.info('Verifying credential reference on Kusama', { ipfsHash, credentialHash });
      const currentBlock = await this.api.rpc.chain.getHeader();
      const currentBlockNumber = currentBlock.number.toNumber();
      for (
        let blockNumber = Math.max(0, currentBlockNumber - 1000);
        blockNumber <= currentBlockNumber;
        blockNumber++
      ) {
        try {
          const blockHash = await this.api.rpc.chain.getBlockHash(blockNumber);
          const events = await this.api.query['system']['events'].at(blockHash);
          if (events && Array.isArray(events)) {
            for (const event of events as any[]) {
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
        } catch (error) {
          continue;
        }
      }
      logger.warn('Credential reference not found on Kusama', { ipfsHash, credentialHash });
      return false;
    } catch (error) {
      logger.error('Failed to verify credential reference on Kusama', { error });
      throw new Error(
        `Kusama verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
  async getNetworkInfo(): Promise<any> {
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
    } catch (error) {
      logger.error('Failed to get Kusama network info', { error });
      throw new Error(
        `Failed to get network info: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
  async testConnection(): Promise<boolean> {
    try {
      await this.initialize();
      const networkInfo = await this.getNetworkInfo();
      logger.info('Kusama connection test successful', networkInfo);
      return true;
    } catch (error) {
      logger.error('Kusama connection test failed', { error });
      return false;
    }
  }
  async disconnect(): Promise<void> {
    if (this.api) {
      await this.api.disconnect();
      this.isConnected = false;
      logger.info('Disconnected from Kusama network');
    }
  }
}
export const defaultKusamaConfig: KusamaConfig = {
  endpoint: process.env['KUSAMA_ENDPOINT'] || 'wss://kusama-rpc.polkadot.io',
  accountSeed: process.env['KUSAMA_ACCOUNT_SEED'] || '',
  accountType: (process.env['KUSAMA_ACCOUNT_TYPE'] as 'sr25519' | 'ed25519' | 'ecdsa') || 'sr25519',
};
export const kusamaService = new KusamaService(defaultKusamaConfig);
