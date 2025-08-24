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

export class WalletConnectionService {
  private connections: Map<string, WalletConnection> = new Map();
  private providers: Map<string, WalletProvider> = new Map();
  private api: ApiPromise | null = null;

  constructor(api: ApiPromise) {
    this.api = api;
    this.initializeProviders();
  }

  private initializeProviders(): void {
    // Polkadot.js Extension
    if (typeof window !== 'undefined' && (window as any).injectedWeb3) {
      this.providers.set('polkadot-js', new PolkadotJsProvider());
    }

    if (typeof window !== 'undefined' && (window as any).talisman) {
      this.providers.set('talisman', new TalismanProvider());
    }

    if (typeof window !== 'undefined' && (window as any).SubWallet) {
      this.providers.set('subwallet', new SubWalletProvider());
    }

    if (typeof window !== 'undefined' && (window as any).nova) {
      this.providers.set('nova', new NovaWalletProvider());
    }

    logger.info('Initialized wallet providers', {
      providers: Array.from(this.providers.keys()),
    });
  }

  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

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

  getConnection(address: string): WalletConnection | undefined {
    return this.connections.get(address);
  }

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

  getActiveConnections(): Map<string, WalletConnection> {
    return new Map(this.connections);
  }

  isWalletConnected(address: string): boolean {
    return this.connections.has(address);
  }
}

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

    const accounts = await web3Accounts();
    if (accounts.length === 0) {
      throw new Error('No accounts found in Polkadot.js Extension');
    }

    const account = accounts[0];
    const keyring = new Keyring({ type: 'sr25519' });
    const pair = keyring.addFromAddress(account.address);

    return new PolkadotJsConnection(account.address, pair);
  }
}

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
    return extrinsic;
  }

  async disconnect(): Promise<void> {}
}

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
    throw new Error('Talisman Wallet integration not yet implemented');
  }
}

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
    throw new Error('SubWallet integration not yet implemented');
  }
}

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
      const novaWallet = (window as any).nova;

      const accounts = await novaWallet.getAccounts();
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found in Nova Wallet');
      }

      const account = accounts[0];

      const keyring = new Keyring({ type: 'sr25519' });
      const pair = keyring.addFromAddress(account.address as string);

      return new NovaWalletConnection(account.address as string, pair);
    } catch (error) {
      logger.error('Failed to connect to Nova Wallet', { error });
      throw new Error(
        `Failed to connect to Nova Wallet: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}

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

      const signature = await novaWallet.signMessage({
        address: this.address,
        message: Array.from(data), // Convert Uint8Array to regular array
      });

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

      const payload = extrinsic.method.toHex();

      const signedPayload = await novaWallet.signTransaction({
        address: this.address,
        transaction: payload,
        network: 'kusama',
      });

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
