/**
 * PAPI (Polkadot API) Service
 * Provides blockchain connectivity and data access for multiple chains
 * Following the same patterns as GoogleAuthService and TelegramAuthService
 */

import { ApiPromise, WsProvider } from '@polkadot/api';
import { createLogger } from '../utils/logger.js';
import { getValidatedEnv } from '../utils/envValidation.js';
import { getDatabaseConnection, releaseDatabaseConnection } from '../config/db.js';
import { generateSecureUUID } from '../utils/crypto.js';
import {
  PAPIChainConfig,
  ChainInfo,
  AccountBalance,
  AccountInfo,
  TransactionInfo,
  ChainEvent,
  PAPIConfig,
  PAPIClient,
  PAPIResponse,
  ChainNotSupportedError,
  ChainConnectionError,
  TransactionError,
} from '../types/papi.js';

const logger = createLogger('papi-service');

export class PAPIService {
  private config!: PAPIConfig;
  private clients: Map<string, PAPIClient> = new Map();
  private apis: Map<string, ApiPromise> = new Map();
  private isInitialized = false;

  constructor() {
    const env = getValidatedEnv();
    
    if (!env.PAPI_ENABLED) {
      logger.info('PAPI service disabled via configuration');
      return;
    }

    this.config = {
      chains: this.buildChainConfigs(env),
      defaultTimeout: env.PAPI_DEFAULT_TIMEOUT,
      maxRetries: env.PAPI_MAX_RETRIES,
      connectionPoolSize: env.PAPI_CONNECTION_POOL_SIZE,
      enableEventStreaming: env.PAPI_ENABLE_EVENT_STREAMING,
      enableTransactionTracking: env.PAPI_ENABLE_TRANSACTION_TRACKING,
    };

    logger.info('PAPI service initialized', {
      chainsCount: this.config.chains.length,
      enabledChains: this.config.chains.filter(c => c.isEnabled).length,
      defaultTimeout: this.config.defaultTimeout,
      maxRetries: this.config.maxRetries,
    });
  }

