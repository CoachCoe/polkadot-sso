import { ErrorService } from '@polkadot-auth/core';
import { PolkadotWalletAdapter, WalletSigner } from './types';
import { NovaQrAuthService, NovaQrAuthData } from './novaQrAuth';

export class PolkadotJsAdapter implements PolkadotWalletAdapter {
  name = 'polkadot-js';

  isAvailable(): boolean {
    return typeof window !== 'undefined' && !!window.polkadotExtensionDapp;
  }

  async connect(): Promise<WalletSigner> {
    if (!this.isAvailable()) {
      throw ErrorService.walletNotAvailable('polkadot-js');
    }

    try {
      const extensions = await window.polkadotExtensionDapp.web3Enable('Polkadot SSO');
      if (extensions.length === 0) {
        throw ErrorService.createError('NO_EXTENSIONS_FOUND', 'No Polkadot extensions found');
      }

      const accounts = await window.polkadotExtensionDapp.web3Accounts();
      if (accounts.length === 0) {
        throw ErrorService.noAccountsFound('polkadot-js');
      }

      const account = accounts[0];
      const injector = await window.polkadotExtensionDapp.web3FromAddress(account.address);

      if (!injector?.signer?.signRaw) {
        throw ErrorService.createError(
          'SIGNING_NOT_SUPPORTED',
          'Wallet does not support message signing'
        );
      }

      return {
        getAddress: () => account.address,
        signMessage: async (message: string) => {
          const { signature } = await injector.signer.signRaw({
            address: account.address,
            data: message,
            type: 'bytes',
          });
          return signature;
        },
      };
    } catch (error) {
      throw ErrorService.walletConnectionFailed('polkadot-js', error);
    }
  }
}

export class TalismanAdapter implements PolkadotWalletAdapter {
  name = 'talisman';

  isAvailable(): boolean {
    return typeof window !== 'undefined' && !!window.talismanEth;
  }

  async connect(): Promise<WalletSigner> {
    if (!this.isAvailable()) {
      throw ErrorService.walletNotAvailable('talisman');
    }

    try {
      // Talisman uses the same API as Polkadot.js
      const extensions = await window.polkadotExtensionDapp.web3Enable('Polkadot SSO');
      if (extensions.length === 0) {
        throw ErrorService.createError('NO_EXTENSIONS_FOUND', 'No Talisman extension found');
      }

      const accounts = await window.polkadotExtensionDapp.web3Accounts();
      if (accounts.length === 0) {
        throw ErrorService.noAccountsFound('talisman');
      }

      const account = accounts[0];
      const injector = await window.polkadotExtensionDapp.web3FromAddress(account.address);

      if (!injector?.signer?.signRaw) {
        throw ErrorService.createError(
          'SIGNING_NOT_SUPPORTED',
          'Talisman does not support message signing'
        );
      }

      return {
        getAddress: () => account.address,
        signMessage: async (message: string) => {
          const { signature } = await injector.signer.signRaw({
            address: account.address,
            data: message,
            type: 'bytes',
          });
          return signature;
        },
      };
    } catch (error) {
      throw ErrorService.walletConnectionFailed('talisman', error);
    }
  }
}

export class SubWalletAdapter implements PolkadotWalletAdapter {
  name = 'subwallet';

  isAvailable(): boolean {
    return typeof window !== 'undefined' && !!window.SubWallet;
  }

  async connect(): Promise<WalletSigner> {
    if (!this.isAvailable()) {
      throw ErrorService.walletNotAvailable('subwallet');
    }

    try {
      // SubWallet also uses the same API as Polkadot.js
      const extensions = await window.polkadotExtensionDapp.web3Enable('Polkadot SSO');
      if (extensions.length === 0) {
        throw ErrorService.createError('NO_EXTENSIONS_FOUND', 'No SubWallet extension found');
      }

      const accounts = await window.polkadotExtensionDapp.web3Accounts();
      if (accounts.length === 0) {
        throw ErrorService.noAccountsFound('subwallet');
      }

      const account = accounts[0];
      const injector = await window.polkadotExtensionDapp.web3FromAddress(account.address);

      if (!injector?.signer?.signRaw) {
        throw ErrorService.createError(
          'SIGNING_NOT_SUPPORTED',
          'SubWallet does not support message signing'
        );
      }

      return {
        getAddress: () => account.address,
        signMessage: async (message: string) => {
          const { signature } = await injector.signer.signRaw({
            address: account.address,
            data: message,
            type: 'bytes',
          });
          return signature;
        },
      };
    } catch (error) {
      throw ErrorService.walletConnectionFailed('subwallet', error);
    }
  }
}

