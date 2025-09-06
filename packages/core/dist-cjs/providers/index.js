"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_PROVIDERS = exports.novaWalletProvider = exports.subWalletProvider = exports.talismanProvider = exports.polkadotJsProvider = void 0;
exports.getProviderById = getProviderById;
exports.getAvailableProviders = getAvailableProviders;
exports.createCustomProvider = createCustomProvider;
function isBrowser() {
    return typeof window !== 'undefined';
}
function getInjectedWeb3() {
    return isBrowser() ? window.injectedWeb3 : undefined;
}
// Helper function to detect available extensions
async function getAvailableExtensions() {
    if (!isBrowser())
        return [];
    try {
        const { web3Enable } = await Promise.resolve().then(() => __importStar(require('@polkadot/extension-dapp')));
        const extensions = await web3Enable('Polkadot Auth');
        return extensions.map(ext => ext.name.toLowerCase());
    }
    catch (error) {
        console.warn('Failed to detect extensions:', error);
        return [];
    }
}
exports.polkadotJsProvider = {
    id: 'polkadot-js',
    name: 'Polkadot.js Extension',
    description: 'Official Polkadot browser extension',
    icon: 'https://polkadot.js.org/extension/assets/logo.svg',
    isAvailable: async () => {
        const extensions = await getAvailableExtensions();
        return extensions.some(name => name.includes('polkadot') || name.includes('js') || name.includes('extension'));
    },
    connect: async () => {
        if (!isBrowser()) {
            throw new Error('Polkadot.js Extension is only available in browser environment');
        }
        const { web3Enable, web3Accounts, web3FromAddress } = await Promise.resolve().then(() => __importStar(require('@polkadot/extension-dapp')));
        await web3Enable('Polkadot Auth');
        const accounts = await web3Accounts();
        return {
            provider: exports.polkadotJsProvider,
            accounts: accounts.map(account => ({
                address: account.address,
                name: account.meta.name,
                type: account.type,
                genesisHash: account.meta.genesisHash || undefined,
                meta: account.meta,
            })),
            signMessage: async (message) => {
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
            disconnect: async () => { },
        };
    },
};
exports.talismanProvider = {
    id: 'talisman',
    name: 'Talisman',
    description: 'Talisman wallet extension',
    icon: 'https://talisman.xyz/favicon.ico',
    isAvailable: async () => {
        const extensions = await getAvailableExtensions();
        return extensions.some(name => name.includes('talisman'));
    },
    connect: async () => {
        if (!isBrowser()) {
            throw new Error('Talisman is only available in browser environment');
        }
        const { web3Enable, web3Accounts, web3FromAddress } = await Promise.resolve().then(() => __importStar(require('@polkadot/extension-dapp')));
        await web3Enable('Polkadot Auth');
        const accounts = await web3Accounts();
        return {
            provider: exports.talismanProvider,
            accounts: accounts.map(account => ({
                address: account.address,
                name: account.meta.name,
                type: account.type,
                genesisHash: account.meta.genesisHash || undefined,
                meta: account.meta,
            })),
            signMessage: async (message) => {
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
            disconnect: async () => { },
        };
    },
};
exports.subWalletProvider = {
    id: 'subwallet',
    name: 'SubWallet',
    description: 'SubWallet extension',
    icon: 'https://subwallet.app/favicon.ico',
    isAvailable: async () => {
        const extensions = await getAvailableExtensions();
        return extensions.some(name => name.includes('subwallet') || name.includes('sub'));
    },
    connect: async () => {
        if (!isBrowser()) {
            throw new Error('SubWallet is only available in browser environment');
        }
        const { web3Enable, web3Accounts, web3FromAddress } = await Promise.resolve().then(() => __importStar(require('@polkadot/extension-dapp')));
        await web3Enable('Polkadot Auth');
        const accounts = await web3Accounts();
        return {
            provider: exports.subWalletProvider,
            accounts: accounts.map(account => ({
                address: account.address,
                name: account.meta.name,
                type: account.type,
                genesisHash: account.meta.genesisHash || undefined,
                meta: account.meta,
            })),
            signMessage: async (message) => {
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
            disconnect: async () => { },
        };
    },
};
exports.novaWalletProvider = {
    id: 'nova',
    name: 'Nova Wallet',
    description: 'Nova Wallet mobile app with browser bridge',
    icon: 'https://novawallet.io/favicon.ico',
    isAvailable: async () => {
        const extensions = await getAvailableExtensions();
        return extensions.some(name => name.includes('nova'));
    },
    connect: async () => {
        if (!isBrowser()) {
            throw new Error('Nova Wallet is only available in browser environment');
        }
        const { web3Enable, web3Accounts, web3FromAddress } = await Promise.resolve().then(() => __importStar(require('@polkadot/extension-dapp')));
        await web3Enable('Polkadot Auth');
        const accounts = await web3Accounts();
        return {
            provider: exports.novaWalletProvider,
            accounts: accounts.map(account => ({
                address: account.address,
                name: account.meta.name,
                type: account.type,
                genesisHash: account.meta.genesisHash || undefined,
                meta: account.meta,
            })),
            signMessage: async (message) => {
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
            disconnect: async () => {
                // Nova Wallet doesn't have a disconnect method
            },
        };
    },
};
exports.DEFAULT_PROVIDERS = [
    exports.polkadotJsProvider,
    exports.talismanProvider,
    exports.subWalletProvider,
    exports.novaWalletProvider,
];
function getProviderById(id) {
    return exports.DEFAULT_PROVIDERS.find(provider => provider.id === id);
}
async function getAvailableProviders() {
    const availableProviders = [];
    for (const provider of exports.DEFAULT_PROVIDERS) {
        if (await provider.isAvailable()) {
            availableProviders.push(provider);
        }
    }
    return availableProviders;
}
function createCustomProvider(config) {
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
//# sourceMappingURL=index.js.map