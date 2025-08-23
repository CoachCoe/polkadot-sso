import { ApiPromise } from '@polkadot/api';
import { web3Accounts } from '@polkadot/extension-dapp';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { createLogger } from '../utils/logger';

const logger = createLogger('BrowserWalletService');

export interface BrowserWalletAccount {
  address: string;
  name?: string;
  type: 'sr25519' | 'ed25519' | 'ecdsa' | 'ethereum';
  genesisHash?: string;
}

export interface BrowserWalletConnection {
  account: BrowserWalletAccount;
  sign(data: Uint8Array): Promise<Uint8Array>;
  signTransaction(extrinsic: any): Promise<any>;
  disconnect(): Promise<void>;
}

export interface BrowserWalletProvider {
  name: string;
  isAvailable: boolean;
  connect(): Promise<BrowserWalletConnection>;
  getAccounts(): Promise<BrowserWalletAccount[]>;
}

/**
 * Browser Wallet Service
 *
 * Provides real wallet integration for browser environments.
 * This service can actually connect to installed wallet extensions.
 */
export class BrowserWalletService {
  private api: ApiPromise | null = null;
  private connections: Map<string, BrowserWalletConnection> = new Map();
  private providers: Map<string, BrowserWalletProvider> = new Map();

  constructor(api: ApiPromise) {
    this.api = api;
    this.initializeProviders();
  }

  /**
   * Initialize available wallet providers for browser environment
   */
  private initializeProviders(): void {
    // Polkadot.js Extension
    this.providers.set('polkadot-js', new PolkadotJsBrowserProvider());

    // Talisman Wallet
    this.providers.set('talisman', new TalismanBrowserProvider());

    // SubWallet
    this.providers.set('subwallet', new SubWalletBrowserProvider());

    logger.info('Initialized browser wallet providers', {
      providers: Array.from(this.providers.keys()),
    });
  }

