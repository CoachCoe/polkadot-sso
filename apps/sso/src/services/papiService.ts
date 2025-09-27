import { ApiPromise, WsProvider } from '@polkadot/api';
import { Keyring } from '@polkadot/keyring';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('papi-service');

export interface PapiConfig {
  polkadotRpc: string;
  kusamaRpc: string;
  lightClientEnabled: boolean;
  fallbackToPolkadotJs: boolean;
  typeDescriptors: {
    polkadot: string;
    kusama: string;
  };
}

export interface PapiSignatureVerification {
  isValid: boolean;
  address: string;
  chain: string;
  error?: string;
}

export class PapiService {
  private config: PapiConfig;
  private apis: Map<string, ApiPromise> = new Map();
  private keyring: Keyring | null = null;

  constructor(config: PapiConfig) {
    this.config = config;
  }

  /**
   * Initialize PAPI service
   */
  async initialize(): Promise<void> {
    try {
      // Initialize crypto
      await cryptoWaitReady();
      
      // Initialize keyring
      this.keyring = new Keyring({ type: 'sr25519' });

      // Initialize API connections
      await this.initializeApis();

      logger.info('PAPI service initialized successfully', {
        polkadotRpc: this.config.polkadotRpc,
        kusamaRpc: this.config.kusamaRpc,
        lightClientEnabled: this.config.lightClientEnabled,
      });
    } catch (error) {
      logger.error('Failed to initialize PAPI service', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Initialize API connections
   */
  private async initializeApis(): Promise<void> {
    try {
      // Initialize Polkadot API
      const polkadotProvider = new WsProvider(this.config.polkadotRpc);
      const polkadotApi = await ApiPromise.create({
        provider: polkadotProvider,
        types: this.config.typeDescriptors.polkadot ? require(this.config.typeDescriptors.polkadot) : undefined,
      });
      this.apis.set('polkadot', polkadotApi);

      // Initialize Kusama API
      const kusamaProvider = new WsProvider(this.config.kusamaRpc);
      const kusamaApi = await ApiPromise.create({
        provider: kusamaProvider,
        types: this.config.typeDescriptors.kusama ? require(this.config.typeDescriptors.kusama) : undefined,
      });
      this.apis.set('kusama', kusamaApi);

      logger.info('PAPI connections established', {
        chains: Array.from(this.apis.keys()),
      });
    } catch (error) {
      logger.error('Failed to initialize PAPI connections', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Verify signature using PAPI
   */
  async verifySignature(
    message: string,
    signature: string,
    address: string,
    chain: string = 'polkadot'
  ): Promise<PapiSignatureVerification> {
    try {
      if (!this.keyring) {
        throw new Error('PAPI service not initialized');
      }

      const api = this.apis.get(chain);
      if (!api) {
        throw new Error(`API not available for chain: ${chain}`);
      }

      // Create keyring pair from address
      const keyringPair = this.keyring.addFromAddress(address);

      // Verify signature
      const isValid = keyringPair.verify(message, signature, keyringPair.publicKey);

      logger.info('PAPI signature verification completed', {
        address,
        chain,
        isValid,
        messageLength: message.length,
        signatureLength: signature.length,
      });

      return {
        isValid,
        address,
        chain,
      };
    } catch (error) {
      logger.error('PAPI signature verification failed', {
        address,
        chain,
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        isValid: false,
        address,
        chain,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get account info from blockchain
   */
  async getAccountInfo(address: string, chain: string = 'polkadot'): Promise<any> {
    try {
      const api = this.apis.get(chain);
      if (!api) {
        throw new Error(`API not available for chain: ${chain}`);
      }

      const accountInfo = await api.query.system.account(address);

      logger.info('PAPI account info retrieved', {
        address,
        chain,
        hasAccountInfo: !!accountInfo,
      });

      return accountInfo;
    } catch (error) {
      logger.error('Failed to get account info from PAPI', {
        address,
        chain,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get chain properties
   */
  async getChainProperties(chain: string = 'polkadot'): Promise<any> {
    try {
      const api = this.apis.get(chain);
      if (!api) {
        throw new Error(`API not available for chain: ${chain}`);
      }

      const properties = await api.rpc.system.properties();

      logger.info('PAPI chain properties retrieved', {
        chain,
        properties: properties.toHuman(),
      });

      return properties;
    } catch (error) {
      logger.error('Failed to get chain properties from PAPI', {
        chain,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get chain metadata
   */
  async getChainMetadata(chain: string = 'polkadot'): Promise<any> {
    try {
      const api = this.apis.get(chain);
      if (!api) {
        throw new Error(`API not available for chain: ${chain}`);
      }

      const metadata = api.runtimeMetadata;
      const version = await api.rpc.state.getRuntimeVersion();

      logger.info('PAPI chain metadata retrieved', {
        chain,
        metadataVersion: metadata.version,
        runtimeVersion: version.specVersion.toNumber(),
      });

      return {
        metadata: metadata.toJSON(),
        runtimeVersion: version.toHuman(),
      };
    } catch (error) {
      logger.error('Failed to get chain metadata from PAPI', {
        chain,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get chain health status
   */
  async getChainHealth(chain: string = 'polkadot'): Promise<any> {
    try {
      const api = this.apis.get(chain);
      if (!api) {
        throw new Error(`API not available for chain: ${chain}`);
      }

      const health = await api.rpc.system.health();
      const chain = await api.rpc.system.chain();
      const version = await api.rpc.system.version();

      logger.info('PAPI chain health retrieved', {
        chain,
        health: health.toHuman(),
      });

      return {
        health: health.toHuman(),
        chain: chain.toString(),
        version: version.toString(),
      };
    } catch (error) {
      logger.error('Failed to get chain health from PAPI', {
        chain,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get account balance
   */
  async getAccountBalance(address: string, chain: string = 'polkadot'): Promise<any> {
    try {
      const api = this.apis.get(chain);
      if (!api) {
        throw new Error(`API not available for chain: ${chain}`);
      }

      const accountInfo = await api.query.system.account(address);
      const balance = accountInfo.data.free;

      logger.info('PAPI account balance retrieved', {
        address,
        chain,
        balance: balance.toHuman(),
      });

      return {
        address,
        chain,
        balance: balance.toHuman(),
        accountInfo: accountInfo.toHuman(),
      };
    } catch (error) {
      logger.error('Failed to get account balance from PAPI', {
        address,
        chain,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get block information
   */
  async getBlockInfo(blockHash: string, chain: string = 'polkadot'): Promise<any> {
    try {
      const api = this.apis.get(chain);
      if (!api) {
        throw new Error(`API not available for chain: ${chain}`);
      }

      const block = await api.rpc.chain.getBlock(blockHash);

      logger.info('PAPI block info retrieved', {
        blockHash,
        chain,
        blockNumber: block.block.header.number.toNumber(),
      });

      return {
        blockHash,
        chain,
        block: block.toHuman(),
      };
    } catch (error) {
      logger.error('Failed to get block info from PAPI', {
        blockHash,
        chain,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get latest block
   */
  async getLatestBlock(chain: string = 'polkadot'): Promise<any> {
    try {
      const api = this.apis.get(chain);
      if (!api) {
        throw new Error(`API not available for chain: ${chain}`);
      }

      const blockHash = await api.rpc.chain.getFinalizedHead();
      const block = await api.rpc.chain.getBlock(blockHash);

      logger.info('PAPI latest block retrieved', {
        chain,
        blockNumber: block.block.header.number.toNumber(),
        blockHash: blockHash.toString(),
      });

      return {
        chain,
        blockHash: blockHash.toString(),
        block: block.toHuman(),
      };
    } catch (error) {
      logger.error('Failed to get latest block from PAPI', {
        chain,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Check if PAPI is available for a chain
   */
  isChainAvailable(chain: string): boolean {
    return this.apis.has(chain);
  }

  /**
   * Get available chains
   */
  getAvailableChains(): string[] {
    return Array.from(this.apis.keys());
  }

  /**
   * Disconnect from all APIs
   */
  async disconnect(): Promise<void> {
    try {
      for (const [chain, api] of this.apis.entries()) {
        await api.disconnect();
        logger.info('PAPI disconnected', { chain });
      }
      this.apis.clear();
    } catch (error) {
      logger.error('Failed to disconnect PAPI', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Validate PAPI configuration
   */
  static validateConfig(config: Partial<PapiConfig>): PapiConfig {
    if (!config.polkadotRpc) {
      throw new Error('Polkadot RPC URL is required');
    }
    if (!config.kusamaRpc) {
      throw new Error('Kusama RPC URL is required');
    }

    return {
      polkadotRpc: config.polkadotRpc,
      kusamaRpc: config.kusamaRpc,
      lightClientEnabled: config.lightClientEnabled || false,
      fallbackToPolkadotJs: config.fallbackToPolkadotJs || true,
      typeDescriptors: {
        polkadot: config.typeDescriptors?.polkadot || '',
        kusama: config.typeDescriptors?.kusama || '',
      },
    };
  }
}
