"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.walletProviderService = exports.WalletProviderService = void 0;
const errorService_js_1 = require("./errorService.js");
class WalletProviderService {
    constructor() {
        this.extensions = new Map();
        this.availableWallets = [];
        this.detectAvailableWallets();
    }
    /**
     * Detect all available wallet extensions
     */
    detectAvailableWallets() {
        if (typeof window === 'undefined' || !window.injectedWeb3) {
            return;
        }
        const walletConfigs = [
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
    getAvailableWallets() {
        return this.availableWallets.filter(wallet => wallet.isAvailable);
    }
    /**
     * Get all wallet configurations (available and unavailable)
     */
    getAllWallets() {
        return this.availableWallets;
    }
    /**
     * Check if a specific wallet is available
     */
    isWalletAvailable(walletName) {
        const wallet = this.availableWallets.find(w => w.name === walletName);
        return wallet?.isAvailable || false;
    }
    /**
     * Connect to a specific wallet extension
     */
    async connectWallet(walletName) {
        if (typeof window === 'undefined' || !window.injectedWeb3) {
            throw errorService_js_1.ErrorService.createError('ENVIRONMENT_ERROR', 'Wallet extensions not available in this environment');
        }
        const walletConfig = this.availableWallets.find(w => w.name === walletName);
        if (!walletConfig) {
            throw errorService_js_1.ErrorService.createError('WALLET_NOT_FOUND', `Wallet ${walletName} not found`, { walletName }, walletName);
        }
        if (!walletConfig.isAvailable) {
            throw errorService_js_1.ErrorService.walletNotAvailable(walletName);
        }
        try {
            // Enable the extension
            const extension = await window.injectedWeb3[walletConfig.extensionName].enable('Polkadot SSO');
            this.extensions.set(walletName, extension);
            // Get accounts
            const accounts = await extension.accounts.get();
            // Create wallet provider
            const provider = {
                id: walletName,
                name: walletConfig.displayName,
                description: `Connect with ${walletConfig.displayName}`,
                icon: walletConfig.icon,
                connect: async () => this.connectWallet(walletName),
                isAvailable: () => this.isWalletAvailable(walletName),
            };
            // Create wallet accounts
            const walletAccounts = accounts.map((account) => ({
                address: account.address,
                name: account.meta?.name,
                type: account.meta?.source,
                meta: account.meta,
            }));
            // Create wallet connection
            const connection = {
                provider,
                accounts: walletAccounts,
                signMessage: async (message) => {
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
        }
        catch (error) {
            throw errorService_js_1.ErrorService.walletConnectionFailed(walletName, error);
        }
    }
    /**
     * Sign a message with a specific wallet
     */
    async signMessage(walletName, account, message) {
        const extension = this.extensions.get(walletName);
        if (!extension) {
            throw errorService_js_1.ErrorService.walletNotConnected(walletName);
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
        }
        catch (error) {
            throw errorService_js_1.ErrorService.walletSigningFailed(walletName, error);
        }
    }
    /**
     * Disconnect from a specific wallet
     */
    async disconnectWallet(walletName) {
        this.extensions.delete(walletName);
    }
    /**
     * Disconnect from all wallets
     */
    async disconnectAllWallets() {
        this.extensions.clear();
    }
    /**
     * Get connected wallets
     */
    getConnectedWallets() {
        return Array.from(this.extensions.keys());
    }
    /**
     * Check if a wallet is connected
     */
    isWalletConnected(walletName) {
        return this.extensions.has(walletName);
    }
}
exports.WalletProviderService = WalletProviderService;
// Global wallet provider service instance
exports.walletProviderService = new WalletProviderService();
//# sourceMappingURL=walletProviderService.js.map