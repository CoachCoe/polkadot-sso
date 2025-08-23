import { ApiPromise } from '@polkadot/api';
import type { SubmittableExtrinsic } from '@polkadot/api/types';
import { Keyring } from '@polkadot/keyring';
import { KeyringPair } from '@polkadot/keyring/types';
import { createLogger } from '../utils/logger';

const logger = createLogger('WalletConnectionService');

export interface WalletProvider {
  name: string;
  isAvailable: boolean;
  connect(): Promise<WalletConnection>;
}

export interface WalletConnection {
  address: string;
  publicKey: Uint8Array;
  sign(data: Uint8Array): Promise<Uint8Array>;
  signTransaction(
    extrinsic: SubmittableExtrinsic<'promise'>
  ): Promise<SubmittableExtrinsic<'promise'>>;
  disconnect(): Promise<void>;
}

export interface WalletConnectionResult {
  success: boolean;
  connection?: WalletConnection;
  error?: string;
  provider: string;
}

/**
 * Wallet Connection Service
 *
 * Provides a unified interface for connecting to different wallet providers
 * and managing wallet connections for Kusama transactions.
 */
export class WalletConnectionService {
  private connections: Map<string, WalletConnection> = new Map();
  private providers: Map<string, WalletProvider> = new Map();
  private api: ApiPromise | null = null;

  constructor(api: ApiPromise) {
    this.api = api;
    this.initializeProviders();
  }

  /**
   * Initialize available wallet providers
   */
  private initializeProviders(): void {
    // Polkadot.js Extension
    if (typeof window !== 'undefined' && (window as any).injectedWeb3) {
      this.providers.set('polkadot-js', new PolkadotJsProvider());
    }

    // Talisman Wallet
    if (typeof window !== 'undefined' && (window as any).talisman) {
      this.providers.set('talisman', new TalismanProvider());
    }

    // SubWallet
    if (typeof window !== 'undefined' && (window as any).SubWallet) {
      this.providers.set('subwallet', new SubWalletProvider());
    }

    // Nova Wallet
    if (typeof window !== 'undefined' && (window as any).nova) {
      this.providers.set('nova', new NovaWalletProvider());
    }

    logger.info('Initialized wallet providers', {
      providers: Array.from(this.providers.keys()),
    });
  }

