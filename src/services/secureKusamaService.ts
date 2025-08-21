import { ApiPromise, WsProvider } from '@polkadot/api';
import { Keyring } from '@polkadot/keyring';
import { KeyringPair } from '@polkadot/keyring/types';
import * as crypto from 'crypto';
import { enhancedEncryption } from '../modules/security';
import { createLogger } from '../utils/logger';
const logger = createLogger('secure-kusama-service');
export interface SecureKusamaConfig {
  endpoint: string;
  accountSeed?: string;
  accountType?: 'sr25519' | 'ed25519' | 'ecdsa';
  maxRetries: number;
  timeout: number;
  enableAuditLogging: boolean;
}
export interface SecureCredentialData {
  userAddress: string;
  encryptedData: string;
  dataHash: string;
  integrityHash: string;
  timestamp: number;
  blockHash: string;
  extrinsicHash: string;
  storageMethod: 'remark' | 'batch' | 'custom_pallet';
  version: string;
  metadata?: Record<string, unknown>;
}
export interface StorageValidation {
  valid: boolean;
  localValid: boolean;
  kusamaValid: boolean;
  integrityValid: boolean;
  errors: string[];
  warnings: string[];
}
export class SecureKusamaService {
  private api: ApiPromise | null = null;
  private keyring: Keyring | null = null;
  private account: KeyringPair | null = null;
  private config: SecureKusamaConfig;
  private isConnected: boolean = false;
  constructor(config: SecureKusamaConfig) {
    this.config = config;
  }
  async initialize(): Promise<void> {
    try {
      logger.info('Initializing Secure Kusama service', { endpoint: this.config.endpoint });
      this.validateConfig();
      const provider = new WsProvider(this.config.endpoint);
      this.api = await ApiPromise.create({
        provider,
        throwOnConnect: true,
        noInitWarn: true,
      });
      await this.api.isReady;
      if (this.config.accountSeed) {
        await this.initializeAccount();
      }
      this.isConnected = true;
      logger.info('Secure Kusama service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Secure Kusama service', { error });
      throw new Error(
        `Kusama initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
  private validateConfig(): void {
    if (!this.config.endpoint) {
      throw new Error('Kusama endpoint is required');
    }
    if (this.config.accountSeed && this.config.accountSeed.length !== 64) {
      throw new Error('Account seed must be 32 bytes (64 hex characters)');
    }
    if (this.config.maxRetries < 1 || this.config.maxRetries > 10) {
      throw new Error('Max retries must be between 1 and 10');
    }
    if (this.config.timeout < 5000 || this.config.timeout > 60000) {
      throw new Error('Timeout must be between 5 and 60 seconds');
    }
  }
  private async initializeAccount(): Promise<void> {
    try {
      this.keyring = new Keyring({ type: this.config.accountType || 'sr25519' });
      if (!/^[0-9a-fA-F]{64}$/.test(this.config.accountSeed!)) {
        throw new Error('Invalid account seed format');
      }
      this.account = this.keyring.addFromSeed(Buffer.from(this.config.accountSeed!, 'hex'));
      logger.info('Kusama account initialized securely', {
        address: this.account.address,
        type: this.config.accountType || 'sr25519',
      });
      const testMessage = 'test-signature-verification';
      const signature = this.account.sign(testMessage);
      const isValid = this.account.verify(testMessage, signature, this.account.publicKey);
      if (!isValid) {
        throw new Error('Account signature verification failed');
      }
    } catch (error) {
      logger.error('Failed to initialize account', { error });
      throw new Error(
        `Account initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
  async storeCredentialSecurely(
    userAddress: string,
    credentialData: Record<string, unknown>,
    storageMethod: 'remark' | 'batch' | 'custom_pallet' = 'remark',
    metadata?: Record<string, unknown>
  ): Promise<SecureCredentialData> {
    if (!this.api || !this.isConnected) {
      throw new Error('Kusama service not initialized');
    }
    if (!this.account) {
      throw new Error('No account configured for transactions');
    }
    try {
      logger.info('Storing credential securely', { userAddress, storageMethod });
      if (!this.validateKusamaAddress(userAddress)) {
        throw new Error('Invalid Kusama address format');
      }
      const encryptedData = await enhancedEncryption.encryptCredentialForKusama(
        credentialData,
        userAddress,
        metadata
      );
      const dataHash = crypto
        .createHash('sha256')
        .update(JSON.stringify(credentialData))
        .digest('hex');
      const integrityHash = crypto.createHash('sha256').update(encryptedData).digest('hex');
      let result: SecureCredentialData;
      switch (storageMethod) {
        case 'remark':
          result = await this.storeInRemarks(
            userAddress,
            encryptedData,
            dataHash,
            integrityHash,
            metadata
          );
          break;
        case 'batch':
          result = await this.storeInBatch(
            userAddress,
            encryptedData,
            dataHash,
            integrityHash,
            metadata
          );
          break;
        case 'custom_pallet':
          result = await this.storeInCustomPallet(
            userAddress,
            encryptedData,
            dataHash,
            integrityHash,
            metadata
          );
          break;
        default:
          throw new Error(`Unsupported storage method: ${String(storageMethod)}`);
      }
      if (this.config.enableAuditLogging) {
        logger.info('Credential stored securely', {
          userAddress,
          storageMethod,
          dataHash,
          integrityHash,
          blockHash: result.blockHash,
          extrinsicHash: result.extrinsicHash,
        });
      }
      return result;
    } catch (error) {
      logger.error('Failed to store credential securely', { error, userAddress });
      throw new Error(
        `Secure storage failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
  private async storeInRemarks(
    userAddress: string,
    encryptedData: string,
    dataHash: string,
    integrityHash: string,
    metadata?: Record<string, unknown>
  ): Promise<SecureCredentialData> {
    const chunks = this.splitIntoChunks(encryptedData, 1000);
    const extrinsicHashes: string[] = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const remark = `SECURE_CREDENTIAL:${userAddress}:${dataHash}:${integrityHash}:${i}:${chunks.length}:${chunk}`;
      const extrinsic = this.api!.tx.system.remark(remark);
      const hash = await this.executeWithRetry(async () => {
        const nonce = await this.api!.rpc.system.accountNextIndex(this.account!.address);
        return extrinsic.signAndSend(this.account!, { nonce });
      });
      extrinsicHashes.push(hash.toString());
    }
    return {
      userAddress,
      encryptedData,
      dataHash,
      integrityHash,
      timestamp: Date.now(),
      blockHash: extrinsicHashes[0] || '',
      extrinsicHash: extrinsicHashes.join(','),
      storageMethod: 'remark',
      version: '2.0',
      metadata: metadata || {},
    };
  }
  private async storeInBatch(
    userAddress: string,
    encryptedData: string,
    dataHash: string,
    integrityHash: string,
    metadata?: Record<string, unknown>
  ): Promise<SecureCredentialData> {
    const chunks = this.splitIntoChunks(encryptedData, 1000);
    const calls = chunks.map((chunk, index) => {
      const remark = `SECURE_BATCH:${userAddress}:${dataHash}:${integrityHash}:${index}:${chunks.length}:${chunk}`;
      return this.api!.tx.system.remark(remark);
    });
    const batch = this.api!.tx.utility.batchAll(calls);
    const hash = await this.executeWithRetry(async () => {
      const nonce = await this.api!.rpc.system.accountNextIndex(this.account!.address);
      return batch.signAndSend(this.account!, { nonce });
    });
    return {
      userAddress,
      encryptedData,
      dataHash,
      integrityHash,
      timestamp: Date.now(),
      blockHash: hash.toString(),
      extrinsicHash: hash.toString(),
      storageMethod: 'batch',
      version: '2.0',
      metadata: metadata || {},
    };
  }
  private async storeInCustomPallet(
    userAddress: string,
    encryptedData: string,
    dataHash: string,
    integrityHash: string,
    metadata?: Record<string, unknown>
  ): Promise<SecureCredentialData> {
    const remark = `SECURE_PALLET:${userAddress}:${dataHash}:${integrityHash}:${encryptedData}`;
    const extrinsic = this.api!.tx.system.remark(remark);
    const hash = await this.executeWithRetry(async () => {
      const nonce = await this.api!.rpc.system.accountNextIndex(this.account!.address);
      return extrinsic.signAndSend(this.account!, { nonce });
    });
    return {
      userAddress,
      encryptedData,
      dataHash,
      integrityHash,
      timestamp: Date.now(),
      blockHash: hash.toString(),
      extrinsicHash: hash.toString(),
      storageMethod: 'custom_pallet',
      version: '2.0',
      metadata: metadata || {},
    };
  }
  async retrieveCredentialSecurely(
    userAddress: string,
    dataHash: string,
    storageMethod: 'remark' | 'batch' | 'custom_pallet'
  ): Promise<Record<string, unknown> | null> {
    if (!this.api || !this.isConnected) {
      throw new Error('Kusama service not initialized');
    }
    try {
      logger.info('Retrieving credential securely', { userAddress, dataHash, storageMethod });
      const encryptedData = await this.retrieveFromKusama(userAddress, dataHash, storageMethod);
      if (!encryptedData) {
        return null;
      }
      const decryptedData = await enhancedEncryption.decryptCredentialFromKusama(encryptedData);
      if (!this.validateCredentialStructure(decryptedData)) {
        throw new Error('Invalid credential data structure');
      }
      return decryptedData;
    } catch (error) {
      logger.error('Failed to retrieve credential securely', { error, userAddress, dataHash });
      throw new Error(
        `Secure retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
  private validateCredentialStructure(data: Record<string, unknown>): boolean {
    if (!data || typeof data !== 'object') {
      return false;
    }
    if (!data['type'] || typeof data['type'] !== 'string') {
      return false;
    }
    const dataString = JSON.stringify(data);
    const suspiciousPatterns = [/<script/i, /javascript:/i, /eval\s*\(/i];
    if (suspiciousPatterns.some(pattern => pattern.test(dataString))) {
      return false;
    }
    return true;
  }
  async validateCredentialIntegrity(
    userAddress: string,
    dataHash: string,
    storageMethod: 'remark' | 'batch' | 'custom_pallet'
  ): Promise<StorageValidation> {
    const validation: StorageValidation = {
      valid: true,
      localValid: true,
      kusamaValid: false,
      integrityValid: false,
      errors: [],
      warnings: [],
    };
    try {
      const encryptedData = await this.retrieveFromKusama(userAddress, dataHash, storageMethod);
      if (encryptedData) {
        validation.kusamaValid = true;
        try {
          const decryptedData = await enhancedEncryption.decryptCredentialFromKusama(encryptedData);
          if (this.validateCredentialStructure(decryptedData)) {
            validation.integrityValid = true;
          } else {
            validation.errors.push('Invalid credential structure');
          }
        } catch (error) {
          validation.errors.push(
            `Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      } else {
        validation.errors.push('Data not found on Kusama');
      }
    } catch (error) {
      validation.errors.push(
        `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
    validation.valid =
      validation.localValid &&
      validation.kusamaValid &&
      validation.integrityValid &&
      validation.errors.length === 0;
    return validation;
  }
  private async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error = new Error('Unknown error');
    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await Promise.race([
          operation(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Operation timeout')), this.config.timeout)
          ),
        ]);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        logger.warn(`Operation failed, attempt ${attempt}/${this.config.maxRetries}`, {
          error: lastError.message,
        });
        if (attempt < this.config.maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }
    throw new Error(
      `Failed to execute operation after ${this.config.maxRetries} attempts: ${lastError.message}`
    );
  }
  private validateKusamaAddress(address: string): boolean {
    const kusamaAddressRegex = /^5[a-km-zA-HJ-NP-Z1-9]{46}$/;
    return kusamaAddressRegex.test(address);
  }
  private splitIntoChunks(data: string, chunkSize: number): string[] {
    const chunks: string[] = [];
    for (let i = 0; i < data.length; i += chunkSize) {
      chunks.push(data.slice(i, i + chunkSize));
    }
    return chunks;
  }
  private async retrieveFromKusama(
    _userAddress: string,
    _dataHash: string,
    _storageMethod: 'remark' | 'batch' | 'custom_pallet'
  ): Promise<string | null> {
    return null;
  }
  async disconnect(): Promise<void> {
    if (this.api) {
      await this.api.disconnect();
      this.isConnected = false;
      logger.info('Disconnected from Kusama network securely');
    }
  }
}
export const defaultSecureKusamaConfig: SecureKusamaConfig = {
  endpoint: process.env['KUSAMA_ENDPOINT'] || 'wss://kusama-rpc.polkadot.io',
  accountSeed: process.env['KUSAMA_ACCOUNT_SEED'] || '',
  accountType: (process.env['KUSAMA_ACCOUNT_TYPE'] as 'sr25519' | 'ed25519' | 'ecdsa') || 'sr25519',
  maxRetries: 3,
  timeout: 30000,
  enableAuditLogging: true,
};
export const secureKusamaService = new SecureKusamaService(defaultSecureKusamaConfig);
