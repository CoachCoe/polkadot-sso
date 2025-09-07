import type { WalletAccount, WalletConnection } from '../types/index.js';
export interface WalletExtensionInfo {
    name: string;
    displayName: string;
    icon: string;
    extensionName: string;
    isAvailable: boolean;
}
export declare class WalletProviderService {
    private extensions;
    private availableWallets;
    constructor();
    /**
     * Detect all available wallet extensions
     */
    private detectAvailableWallets;
    /**
     * Get all available wallet extensions
     */
    getAvailableWallets(): WalletExtensionInfo[];
    /**
     * Get all wallet configurations (available and unavailable)
     */
    getAllWallets(): WalletExtensionInfo[];
    /**
     * Check if a specific wallet is available
     */
    isWalletAvailable(walletName: string): boolean;
    /**
     * Connect to a specific wallet extension
     */
    connectWallet(walletName: string): Promise<WalletConnection>;
    /**
     * Sign a message with a specific wallet
     */
    signMessage(walletName: string, account: WalletAccount, message: string): Promise<string>;
    /**
     * Disconnect from a specific wallet
     */
    disconnectWallet(walletName: string): Promise<void>;
    /**
     * Disconnect from all wallets
     */
    disconnectAllWallets(): Promise<void>;
    /**
     * Get connected wallets
     */
    getConnectedWallets(): string[];
    /**
     * Check if a wallet is connected
     */
    isWalletConnected(walletName: string): boolean;
}
export declare const walletProviderService: WalletProviderService;
//# sourceMappingURL=walletProviderService.d.ts.map