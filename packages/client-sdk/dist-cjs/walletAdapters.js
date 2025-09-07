"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultWalletAdapters = exports.SubWalletAdapter = exports.TalismanAdapter = exports.PolkadotJsAdapter = void 0;
exports.getAvailableWallets = getAvailableWallets;
exports.getWalletAdapter = getWalletAdapter;
const core_1 = require("@polkadot-auth/core");
class PolkadotJsAdapter {
    constructor() {
        this.name = 'polkadot-js';
    }
    isAvailable() {
        return typeof window !== 'undefined' && !!window.polkadotExtensionDapp;
    }
    async connect() {
        if (!this.isAvailable()) {
            throw core_1.ErrorService.walletNotAvailable('polkadot-js');
        }
        try {
            const extensions = await window.polkadotExtensionDapp.web3Enable('Polkadot SSO');
            if (extensions.length === 0) {
                throw core_1.ErrorService.createError('NO_EXTENSIONS_FOUND', 'No Polkadot extensions found');
            }
            const accounts = await window.polkadotExtensionDapp.web3Accounts();
            if (accounts.length === 0) {
                throw core_1.ErrorService.noAccountsFound('polkadot-js');
            }
            const account = accounts[0];
            const injector = await window.polkadotExtensionDapp.web3FromAddress(account.address);
            if (!injector?.signer?.signRaw) {
                throw core_1.ErrorService.createError('SIGNING_NOT_SUPPORTED', 'Wallet does not support message signing');
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
            throw core_1.ErrorService.walletConnectionFailed('polkadot-js', error);
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
            throw core_1.ErrorService.walletNotAvailable('talisman');
        }
        try {
            // Talisman uses the same API as Polkadot.js
            const extensions = await window.polkadotExtensionDapp.web3Enable('Polkadot SSO');
            if (extensions.length === 0) {
                throw core_1.ErrorService.createError('NO_EXTENSIONS_FOUND', 'No Talisman extension found');
            }
            const accounts = await window.polkadotExtensionDapp.web3Accounts();
            if (accounts.length === 0) {
                throw core_1.ErrorService.noAccountsFound('talisman');
            }
            const account = accounts[0];
            const injector = await window.polkadotExtensionDapp.web3FromAddress(account.address);
            if (!injector?.signer?.signRaw) {
                throw core_1.ErrorService.createError('SIGNING_NOT_SUPPORTED', 'Talisman does not support message signing');
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
            throw core_1.ErrorService.walletConnectionFailed('talisman', error);
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
            throw core_1.ErrorService.walletNotAvailable('subwallet');
        }
        try {
            // SubWallet also uses the same API as Polkadot.js
            const extensions = await window.polkadotExtensionDapp.web3Enable('Polkadot SSO');
            if (extensions.length === 0) {
                throw core_1.ErrorService.createError('NO_EXTENSIONS_FOUND', 'No SubWallet extension found');
            }
            const accounts = await window.polkadotExtensionDapp.web3Accounts();
            if (accounts.length === 0) {
                throw core_1.ErrorService.noAccountsFound('subwallet');
            }
            const account = accounts[0];
            const injector = await window.polkadotExtensionDapp.web3FromAddress(account.address);
            if (!injector?.signer?.signRaw) {
                throw core_1.ErrorService.createError('SIGNING_NOT_SUPPORTED', 'SubWallet does not support message signing');
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
            throw core_1.ErrorService.walletConnectionFailed('subwallet', error);
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