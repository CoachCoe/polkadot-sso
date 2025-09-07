import type { InjectedExtension } from '@polkadot/extension-inject/types';
import type { WalletAccount, WalletConnection, WalletProvider } from '../types/index.js';
import { ErrorService } from './errorService.js';

export interface WalletExtensionInfo {
  name: string;
  displayName: string;
  icon: string;
  extensionName: string;
  isAvailable: boolean;
}

export class WalletProviderService {
  private extensions: Map<string, InjectedExtension> = new Map();
  private availableWallets: WalletExtensionInfo[] = [];

  constructor() {
    this.detectAvailableWallets();
  }

  /**
   * Detect all available wallet extensions
   */
  private detectAvailableWallets(): void {
    if (typeof window === 'undefined' || !window.injectedWeb3) {
      return;
    }

    const walletConfigs: WalletExtensionInfo[] = [
      {
        name: 'polkadot-js',
        displayName: 'Polkadot.js',
        icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iMTYiIGZpbGw9IiNFNjAwMDAiLz4KPHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4PSI4IiB5PSI4Ij4KPHBhdGggZD0iTTggMEMzLjU4IDAgMCAzLjU4IDAgOFMzLjU4IDE2IDggMTZTMTYgMTIuNDIgMTYgOFMxMi40MiAwIDggMFoiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPgo8L3N2Zz4K',
        extensionName: 'polkadot-js',
        isAvailable: false,
      },
      {
        name: 'talisman',
        displayName: 'Talisman',
        icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iMTYiIGZpbGw9IiM2MzY2RjEiLz4KPHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4PSI4IiB5PSI4Ij4KPHBhdGggZD0iTTggMEMzLjU4IDAgMCAzLjU4IDAgOFMzLjU4IDE2IDggMTZTMTYgMTIuNDIgMTYgOFMxMi40MiAwIDggMFoiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPgo8L3N2Zz4K',
        extensionName: 'talisman',
        isAvailable: false,
      },
      {
        name: 'subwallet',
        displayName: 'SubWallet',
        icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iMTYiIGZpbGw9IiM0MTQ1RjUiLz4KPHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4PSI4IiB5PSI4Ij4KPHBhdGggZD0iTTggMEMzLjU4IDAgMCAzLjU4IDAgOFMzLjU4IDE2IDggMTZTMTYgMTIuNDIgMTYgOFMxMi40MiAwIDggMFoiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPgo8L3N2Zz4K',
        extensionName: 'subwallet-js',
        isAvailable: false,
      },
      {
        name: 'nova-wallet',
        displayName: 'Nova Wallet',
        icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iMTYiIGZpbGw9IiNGRjY2MDAiLz4KPHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4PSI4IiB5PSI4Ij4KPHBhdGggZD0iTTggMEMzLjU4IDAgMCAzLjU4IDAgOFMzLjU4IDE2IDggMTZTMTYgMTIuNDIgMTYgOFMxMi40MiAwIDggMFoiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPgo8L3N2Zz4K',
        extensionName: 'nova-wallet',
        isAvailable: false,
      },
    ];

    this.availableWallets = walletConfigs.map(config => ({
      ...config,
      isAvailable: !!(window.injectedWeb3 && window.injectedWeb3[config.extensionName]),
    }));
  }

  /**
   * Get all available wallet extensions
   */
  getAvailableWallets(): WalletExtensionInfo[] {
    return this.availableWallets.filter(wallet => wallet.isAvailable);
  }

  /**
   * Get all wallet configurations (available and unavailable)
   */
  getAllWallets(): WalletExtensionInfo[] {
    return this.availableWallets;
  }

  /**
   * Check if a specific wallet is available
   */
  isWalletAvailable(walletName: string): boolean {
    const wallet = this.availableWallets.find(w => w.name === walletName);
    return wallet?.isAvailable || false;
  }

  /**
   * Connect to a specific wallet extension
   */
  async connectWallet(walletName: string): Promise<WalletConnection> {
    if (typeof window === 'undefined' || !window.injectedWeb3) {
      throw ErrorService.createError(
        'ENVIRONMENT_ERROR',
        'Wallet extensions not available in this environment'
      );
    }

    const walletConfig = this.availableWallets.find(w => w.name === walletName);
    if (!walletConfig) {
      throw ErrorService.createError(
        'WALLET_NOT_FOUND',
        `Wallet ${walletName} not found`,
        { walletName },
        walletName
      );
    }

    if (!walletConfig.isAvailable) {
      throw ErrorService.walletNotAvailable(walletName);
    }

    try {
      // Enable the extension
      const extension =
        await window.injectedWeb3[walletConfig.extensionName].enable('Polkadot SSO');
      this.extensions.set(walletName, extension);

      // Get accounts
      const accounts = await extension.accounts.get();

      // Create wallet provider
      const provider: WalletProvider = {
        id: walletName,
        name: walletConfig.displayName,
        description: `Connect with ${walletConfig.displayName}`,
        icon: walletConfig.icon,
        connect: async () => this.connectWallet(walletName),
        isAvailable: () => this.isWalletAvailable(walletName),
      };

      // Create wallet accounts
      const walletAccounts: WalletAccount[] = accounts.map((account: any) => ({
        address: account.address,
        name: account.meta?.name,
        type: account.meta?.source,
        meta: account.meta,
      }));

      // Create wallet connection
      const connection: WalletConnection = {
        provider,
        accounts: walletAccounts,
        signMessage: async (message: string) => {
          if (walletAccounts.length === 0) {
            throw new Error('No accounts available');
          }
          return this.signMessage(walletName, walletAccounts[0], message);
        },
        disconnect: async () => {
          this.extensions.delete(walletName);
        },
      };

      return connection;
    } catch (error) {
      throw ErrorService.walletConnectionFailed(walletName, error);
    }
  }

  /**
   * Sign a message with a specific wallet
   */
  async signMessage(walletName: string, account: WalletAccount, message: string): Promise<string> {
    const extension = this.extensions.get(walletName);
    if (!extension) {
      throw ErrorService.walletNotConnected(walletName);
    }

    try {
      if (!extension.signer?.signRaw) {
        throw new Error('Wallet does not support message signing');
      }

      const result = await extension.signer.signRaw({
        address: account.address,
        data: message,
        type: 'bytes',
      });

      return result.signature;
    } catch (error) {
      throw ErrorService.walletSigningFailed(walletName, error);
    }
  }

  /**
   * Disconnect from a specific wallet
   */
  async disconnectWallet(walletName: string): Promise<void> {
    this.extensions.delete(walletName);
  }

  /**
   * Disconnect from all wallets
   */
  async disconnectAllWallets(): Promise<void> {
    this.extensions.clear();
  }

  /**
   * Get connected wallets
   */
  getConnectedWallets(): string[] {
    return Array.from(this.extensions.keys());
  }

  /**
   * Check if a wallet is connected
   */
  isWalletConnected(walletName: string): boolean {
    return this.extensions.has(walletName);
  }
}

// Global wallet provider service instance
export const walletProviderService = new WalletProviderService();
