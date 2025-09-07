"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultWalletAdapters = exports.SubWalletAdapter = exports.TalismanAdapter = exports.PolkadotJsAdapter = void 0;
exports.getAvailableWallets = getAvailableWallets;
exports.getWalletAdapter = getWalletAdapter;
class PolkadotJsAdapter {
    constructor() {
        this.name = 'polkadot-js';
    }
    isAvailable() {
        return typeof window !== 'undefined' && !!window.polkadotExtensionDapp;
    }
    async connect() {
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
                signMessage: async (message) => {
                    const { signature } = await injector.signer.signRaw({
                        address: account.address,
                        data: message,
                        type: 'bytes',
                    });
                    return signature;
                },
            };
        }
        catch (error) {
            throw new Error(`Failed to connect to Polkadot.js: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}
exports.PolkadotJsAdapter = PolkadotJsAdapter;
class TalismanAdapter {
    constructor() {
        this.name = 'talisman';
    }
    isAvailable() {
        return typeof window !== 'undefined' && !!window.talismanEth;
    }
    async connect() {
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
                signMessage: async (message) => {
                    const { signature } = await injector.signer.signRaw({
                        address: account.address,
                        data: message,
                        type: 'bytes',
                    });
                    return signature;
                },
            };
        }
        catch (error) {
            throw new Error(`Failed to connect to Talisman: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}
exports.TalismanAdapter = TalismanAdapter;
class SubWalletAdapter {
    constructor() {
        this.name = 'subwallet';
    }
    isAvailable() {
        return typeof window !== 'undefined' && !!window.SubWallet;
    }
    async connect() {
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
                signMessage: async (message) => {
                    const { signature } = await injector.signer.signRaw({
                        address: account.address,
                        data: message,
                        type: 'bytes',
                    });
                    return signature;
                },
            };
        }
        catch (error) {
            throw new Error(`Failed to connect to SubWallet: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}
exports.SubWalletAdapter = SubWalletAdapter;
exports.defaultWalletAdapters = [
    new PolkadotJsAdapter(),
    new TalismanAdapter(),
    new SubWalletAdapter(),
];
function getAvailableWallets() {
    return exports.defaultWalletAdapters.filter(adapter => adapter.isAvailable());
}
function getWalletAdapter(name) {
    return exports.defaultWalletAdapters.find(adapter => adapter.name === name) || null;
}
//# sourceMappingURL=walletAdapters.js.map