  private buildChainConfigs(env: any): PAPIChainConfig[] {
    const chains: PAPIChainConfig[] = [];

    // Kusama
    if (env.KUSAMA_RPC_URL) {
      chains.push({
        name: 'kusama',
        displayName: 'Kusama',
        rpcUrl: env.KUSAMA_RPC_URL,
        chainId: '0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe',
        ss58Format: 2,
        decimals: 12,
        tokenSymbol: 'KSM',
        isEnabled: true,
        timeout: env.PAPI_DEFAULT_TIMEOUT,
        retryAttempts: env.PAPI_MAX_RETRIES,
      });
    }

    // Polkadot
    if (env.POLKADOT_RPC_URL) {
      chains.push({
        name: 'polkadot',
        displayName: 'Polkadot',
        rpcUrl: env.POLKADOT_RPC_URL,
        chainId: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
        ss58Format: 0,
        decimals: 10,
        tokenSymbol: 'DOT',
        isEnabled: true,
        timeout: env.PAPI_DEFAULT_TIMEOUT,
        retryAttempts: env.PAPI_MAX_RETRIES,
      });
    }

    // Westend
    if (env.WESTEND_RPC_URL) {
      chains.push({
        name: 'westend',
        displayName: 'Westend',
        rpcUrl: env.WESTEND_RPC_URL,
        chainId: '0xe143f23803ac50e8f6f8e62695d1ce9e4e1d68aa36c1cd2cfd15340213f3423e',
        ss58Format: 42,
        decimals: 12,
        tokenSymbol: 'WND',
        isEnabled: true,
        timeout: env.PAPI_DEFAULT_TIMEOUT,
        retryAttempts: env.PAPI_MAX_RETRIES,
      });
    }

    // Asset Hub
    if (env.ASSET_HUB_RPC_URL) {
      chains.push({
        name: 'asset-hub',
        displayName: 'Asset Hub',
        rpcUrl: env.ASSET_HUB_RPC_URL,
        chainId: '0x68d56f15f85d3136970ec16946040bc1752654e906147f7e4e5c966003a879e1',
        ss58Format: 0,
        decimals: 10,
        tokenSymbol: 'DOT',
        isEnabled: true,
        timeout: env.PAPI_DEFAULT_TIMEOUT,
        retryAttempts: env.PAPI_MAX_RETRIES,
      });
    }

    return chains;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    logger.info('Initializing PAPI service...');

    // Initialize database with default chains
    await this.initializeDefaultChains();

    // Connect to enabled chains
    const enabledChains = this.config.chains.filter(chain => chain.isEnabled);
    const connectionPromises = enabledChains.map(chain => this.connectToChain(chain));

    try {
      await Promise.allSettled(connectionPromises);
      this.isInitialized = true;
      logger.info('PAPI service initialization completed', {
        totalChains: this.config.chains.length,
        connectedChains: this.clients.size,
        enabledChains: enabledChains.length,
      });
    } catch (error) {
      logger.error('PAPI service initialization failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  private async initializeDefaultChains(): Promise<void> {
    const db = await getDatabaseConnection();
    try {
      const now = Date.now();

      for (const chain of this.config.chains) {
        await db.run(
          `INSERT OR IGNORE INTO papi_chains (
            id, name, display_name, rpc_url, chain_id, ss58_format, 
            decimals, token_symbol, is_enabled, timeout, retry_attempts, 
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            generateSecureUUID(),
            chain.name,
            chain.displayName,
            chain.rpcUrl,
            chain.chainId,
            chain.ss58Format,
            chain.decimals,
            chain.tokenSymbol,
            chain.isEnabled ? 1 : 0,
            chain.timeout,
            chain.retryAttempts,
            now,
            now,
          ]
        );
      }

      logger.info('Default chains initialized in database', {
        chainsCount: this.config.chains.length,
      });
    } finally {
      releaseDatabaseConnection(db);
    }
  }

  private async connectToChain(chainConfig: PAPIChainConfig): Promise<void> {
    try {
      logger.info('Connecting to chain', { chain: chainConfig.name });

      const provider = new WsProvider(chainConfig.rpcUrl);

      const api = await ApiPromise.create({ provider });
      
      // Get chain info
      const [chain, version, genesisHash] = await Promise.all([
        api.rpc.system.chain(),
        api.rpc.system.version(),
        api.rpc.chain.getBlockHash(0),
      ]);

      const client: PAPIClient = {
        chainName: chainConfig.name,
        isConnected: true,
        lastConnected: Date.now(),
        version: version.toString(),
        genesisHash: genesisHash.toString(),
      };

      this.clients.set(chainConfig.name, client);
      this.apis.set(chainConfig.name, api);

      // Update database with connection info
      await this.updateChainConnectionInfo(chainConfig.name, {
        version: version.toString(),
        genesisHash: genesisHash.toString(),
        lastConnected: Date.now(),
      });

      logger.info('Successfully connected to chain', {
        chain: chainConfig.name,
        version: version.toString(),
        genesisHash: genesisHash.toString().substring(0, 16) + '...',
      });
    } catch (error) {
      logger.error('Failed to connect to chain', {
        chain: chainConfig.name,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new ChainConnectionError(chainConfig.name, error);
    }
  }

  private async updateChainConnectionInfo(
    chainName: string,
    info: { version?: string; genesisHash?: string; lastConnected?: number }
  ): Promise<void> {
    const db = await getDatabaseConnection();
    try {
      const updates: string[] = [];
      const values: any[] = [];

      if (info.version) {
        updates.push('version = ?');
        values.push(info.version);
      }
      if (info.genesisHash) {
        updates.push('genesis_hash = ?');
        values.push(info.genesisHash);
      }
      if (info.lastConnected) {
        updates.push('last_connected = ?');
        values.push(info.lastConnected);
      }

      if (updates.length > 0) {
        updates.push('updated_at = ?');
        values.push(Date.now());
        values.push(chainName);

        await db.run(
          `UPDATE papi_chains SET ${updates.join(', ')} WHERE name = ?`,
          values
        );
      }
    } finally {
      releaseDatabaseConnection(db);
    }
  }

  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('PAPI service not initialized. Call initialize() first.');
    }
  }

  private ensureChainSupported(chainName: string): void {
    if (!this.clients.has(chainName)) {
      throw new ChainNotSupportedError(chainName);
    }
  }

  // Public API methods

  async getChainInfo(chainName: string): Promise<ChainInfo> {
    this.ensureInitialized();
    this.ensureChainSupported(chainName);

    const client = this.clients.get(chainName)!;
    const db = await getDatabaseConnection();
    
    try {
      const chainData = await db.get(
        'SELECT * FROM papi_chains WHERE name = ?',
        [chainName]
      );

      if (!chainData) {
        throw new ChainNotSupportedError(chainName);
      }

      const chainInfo: ChainInfo = {
        name: chainData.name,
        displayName: chainData.display_name,
        chainId: chainData.chain_id,
        ss58Format: chainData.ss58_format,
        decimals: chainData.decimals,
        tokenSymbol: chainData.token_symbol,
        isEnabled: !!chainData.is_enabled,
        isConnected: client.isConnected,
        lastConnected: client.lastConnected,
        version: client.version,
        genesisHash: client.genesisHash,
      };

      return chainInfo;
    } finally {
      releaseDatabaseConnection(db);
    }
  }

  async getEnabledChains(): Promise<ChainInfo[]> {
    this.ensureInitialized();

    const chainInfos: ChainInfo[] = [];
    const chainNames = Array.from(this.clients.keys());
    for (const chainName of chainNames) {
      try {
        const chainInfo = await this.getChainInfo(chainName);
        chainInfos.push(chainInfo);
      } catch (error) {
        logger.warn('Failed to get chain info', {
          chain: chainName,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return chainInfos;
  }

  async getBalance(chainName: string, address: string): Promise<AccountBalance> {
    this.ensureInitialized();
    this.ensureChainSupported(chainName);

    const api = this.apis.get(chainName)!;
    const client = this.clients.get(chainName)!;

    try {
      const accountData = await api.query.system.account(address) as any;
      const balance = accountData.data;

      const accountBalance: AccountBalance = {
        address,
        chain: chainName,
        free: balance.free.toString(),
        reserved: balance.reserved.toString(),
        frozen: balance.frozen.toString(),
        total: balance.total.toString(),
        formatted: {
          free: this.formatBalance(balance.free.toString(), client.chainName),
          reserved: this.formatBalance(balance.reserved.toString(), client.chainName),
          frozen: this.formatBalance(balance.frozen.toString(), client.chainName),
          total: this.formatBalance(balance.total.toString(), client.chainName),
        },
      };

      // Update account info in database
      await this.updateAccountInfo(chainName, address, accountBalance, accountData);

      logger.info('Retrieved account balance', {
        chain: chainName,
        address: address.substring(0, 10) + '...',
        free: accountBalance.formatted.free,
        total: accountBalance.formatted.total,
      });

      return accountBalance;
    } catch (error) {
      logger.error('Failed to get account balance', {
        chain: chainName,
        address: address.substring(0, 10) + '...',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async getAccountInfo(chainName: string, address: string): Promise<AccountInfo> {
    this.ensureInitialized();
    this.ensureChainSupported(chainName);

    const api = this.apis.get(chainName)!;

    try {
      const balance = await this.getBalance(chainName, address);
      const accountInfo = await api.query.system.account(address) as any;

      const accountData: AccountInfo = {
        address,
        chain: chainName,
        nonce: accountInfo.nonce.toNumber(),
        consumers: accountInfo.consumers.toNumber(),
        providers: accountInfo.providers.toNumber(),
        sufficients: accountInfo.sufficients.toNumber(),
        data: balance,
      };

      logger.info('Retrieved account info', {
        chain: chainName,
        address: address.substring(0, 10) + '...',
        nonce: accountData.nonce,
        consumers: accountData.consumers,
        providers: accountData.providers,
      });

      return accountData;
    } catch (error) {
      logger.error('Failed to get account info', {
        chain: chainName,
        address: address.substring(0, 10) + '...',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  private formatBalance(balance: string, chainName: string): string {
    const chainConfig = this.config.chains.find(c => c.name === chainName);
    if (!chainConfig) {
      return balance;
    }

    const balanceNum = BigInt(balance);
    const divisor = BigInt(Math.pow(10, chainConfig.decimals));
    const whole = balanceNum / divisor;
    const remainder = balanceNum % divisor;

    if (remainder === BigInt(0)) {
      return `${whole} ${chainConfig.tokenSymbol}`;
    }

    const decimals = remainder.toString().padStart(chainConfig.decimals, '0');
    const trimmed = decimals.replace(/0+$/, '');
    
    if (trimmed === '') {
      return `${whole} ${chainConfig.tokenSymbol}`;
    }

    return `${whole}.${trimmed} ${chainConfig.tokenSymbol}`;
  }

  private async updateAccountInfo(
    chainName: string,
    address: string,
    balance: AccountBalance,
    accountData: any
  ): Promise<void> {
    const db = await getDatabaseConnection();
    try {
      const now = Date.now();
      
      await db.run(
        `INSERT OR REPLACE INTO papi_accounts (
          id, address, chain, nonce, consumers, providers, sufficients,
          free_balance, reserved_balance, frozen_balance,
          last_updated, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          generateSecureUUID(),
          address,
          chainName,
          accountData.nonce.toNumber(),
          accountData.consumers.toNumber(),
          accountData.providers.toNumber(),
          accountData.sufficients.toNumber(),
          balance.free,
          balance.reserved,
          balance.frozen,
          now,
          now,
          now,
        ]
      );
    } finally {
      releaseDatabaseConnection(db);
    }
  }

  async getConnectedChains(): Promise<string[]> {
    this.ensureInitialized();
    return Array.from(this.clients.keys());
  }

  async isChainConnected(chainName: string): Promise<boolean> {
    this.ensureInitialized();
    const client = this.clients.get(chainName);
    return client ? client.isConnected : false;
  }

  async disconnect(): Promise<void> {
    logger.info('Disconnecting PAPI service...');

    const apiEntries = Array.from(this.apis.entries());
    for (const [chainName, api] of apiEntries) {
      try {
        await api.disconnect();
        logger.info('Disconnected from chain', { chain: chainName });
      } catch (error) {
        logger.error('Error disconnecting from chain', {
          chain: chainName,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    this.apis.clear();
    this.clients.clear();
    this.isInitialized = false;

    logger.info('PAPI service disconnected');
  }
}

// Singleton pattern following the same approach as GoogleAuthService
let papiServiceInstance: PAPIService | null = null;

export function getPAPIService(): PAPIService {
  if (!papiServiceInstance) {
    papiServiceInstance = new PAPIService();
  }
  return papiServiceInstance;
}
