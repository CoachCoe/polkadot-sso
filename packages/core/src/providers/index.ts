import { WalletConnection, WalletProvider } from '../types';

declare global {
  interface Window {
    injectedWeb3?: {
      [key: string]: any;
    };
  }
}

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function getInjectedWeb3(): any {
  return isBrowser() ? window.injectedWeb3 : undefined;
}

// Helper function to detect available extensions
async function getAvailableExtensions(): Promise<string[]> {
  if (!isBrowser()) return [];

  try {
    const { web3Enable } = await import('@polkadot/extension-dapp');
    const extensions = await web3Enable('Polkadot Auth');
    return extensions.map(ext => ext.name.toLowerCase());
  } catch (error) {
    console.warn('Failed to detect extensions:', error);
    return [];
  }
}

export const polkadotJsProvider: WalletProvider = {
  id: 'polkadot-js',
  name: 'Polkadot.js Extension',
  description: 'Official Polkadot browser extension',
  icon: 'https://polkadot.js.org/extension/assets/logo.svg',

  isAvailable: async () => {
    const extensions = await getAvailableExtensions();
    return extensions.some(
      name => name.includes('polkadot') || name.includes('js') || name.includes('extension')
    );
  },

  connect: async (): Promise<WalletConnection> => {
    if (!isBrowser()) {
      throw new Error('Polkadot.js Extension is only available in browser environment');
    }

    const { web3Enable, web3Accounts, web3FromAddress } = await import('@polkadot/extension-dapp');

    await web3Enable('Polkadot Auth');

    const accounts = await web3Accounts();

    return {
      provider: polkadotJsProvider,
      accounts: accounts.map(account => ({
        address: account.address,
        name: account.meta.name,
        type: account.type,
        genesisHash: account.meta.genesisHash || undefined,
        meta: account.meta,
      })),

      signMessage: async (message: string): Promise<string> => {
        if (accounts.length === 0) {
          throw new Error('No accounts available');
        }

        const account = accounts[0];
        const injector = await web3FromAddress(account.address);

        if (!injector.signer.signRaw) {
          throw new Error('Signer does not support raw signing');
        }

        const signResult = await injector.signer.signRaw({
          type: 'bytes',
          data: message,
          address: account.address,
        });

        return signResult.signature;
      },

      disconnect: async (): Promise<void> => {},
    };
  },
};

export const talismanProvider: WalletProvider = {
  id: 'talisman',
  name: 'Talisman',
  description: 'Talisman wallet extension',
  icon: 'https://talisman.xyz/favicon.ico',

  isAvailable: async () => {
    const extensions = await getAvailableExtensions();
    return extensions.some(name => name.includes('talisman'));
  },

  connect: async (): Promise<WalletConnection> => {
    if (!isBrowser()) {
      throw new Error('Talisman is only available in browser environment');
    }

    const { web3Enable, web3Accounts, web3FromAddress } = await import('@polkadot/extension-dapp');

    await web3Enable('Polkadot Auth');

    const accounts = await web3Accounts();

    return {
      provider: talismanProvider,
      accounts: accounts.map(account => ({
        address: account.address,
        name: account.meta.name,
        type: account.type,
        genesisHash: account.meta.genesisHash || undefined,
        meta: account.meta,
      })),

      signMessage: async (message: string): Promise<string> => {
        if (accounts.length === 0) {
          throw new Error('No accounts available');
        }

        const account = accounts[0];
        const injector = await web3FromAddress(account.address);

        if (!injector.signer.signRaw) {
          throw new Error('Signer does not support raw signing');
        }

        const signResult = await injector.signer.signRaw({
          type: 'bytes',
          data: message,
          address: account.address,
        });

        return signResult.signature;
      },

      disconnect: async (): Promise<void> => {},
    };
  },
};