  /**
   * Get list of available wallet providers
   */
  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Connect to a specific wallet provider
   */
  async connectToProvider(providerName: string): Promise<WalletConnectionResult> {
    try {
      const provider = this.providers.get(providerName);
      if (!provider) {
        return {
          success: false,
          error: `Provider '${providerName}' not found`,
          provider: providerName,
        };
      }

      if (!provider.isAvailable) {
        return {
          success: false,
          error: `Provider '${providerName}' is not available`,
          provider: providerName,
        };
      }

      logger.info('Connecting to wallet provider', { provider: providerName });
      const connection = await provider.connect();

      // Store the connection
      this.connections.set(connection.address, connection);

      logger.info('Successfully connected to wallet', {
        provider: providerName,
        address: connection.address,
      });

      return {
        success: true,
        connection,
        provider: providerName,
      };
    } catch (error) {
      logger.error('Failed to connect to wallet provider', {
        provider: providerName,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        provider: providerName,
      };
    }
  }

  /**
   * Get an existing connection by address
   */
  getConnection(address: string): WalletConnection | undefined {
    return this.connections.get(address);
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

      logger.info('Disconnected wallet', { address });
      return true;
    } catch (error) {
      logger.error('Failed to disconnect wallet', {
        address,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  /**
   * Get all active connections
   */
  getActiveConnections(): Map<string, WalletConnection> {
    return new Map(this.connections);
  }

  /**
   * Check if a wallet is connected
   */
  isWalletConnected(address: string): boolean {
    return this.connections.has(address);
  }
}

/**
 * Polkadot.js Extension Provider
 */
class PolkadotJsProvider implements WalletProvider {
  name = 'Polkadot.js Extension';
  isAvailable = false;

  constructor() {
    this.isAvailable = typeof window !== 'undefined' && !!(window as any).injectedWeb3?.polkadot;
  }

  async connect(): Promise<WalletConnection> {
    if (!this.isAvailable) {
      throw new Error('Polkadot.js Extension not available');
    }

    const { web3Accounts, web3AccountsSubscribe } = await import('@polkadot/extension-dapp');
    const { cryptoWaitReady } = await import('@polkadot/util-crypto');

    await cryptoWaitReady();

    // Get accounts from extension
    const accounts = await web3Accounts();
    if (accounts.length === 0) {
      throw new Error('No accounts found in Polkadot.js Extension');
    }

    // For now, use the first account
    const account = accounts[0];
    const keyring = new Keyring({ type: 'sr25519' });
    const pair = keyring.addFromAddress(account.address);

    return new PolkadotJsConnection(account.address, pair);
  }
}

/**
 * Polkadot.js Extension Connection
 */
class PolkadotJsConnection implements WalletConnection {
  constructor(
    public address: string,
    private keypair: KeyringPair
  ) {}

  get publicKey(): Uint8Array {
    return this.keypair.publicKey;
  }

  async sign(data: Uint8Array): Promise<Uint8Array> {
    return this.keypair.sign(data);
  }

  async signTransaction(
    extrinsic: SubmittableExtrinsic<'promise'>
  ): Promise<SubmittableExtrinsic<'promise'>> {
    // This would need to be implemented based on the specific extrinsic type
    // For now, return the extrinsic as-is
    return extrinsic;
  }

  async disconnect(): Promise<void> {
    // Polkadot.js Extension doesn't require explicit disconnection
  }
}

/**
 * Talisman Wallet Provider
 */
class TalismanProvider implements WalletProvider {
  name = 'Talisman Wallet';
  isAvailable = false;

  constructor() {
    this.isAvailable = typeof window !== 'undefined' && !!(window as any).talisman;
  }

  async connect(): Promise<WalletConnection> {
    if (!this.isAvailable) {
      throw new Error('Talisman Wallet not available');
    }

    // Implementation would depend on Talisman's API
    throw new Error('Talisman Wallet integration not yet implemented');
  }
}

/**
 * SubWallet Provider
 */
class SubWalletProvider implements WalletProvider {
  name = 'SubWallet';
  isAvailable = false;

  constructor() {
    this.isAvailable = typeof window !== 'undefined' && !!(window as any).SubWallet;
  }

  async connect(): Promise<WalletConnection> {
    if (!this.isAvailable) {
      throw new Error('SubWallet not available');
    }

    // Implementation would depend on SubWallet's API
    throw new Error('SubWallet integration not yet implemented');
  }
}

/**
 * Nova Wallet Provider
 */
class NovaWalletProvider implements WalletProvider {
  name = 'Nova Wallet';
  isAvailable = false;

  constructor() {
    this.isAvailable = typeof window !== 'undefined' && !!(window as any).nova;
  }

  async connect(): Promise<WalletConnection> {
    if (!this.isAvailable) {
      throw new Error('Nova Wallet not available');
    }

    try {
      // Nova Wallet uses a different API structure
      const novaWallet = (window as any).nova;

      // Request accounts from Nova Wallet
      const accounts = await novaWallet.getAccounts();
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found in Nova Wallet');
      }

      // For now, use the first account
      // In a real app, you'd show a selection UI
      const account = accounts[0];

      // Create a mock keypair for compatibility
      // In practice, you'd work with Nova Wallet's actual signing methods
      const keyring = new Keyring({ type: 'sr25519' });
      const pair = keyring.addFromAddress(account.address);

      return new NovaWalletConnection(account.address, pair);
    } catch (error) {
      logger.error('Failed to connect to Nova Wallet', { error });
      throw new Error(
        `Failed to connect to Nova Wallet: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}

/**
 * Nova Wallet Connection
 */
class NovaWalletConnection implements WalletConnection {
  constructor(
    public address: string,
    private keypair: KeyringPair
  ) {}

  get publicKey(): Uint8Array {
    return this.keypair.publicKey;
  }

  async sign(data: Uint8Array): Promise<Uint8Array> {
    try {
      const novaWallet = (window as any).nova;

      // Request signature from Nova Wallet
      const signature = await novaWallet.signMessage({
        address: this.address,
        message: Array.from(data), // Convert Uint8Array to regular array
      });

      // Convert signature back to Uint8Array
      return new Uint8Array(signature);
    } catch (error) {
      logger.error('Failed to sign data with Nova Wallet', {
        address: this.address,
        error,
      });
      throw new Error(
        `Failed to sign data: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async signTransaction(
    extrinsic: SubmittableExtrinsic<'promise'>
  ): Promise<SubmittableExtrinsic<'promise'>> {
    try {
      const novaWallet = (window as any).nova;

      // Get the transaction payload
      const payload = extrinsic.method.toHex();

      // Request transaction signature from Nova Wallet
      const signedPayload = await novaWallet.signTransaction({
        address: this.address,
        transaction: payload,
        network: 'kusama', // Specify network
      });

      // Apply the signature to the extrinsic
      // Note: This is a simplified approach - in practice, you'd need to handle
      // the actual signature format returned by Nova Wallet
      // For now, we'll return the extrinsic as-is since signature handling is complex
      logger.info('Transaction signed by Nova Wallet (signature application simulated)');

      return extrinsic;
    } catch (error) {
      logger.error('Failed to sign transaction with Nova Wallet', {
        address: this.address,
        error,
      });
      throw new Error(
        `Failed to sign transaction: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async disconnect(): Promise<void> {
    // Nova Wallet doesn't require explicit disconnection
    logger.info('Disconnected from Nova Wallet', { address: this.address });
  }
}
