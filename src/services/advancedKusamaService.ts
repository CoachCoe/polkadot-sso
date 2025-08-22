import { ApiPromise, WsProvider } from '@polkadot/api';
import { Keyring } from '@polkadot/keyring';
import { KeyringPair } from '@polkadot/keyring/types';
import * as crypto from 'crypto';
import { decryptData, encryptData } from '../utils/encryption';
import { createLogger } from '../utils/logger';
import KusamaMonitoringService, { TransactionStatus } from './kusamaMonitoringService';
const logger = createLogger('advanced-kusama-service');
export interface KusamaConfig {
  endpoint: string;
  accountSeed?: string;
  accountType?: 'sr25519' | 'ed25519' | 'ecdsa';
}
export interface EncryptedCredentialData {
  userAddress: string;
  encryptedData: string;
  dataHash: string;
  timestamp: number;
  blockHash: string;
  extrinsicHash: string;
  storageMethod: 'remark' | 'batch' | 'custom_pallet';
}
export class AdvancedKusamaService {
  private api: ApiPromise | null = null;
  private keyring: Keyring | null = null;
  private account: KeyringPair | null = null;
  private config: KusamaConfig;
  private isConnected: boolean = false;
  private monitoring: KusamaMonitoringService | null = null;
  constructor(config: KusamaConfig) {
    this.config = config;
  }
  async initialize(): Promise<void> {
    try {
      logger.info('Initializing Advanced Kusama service', { endpoint: this.config.endpoint });
      const provider = new WsProvider(this.config.endpoint);
      this.api = await ApiPromise.create({ provider });
      await this.api.isReady;
      if (this.config.accountSeed && this.config.accountSeed.length >= 32) {
        logger.info('Initializing Kusama account from seed');
        this.keyring = new Keyring({ type: this.config.accountType || 'sr25519' });

        // Convert hex seed to buffer
        let seedBuffer: Buffer;
        if (this.config.accountSeed.startsWith('0x')) {
          seedBuffer = Buffer.from(this.config.accountSeed.slice(2), 'hex');
        } else if (this.config.accountSeed.length === 64) {
          // Assume hex string without 0x prefix
          seedBuffer = Buffer.from(this.config.accountSeed, 'hex');
        } else {
          // Use as-is for other formats
          seedBuffer = Buffer.from(this.config.accountSeed, 'utf8');
        }

        this.account = this.keyring.addFromSeed(seedBuffer);
        logger.info('Kusama account initialized', {
          address: this.account.address,
          type: this.config.accountType || 'sr25519',
        });

        // Check account balance if connected
        try {
          const balance = await this.api.query.system.account(this.account.address);
          const freeBalance = (
            balance as { data: { free: { toString: () => string } } }
          ).data.free.toString();
          logger.info('Account balance check', {
            address: this.account.address,
            freeBalance: `${freeBalance} units`,
            hasBalance: BigInt(freeBalance) > 0n,
          });

          // Warn if balance is low
          if (BigInt(freeBalance) < BigInt('100000000000')) {
            // 0.1 KSM in Planck units
            logger.warn('Account balance is low - may not be sufficient for transactions', {
              address: this.account.address,
              balance: freeBalance,
            });
          }
        } catch (balanceError) {
          logger.warn('Could not check account balance', { error: balanceError });
        }
      } else if (this.config.accountSeed) {
        logger.error('Account seed provided but invalid length (must be at least 32 characters)');
        throw new Error('Invalid account seed length - must be at least 32 characters');
      } else {
        logger.warn('No account seed provided - running in read-only mode');
      }

      // Initialize monitoring service
      this.monitoring = new KusamaMonitoringService(this.api);

      this.isConnected = true;
      logger.info('Advanced Kusama service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Advanced Kusama service', { error });
      throw new Error(
        `Kusama initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
  async storeEncryptedDataInRemarks(
    userAddress: string,
    credentialData: Record<string, unknown>
  ): Promise<EncryptedCredentialData> {
    if (!this.api || !this.isConnected || !this.account) {
      throw new Error('Kusama service not initialized or no account configured');
    }
    try {
      logger.info('Storing encrypted data in Kusama remarks', { userAddress });
      const encryptedData = encryptData(JSON.stringify(credentialData));
      const dataHash = crypto
        .createHash('sha256')
        .update(JSON.stringify(credentialData))
        .digest('hex');
      const chunks = this.splitIntoChunks(encryptedData, 1000);
      const extrinsicHashes: string[] = [];
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const remark = `CREDENTIAL_DATA:${userAddress}:${dataHash}:${i}:${chunks.length}:${chunk}`;
        const extrinsic = this.api.tx['system']['remark'](remark);
        const hash = await extrinsic.signAndSend(this.account, {
          nonce: await this.api.rpc.system.accountNextIndex(this.account.address),
        });
        extrinsicHashes.push(hash.toString());

        // Monitor transaction if monitoring service is available
        if (this.monitoring) {
          this.monitoring
            .monitorTransaction(hash.toString(), (status: TransactionStatus) => {
              logger.info('Transaction status update', {
                chunk: i,
                hash: hash.toString(),
                status: status.status,
                blockNumber: status.blockNumber,
              });
            })
            .catch(error => {
              logger.warn('Transaction monitoring failed', {
                chunk: i,
                hash: hash.toString(),
                error: error instanceof Error ? error.message : 'Unknown error',
              });
            });
        }
      }
      const block = { hash: extrinsicHashes[0] };
      const result: EncryptedCredentialData = {
        userAddress,
        encryptedData,
        dataHash,
        timestamp: Date.now(),
        blockHash: block.hash?.toString() || '',
        extrinsicHash: extrinsicHashes.join(','),
        storageMethod: 'remark',
      };
      logger.info('Successfully stored encrypted data in Kusama remarks', result);
      return result;
    } catch (error) {
      logger.error('Failed to store encrypted data in Kusama remarks', { error });
      throw new Error(
        `Kusama storage failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
  async storeEncryptedDataInBatch(
    userAddress: string,
    credentialData: Record<string, unknown>
  ): Promise<EncryptedCredentialData> {
    if (!this.api || !this.isConnected || !this.account) {
      throw new Error('Kusama service not initialized or no account configured');
    }
    try {
      logger.info('Storing encrypted data in Kusama batch', { userAddress });
      const encryptedData = encryptData(JSON.stringify(credentialData));
      const dataHash = crypto
        .createHash('sha256')
        .update(JSON.stringify(credentialData))
        .digest('hex');
      const chunks = this.splitIntoChunks(encryptedData, 1000);
      const calls = chunks.map((chunk, index) => {
        const remark = `CREDENTIAL_BATCH:${userAddress}:${dataHash}:${index}:${chunks.length}:${chunk}`;
        return this.api!.tx['system']['remark'](remark);
      });
      const batch = this.api.tx['utility']['batchAll'](calls);
      const hash = await batch.signAndSend(this.account, {
        nonce: await this.api.rpc.system.accountNextIndex(this.account.address),
      });
      const block = { hash: hash.toString() };
      const result: EncryptedCredentialData = {
        userAddress,
        encryptedData,
        dataHash,
        timestamp: Date.now(),
        blockHash: block.hash?.toString() || '',
        extrinsicHash: hash.toString(),
        storageMethod: 'batch',
      };
      logger.info('Successfully stored encrypted data in Kusama batch', result);
      return result;
    } catch (error) {
      logger.error('Failed to store encrypted data in Kusama batch', { error });
      throw new Error(
        `Kusama batch storage failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
  async storeEncryptedDataInCustomPallet(
    userAddress: string,
    credentialData: Record<string, unknown>
  ): Promise<EncryptedCredentialData> {
    if (!this.api || !this.isConnected || !this.account) {
      throw new Error('Kusama service not initialized or no account configured');
    }
    try {
      logger.info('Storing encrypted data in custom pallet', { userAddress });
      const encryptedData = encryptData(JSON.stringify(credentialData));
      const dataHash = crypto
        .createHash('sha256')
        .update(JSON.stringify(credentialData))
        .digest('hex');
      const remark = `CREDENTIAL_PALLET:${userAddress}:${dataHash}:${encryptedData}`;
      const extrinsic = this.api.tx['system']['remark'](remark);
      const hash = await extrinsic.signAndSend(this.account, {
        nonce: await this.api.rpc.system.accountNextIndex(this.account.address),
      });
      const block = { hash: hash.toString() };
      const result: EncryptedCredentialData = {
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
    } catch (error) {
      logger.error('Failed to store encrypted data in custom pallet', { error });
      throw new Error(
        `Custom pallet storage failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
  async retrieveEncryptedData(
    userAddress: string,
    dataHash: string,
    storageMethod: 'remark' | 'batch' | 'custom_pallet'
  ): Promise<Record<string, unknown> | null> {
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
        const currentBlock = await this.api.rpc.chain.getHeader();
        const currentBlockNumber = currentBlock.number.toNumber();
        const chunks: string[] = [];
        let totalChunks = 0;
        let foundChunks = 0;
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
          } catch (error) {
            continue;
          }
          if (encryptedData) break;
        }
      } else if (storageMethod === 'custom_pallet') {
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
          } catch (error) {
            continue;
          }
          if (encryptedData) break;
        }
      }
      if (!encryptedData) {
        logger.warn('Encrypted data not found on Kusama', { userAddress, dataHash });
        return null;
      }
      const decryptedData = decryptData(encryptedData);
      const result = JSON.parse(decryptedData);
      logger.info('Successfully retrieved and decrypted data from Kusama', {
        userAddress,
        dataHash,
      });
      return result;
    } catch (error) {
      logger.error('Failed to retrieve encrypted data from Kusama', { error });
      throw new Error(
        `Data retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
  async verifyEncryptedData(
    userAddress: string,
    dataHash: string,
    storageMethod: 'remark' | 'batch' | 'custom_pallet'
  ): Promise<boolean> {
    try {
      const data = await this.retrieveEncryptedData(userAddress, dataHash, storageMethod);
      return data !== null;
    } catch (error) {
      return false;
    }
  }
  async getStorageCostEstimate(
    dataSize: number,
    storageMethod: 'remark' | 'batch' | 'custom_pallet'
  ): Promise<{
    estimatedCost: string;
    transactionCount: number;
    storageMethod: string;
  }> {
    const baseCost = 0.001;
    let transactionCount = 1;
    let costMultiplier = 1;
    if (storageMethod === 'remark') {
      transactionCount = Math.ceil(dataSize / 1000);
      costMultiplier = 1;
    } else if (storageMethod === 'batch') {
      transactionCount = Math.ceil(dataSize / 1000);
      costMultiplier = 0.8;
    } else if (storageMethod === 'custom_pallet') {
      transactionCount = 1;
      costMultiplier = 0.5;
    }
    const estimatedCost = (baseCost * transactionCount * costMultiplier).toFixed(6);
    return {
      estimatedCost: `${estimatedCost} KSM`,
      transactionCount,
      storageMethod,
    };
  }
  private splitIntoChunks(data: string, chunkSize: number): string[] {
    const chunks: string[] = [];
    for (let i = 0; i < data.length; i += chunkSize) {
      chunks.push(data.slice(i, i + chunkSize));
    }
    return chunks;
  }
  /**
   * Get network health information
   */
  async getNetworkHealth() {
    if (!this.monitoring) {
      throw new Error('Monitoring service not initialized');
    }
    return await this.monitoring.getNetworkHealth();
  }

  /**
   * Get active transaction monitors
   */
  getActiveMonitors(): string[] {
    return this.monitoring?.getActiveMonitors() || [];
  }

  /**
   * Stop monitoring a specific transaction
   */
  stopMonitoring(transactionHash: string): void {
    this.monitoring?.stopMonitoring(transactionHash);
  }

  async disconnect(): Promise<void> {
    // Stop all monitoring first
    this.monitoring?.stopAllMonitoring();

    if (this.api) {
      await this.api.disconnect();
      this.isConnected = false;
      logger.info('Disconnected from Kusama network');
    }
  }
}
export const defaultAdvancedKusamaConfig: KusamaConfig = {
  endpoint: process.env['KUSAMA_ENDPOINT'] || 'wss://kusama-rpc.polkadot.io',
  accountSeed: process.env['KUSAMA_ACCOUNT_SEED'] || '',
  accountType: (process.env['KUSAMA_ACCOUNT_TYPE'] as 'sr25519' | 'ed25519' | 'ecdsa') || 'sr25519',
};
export const advancedKusamaService = new AdvancedKusamaService(defaultAdvancedKusamaConfig);