export const subWalletProvider: WalletProvider = {
  id: 'subwallet',
  name: 'SubWallet',
  description: 'SubWallet extension',
  icon: 'https://subwallet.app/favicon.ico',

  isAvailable: async () => {
    const extensions = await getAvailableExtensions();
    return extensions.some(name => name.includes('subwallet') || name.includes('sub'));
  },

  connect: async (): Promise<WalletConnection> => {
    if (!isBrowser()) {
      throw new Error('SubWallet is only available in browser environment');
    }

    const { web3Enable, web3Accounts, web3FromAddress } = await import('@polkadot/extension-dapp');

    await web3Enable('Polkadot Auth');

    const accounts = await web3Accounts();

    return {
      provider: subWalletProvider,
      accounts: accounts.map(account => ({
        address: account.address,
        name: account.meta.name,
        type: account.type,
        genesisHash: account.meta.genesisHash || undefined,
        meta: account.meta,
      })),

      signMessage: async (message: string): Promise<string> => {
        if (accounts.length === 0) {
          throw new Error('No accounts available');
        }

        const account = accounts[0];
        const injector = await web3FromAddress(account.address);

        if (!injector.signer.signRaw) {
          throw new Error('Signer does not support raw signing');
        }

        const signResult = await injector.signer.signRaw({
          type: 'bytes',
          data: message,
          address: account.address,
        });

        return signResult.signature;
      },

      disconnect: async (): Promise<void> => {},
    };
  },
};

export const novaWalletProvider: WalletProvider = {
  id: 'nova',
  name: 'Nova Wallet',
  description: 'Nova Wallet mobile app with browser bridge',
  icon: 'https://novawallet.io/favicon.ico',

  isAvailable: async () => {
    const extensions = await getAvailableExtensions();
    return extensions.some(name => name.includes('nova'));
  },

  connect: async (): Promise<WalletConnection> => {
    if (!isBrowser()) {
      throw new Error('Nova Wallet is only available in browser environment');
    }

    const { web3Enable, web3Accounts, web3FromAddress } = await import('@polkadot/extension-dapp');

    await web3Enable('Polkadot Auth');

    const accounts = await web3Accounts();

    return {
      provider: novaWalletProvider,
      accounts: accounts.map(account => ({
        address: account.address,
        name: account.meta.name,
        type: account.type,
        genesisHash: account.meta.genesisHash || undefined,
        meta: account.meta,
      })),

      signMessage: async (message: string): Promise<string> => {
        if (accounts.length === 0) {
          throw new Error('No accounts available');
        }

        const account = accounts[0];
        const injector = await web3FromAddress(account.address);

        if (!injector.signer.signRaw) {
          throw new Error('Signer does not support raw signing');
        }

        const signResult = await injector.signer.signRaw({
          type: 'bytes',
          data: message,
          address: account.address,
        });

        return signResult.signature;
      },

      disconnect: async (): Promise<void> => {
        // Nova Wallet doesn't have a disconnect method
      },
    };
  },
};

export const DEFAULT_PROVIDERS: WalletProvider[] = [
  polkadotJsProvider,
  talismanProvider,
  subWalletProvider,
  novaWalletProvider,
];

export function getProviderById(id: string): WalletProvider | undefined {
  return DEFAULT_PROVIDERS.find(provider => provider.id === id);
}

export async function getAvailableProviders(): Promise<WalletProvider[]> {
  const availableProviders: WalletProvider[] = [];

  for (const provider of DEFAULT_PROVIDERS) {
    if (await provider.isAvailable()) {
      availableProviders.push(provider);
    }
  }

  return availableProviders;
}

export function createCustomProvider(config: Partial<WalletProvider>): WalletProvider {
  return {
    id: 'custom',
    name: 'Custom Provider',
    description: 'Custom wallet provider',
    icon: '',
    isAvailable: () => Promise.resolve(false),
    connect: async () => {
      throw new Error('Custom provider not implemented');
    },
    ...config,
  };
}