  /**
   * Get list of available wallet providers
   */
  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys()).filter(name => {
      const provider = this.providers.get(name);
      return provider?.isAvailable;
    });
  }

  /**
   * Connect to a specific wallet provider
   */
  async connectToProvider(providerName: string): Promise<{ success: boolean; connection?: BrowserWalletConnection; error?: string }> {
    try {
      const provider = this.providers.get(providerName);
      if (!provider) {
        return {
          success: false,
          error: `Provider '${providerName}' not found`,
        };
      }

      if (!provider.isAvailable) {
        return {
          success: false,
          error: `Provider '${providerName}' is not available`,
        };
      }

      logger.info('Connecting to browser wallet provider', { provider: providerName });
      const connection = await provider.connect();

      // Store the connection
      this.connections.set(connection.account.address, connection);

      logger.info('Successfully connected to browser wallet', {
        provider: providerName,
        address: connection.account.address,
      });

      return {
        success: true,
        connection,
      };
    } catch (error) {
      logger.error('Failed to connect to browser wallet provider', {
        provider: providerName,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get accounts from a specific wallet provider
   */
  async getProviderAccounts(providerName: string): Promise<BrowserWalletAccount[]> {
    try {
      const provider = this.providers.get(providerName);
      if (!provider) {
        throw new Error(`Provider '${providerName}' not found`);
      }

      if (!provider.isAvailable) {
        throw new Error(`Provider '${providerName}' is not available`);
      }

      return await provider.getAccounts();
    } catch (error) {
      logger.error('Failed to get provider accounts', { provider: providerName, error });
      return [];
    }
  }

  /**
   * Get an existing connection by address
   */
  getConnection(address: string): BrowserWalletConnection | undefined {
    return this.connections.get(address);
  }

  /**
   * Check if a wallet is connected
   */
  isWalletConnected(address: string): boolean {
    return this.connections.has(address);
  }

  /**
   * Disconnect from a specific wallet
   */
  async disconnectWallet(address: string): Promise<boolean> {
    try {
      const connection = this.connections.get(address);
      if (!connection) {
        return false;
      }

      await connection.disconnect();
      this.connections.delete(address);

      logger.info('Disconnected browser wallet', { address });
      return true;
    } catch (error) {
      logger.error('Failed to disconnect browser wallet', {
        address,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  /**
   * Get all active connections
   */
  getActiveConnections(): Map<string, BrowserWalletConnection> {
    return new Map(this.connections);
  }

  /**
   * Sign data with a connected wallet
   */
  async signData(address: string, data: Uint8Array): Promise<Uint8Array | null> {
    try {
      const connection = this.connections.get(address);
      if (!connection) {
        throw new Error(`No wallet connection found for address: ${address}`);
      }

      return await connection.sign(data);
    } catch (error) {
      logger.error('Failed to sign data with wallet', { address, error });
      return null;
    }
  }

  /**
   * Sign a transaction with a connected wallet
   */
  async signTransaction(address: string, extrinsic: any): Promise<any | null> {
    try {
      const connection = this.connections.get(address);
      if (!connection) {
        throw new Error(`No wallet connection found for address: ${address}`);
      }

      return await connection.signTransaction(extrinsic);
    } catch (error) {
      logger.error('Failed to sign transaction with wallet', { address, error });
      return null;
    }
  }
}

/**
 * Polkadot.js Extension Browser Provider
 */
class PolkadotJsBrowserProvider implements BrowserWalletProvider {
  name = 'Polkadot.js Extension';
  isAvailable = false;

  constructor() {
    this.isAvailable = typeof window !== 'undefined' &&
                      !!(window as any).injectedWeb3?.polkadot;
  }

  async connect(): Promise<BrowserWalletConnection> {
    if (!this.isAvailable) {
      throw new Error('Polkadot.js Extension not available');
    }

    await cryptoWaitReady();

    // Get accounts from extension
    const accounts = await web3Accounts();
    if (accounts.length === 0) {
      throw new Error('No accounts found in Polkadot.js Extension');
    }

    // For now, use the first account
    // In a real app, you'd show a selection UI
    const account = accounts[0];

    // Convert to our interface
    const browserAccount: BrowserWalletAccount = {
      address: account.address,
      name: account.meta?.name,
      type: account.type || 'sr25519', // Default to sr25519 if undefined
      genesisHash: account.meta?.genesisHash || undefined,
    };

    return new PolkadotJsBrowserConnection(browserAccount);
  }

  async getAccounts(): Promise<BrowserWalletAccount[]> {
    if (!this.isAvailable) {
      return [];
    }

    try {
      const accounts = await web3Accounts();
      return accounts.map(account => ({
        address: account.address,
        name: account.meta?.name,
        type: account.type || 'sr25519', // Default to sr25519 if undefined
        genesisHash: account.meta?.genesisHash || undefined,
      }));
    } catch (error) {
      logger.error('Failed to get Polkadot.js accounts', { error });
      return [];
    }
  }
}

/**
 * Polkadot.js Extension Browser Connection
 */
class PolkadotJsBrowserConnection implements BrowserWalletConnection {
  constructor(public account: BrowserWalletAccount) {}

  async sign(data: Uint8Array): Promise<Uint8Array> {
    // This would need to be implemented using the actual extension API
    // For now, return a mock signature
    logger.info('Signing data with Polkadot.js Extension', {
      address: this.account.address,
      dataLength: data.length
    });

    // TODO: Implement actual signing using extension API
    throw new Error('Actual signing not yet implemented - requires extension integration');
  }

  async signTransaction(extrinsic: any): Promise<any> {
    // This would need to be implemented using the actual extension API
    logger.info('Signing transaction with Polkadot.js Extension', {
      address: this.account.address
    });

    // TODO: Implement actual transaction signing using extension API
    throw new Error('Actual transaction signing not yet implemented - requires extension integration');
  }

  async disconnect(): Promise<void> {
    // Polkadot.js Extension doesn't require explicit disconnection
    logger.info('Disconnected from Polkadot.js Extension', { address: this.account.address });
  }
}

/**
 * Talisman Wallet Browser Provider
 */
class TalismanBrowserProvider implements BrowserWalletProvider {
  name = 'Talisman Wallet';
  isAvailable = false;

  constructor() {
    this.isAvailable = typeof window !== 'undefined' &&
                      !!(window as any).talisman;
  }

  async connect(): Promise<BrowserWalletConnection> {
    if (!this.isAvailable) {
      throw new Error('Talisman Wallet not available');
    }

    // TODO: Implement actual Talisman connection
    throw new Error('Talisman Wallet integration not yet implemented');
  }

  async getAccounts(): Promise<BrowserWalletAccount[]> {
    if (!this.isAvailable) {
      return [];
    }

    // TODO: Implement actual account retrieval
    return [];
  }
}

/**
 * SubWallet Browser Provider
 */
class SubWalletBrowserProvider implements BrowserWalletProvider {
  name = 'SubWallet';
  isAvailable = false;

  constructor() {
    this.isAvailable = typeof window !== 'undefined' &&
                      !!(window as any).SubWallet;
  }

  async connect(): Promise<BrowserWalletConnection> {
    if (!this.isAvailable) {
      throw new Error('SubWallet not available');
    }

    // TODO: Implement actual SubWallet connection
    throw new Error('SubWallet integration not yet implemented');
  }

  async getAccounts(): Promise<BrowserWalletAccount[]> {
    if (!this.isAvailable) {
      return [];
    }

    // TODO: Implement actual account retrieval
    return [];
  }
}
