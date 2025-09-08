"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultWalletAdapters = exports.NovaWalletAdapter = exports.SubWalletAdapter = exports.TalismanAdapter = exports.PolkadotJsAdapter = void 0;
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
class NovaWalletAdapter {
    constructor() {
        this.name = 'nova-wallet';
    }
    isAvailable() {
        // Nova Wallet is mobile-only, so we always return true for QR code support
        return typeof window !== 'undefined';
    }
    /**
     * Set up QR authentication service
     */
    setQrAuthService(qrAuthService) {
        this.qrAuthService = qrAuthService;
    }
    /**
     * Connect using QR code authentication (mobile)
     */
    async connectWithQr(challengeId, message, address) {
        if (!this.qrAuthService) {
            throw core_1.ErrorService.createError('QR_SERVICE_NOT_CONFIGURED', 'QR authentication service not configured for Nova Wallet');
        }
        try {
            const qrData = await this.qrAuthService.generateQrAuth(challengeId, message, address);
            return {
                qrData,
                waitForCompletion: () => this.qrAuthService.waitForCompletion(challengeId),
            };
        }
        catch (error) {
            throw core_1.ErrorService.walletConnectionFailed('nova-wallet', error);
        }
    }
    /**
     * Connect using browser extension (if available)
     */
    async connect() {
        // Check if Nova Wallet browser extension is available
        const hasExtension = typeof window !== 'undefined' && !!window.injectedWeb3?.['nova-wallet'];
        if (!hasExtension) {
            // If no extension, throw error suggesting QR code method
            throw core_1.ErrorService.createError('EXTENSION_NOT_AVAILABLE', 'Nova Wallet browser extension not found. Use connectWithQr() for mobile authentication.');
        }
        try {
            // Nova Wallet uses the standard Polkadot extension API
            const extensions = await window.polkadotExtensionDapp.web3Enable('Polkadot SSO');
            if (extensions.length === 0) {
                throw core_1.ErrorService.createError('NO_EXTENSIONS_FOUND', 'No Nova Wallet extension found');
            }
            const accounts = await window.polkadotExtensionDapp.web3Accounts();
            if (accounts.length === 0) {
                throw core_1.ErrorService.noAccountsFound('nova-wallet');
            }
            const account = accounts[0];
            const injector = await window.polkadotExtensionDapp.web3FromAddress(account.address);
            if (!injector?.signer?.signRaw) {
                throw core_1.ErrorService.createError('SIGNING_NOT_SUPPORTED', 'Nova Wallet does not support message signing');
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
            throw core_1.ErrorService.walletConnectionFailed('nova-wallet', error);
        }
    }
}
exports.NovaWalletAdapter = NovaWalletAdapter;
exports.defaultWalletAdapters = [
    new PolkadotJsAdapter(),
    new TalismanAdapter(),
    new SubWalletAdapter(),
    new NovaWalletAdapter(),
];
function getAvailableWallets() {
    return exports.defaultWalletAdapters.filter(adapter => adapter.isAvailable());
}
function getWalletAdapter(name) {
    return exports.defaultWalletAdapters.find(adapter => adapter.name === name) || null;
}
//# sourceMappingURL=walletAdapters.js.map