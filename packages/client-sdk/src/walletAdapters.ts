import { PolkadotWalletAdapter, WalletSigner } from './types';

export class PolkadotJsAdapter implements PolkadotWalletAdapter {
  name = 'polkadot-js';

  isAvailable(): boolean {
    return typeof window !== 'undefined' && !!window.polkadotExtensionDapp;
  }

  async connect(): Promise<WalletSigner> {
    if (!this.isAvailable()) {
      throw new Error('Polkadot.js extension not available');
    }

    try {
      const extensions = await window.polkadotExtensionDapp.web3Enable('Polkadot SSO');
      if (extensions.length === 0) {
        throw new Error('No Polkadot extensions found');
      }

      const accounts = await window.polkadotExtensionDapp.web3Accounts();
      if (accounts.length === 0) {
        throw new Error('No accounts found in Polkadot extension');
      }

      const account = accounts[0];
      const injector = await window.polkadotExtensionDapp.web3FromAddress(account.address);

      if (!injector?.signer?.signRaw) {
        throw new Error('Wallet does not support message signing');
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
      throw new Error(
        `Failed to connect to Polkadot.js: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
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
      throw new Error('Talisman extension not available');
    }

    try {
      // Talisman uses the same API as Polkadot.js
      const extensions = await window.polkadotExtensionDapp.web3Enable('Polkadot SSO');
      if (extensions.length === 0) {
        throw new Error('No Talisman extension found');
      }

      const accounts = await window.polkadotExtensionDapp.web3Accounts();
      if (accounts.length === 0) {
        throw new Error('No accounts found in Talisman extension');
      }

      const account = accounts[0];
      const injector = await window.polkadotExtensionDapp.web3FromAddress(account.address);

      if (!injector?.signer?.signRaw) {
        throw new Error('Talisman does not support message signing');
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
      throw new Error(
        `Failed to connect to Talisman: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
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
      throw new Error('SubWallet extension not available');
    }

    try {
      // SubWallet also uses the same API as Polkadot.js
      const extensions = await window.polkadotExtensionDapp.web3Enable('Polkadot SSO');
      if (extensions.length === 0) {
        throw new Error('No SubWallet extension found');
      }

      const accounts = await window.polkadotExtensionDapp.web3Accounts();
      if (accounts.length === 0) {
        throw new Error('No accounts found in SubWallet extension');
      }

      const account = accounts[0];
      const injector = await window.polkadotExtensionDapp.web3FromAddress(account.address);

      if (!injector?.signer?.signRaw) {
        throw new Error('SubWallet does not support message signing');
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
      throw new Error(
        `Failed to connect to SubWallet: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}

export const defaultWalletAdapters: PolkadotWalletAdapter[] = [
  new PolkadotJsAdapter(),
  new TalismanAdapter(),
  new SubWalletAdapter(),
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
    talismanEth?: any;
    SubWallet?: any;
  }
}