export class NovaWalletAdapter implements PolkadotWalletAdapter {
  name = 'nova-wallet';
  private qrAuthService?: NovaQrAuthService;

  isAvailable(): boolean {
    // Nova Wallet is mobile-only, so we always return true for QR code support
    return typeof window !== 'undefined';
  }

  /**
   * Set up QR authentication service
   */
  setQrAuthService(qrAuthService: NovaQrAuthService): void {
    this.qrAuthService = qrAuthService;
  }

  /**
   * Connect using QR code authentication (mobile)
   */
  async connectWithQr(
    challengeId: string,
    message: string,
    address: string
  ): Promise<{ qrData: NovaQrAuthData; waitForCompletion: () => Promise<void> }> {
    if (!this.qrAuthService) {
      throw ErrorService.createError(
        'QR_SERVICE_NOT_CONFIGURED',
        'QR authentication service not configured for Nova Wallet'
      );
    }

    try {
      const qrData = await this.qrAuthService.generateQrAuth(challengeId, message, address);
      
      return {
        qrData,
        waitForCompletion: () => this.qrAuthService!.waitForCompletion(challengeId),
      };
    } catch (error) {
      throw ErrorService.walletConnectionFailed('nova-wallet', error);
    }
  }

  /**
   * Connect using browser extension (if available)
   */
  async connect(): Promise<WalletSigner> {
    // Check if Nova Wallet browser extension is available
    const hasExtension = typeof window !== 'undefined' && !!window.injectedWeb3?.['nova-wallet'];
    
    if (!hasExtension) {
      // If no extension, throw error suggesting QR code method
      throw ErrorService.createError(
        'EXTENSION_NOT_AVAILABLE',
        'Nova Wallet browser extension not found. Use connectWithQr() for mobile authentication.'
      );
    }

    try {
      // Nova Wallet uses the standard Polkadot extension API
      const extensions = await window.polkadotExtensionDapp.web3Enable('Polkadot SSO');
      if (extensions.length === 0) {
        throw ErrorService.createError('NO_EXTENSIONS_FOUND', 'No Nova Wallet extension found');
      }

      const accounts = await window.polkadotExtensionDapp.web3Accounts();
      if (accounts.length === 0) {
        throw ErrorService.noAccountsFound('nova-wallet');
      }

      const account = accounts[0];
      const injector = await window.polkadotExtensionDapp.web3FromAddress(account.address);

      if (!injector?.signer?.signRaw) {
        throw ErrorService.createError(
          'SIGNING_NOT_SUPPORTED',
          'Nova Wallet does not support message signing'
        );
      }

      return {
        getAddress: () => account.address,
        signMessage: async (message: string) => {
          const { signature } = await injector.signer.signRaw({
            address: account.address,
            data: message,
            type: 'bytes',
          });
          return signature;
        },
      };
    } catch (error) {
      throw ErrorService.walletConnectionFailed('nova-wallet', error);
    }
  }
}

export const defaultWalletAdapters: PolkadotWalletAdapter[] = [
  new PolkadotJsAdapter(),
  new TalismanAdapter(),
  new SubWalletAdapter(),
  new NovaWalletAdapter(),
];

export function getAvailableWallets(): PolkadotWalletAdapter[] {
  return defaultWalletAdapters.filter(adapter => adapter.isAvailable());
}

export function getWalletAdapter(name: string): PolkadotWalletAdapter | null {
  return defaultWalletAdapters.find(adapter => adapter.name === name) || null;
}

// Type declarations for window objects
declare global {
  interface Window {
    polkadotExtensionDapp: {
      web3Enable: (appName: string) => Promise<any[]>;
      web3Accounts: () => Promise<any[]>;
      web3FromAddress: (address: string) => Promise<any>;
    };
    injectedWeb3?: {
      [key: string]: any;
    };
    talismanEth?: any;
    SubWallet?: any;
  }
}
