import { WalletConnection, WalletProvider } from '@polkadot-auth/core';
import { EventEmitter } from 'events';
import { TelegramSessionManager } from './auth/session';
import { TelegramChallenge, TelegramProviderConfig, TelegramQRData, TelegramWallet } from './types';
/**
 * Telegram provider for Polkadot SSO
 */
export declare class TelegramProvider extends EventEmitter implements WalletProvider {
    readonly id = "telegram";
    readonly name = "Telegram";
    readonly icon = "\uD83D\uDCF1";
    readonly isAvailable: () => boolean;
    private config;
    private bot;
    private walletManager;
    private sessionManager;
    private qrGenerator;
    private botHandlers;
    private isRunning;
    constructor(config: TelegramProviderConfig);
    /**
     * Initialize the provider
     */
    initialize(): Promise<void>;
    /**
     * Start the Telegram bot
     */
    startBot(): Promise<void>;
    /**
     * Stop the Telegram bot
     */
    stopBot(): Promise<void>;
    /**
     * Generate QR code for authentication
     */
    generateQRCode(challengeId: string, message: string): Promise<TelegramQRData>;
    /**
     * Check authentication status
     */
    checkAuthStatus(challengeId: string): Promise<TelegramChallenge | null>;
    /**
     * Create wallet for user
     */
    createWallet(userId: number): Promise<TelegramWallet>;
    /**
     * Get user wallet
     */
    getWallet(userId: number): Promise<TelegramWallet | null>;
    /**
     * Sign message with user's wallet
     */
    signMessage(userId: number, message: string): Promise<string>;
    /**
     * Verify signature
     */
    verifySignature(userId: number, message: string, signature: string): Promise<boolean>;
    /**
     * Complete authentication
     */
    completeAuthentication(challengeId: string, userId: number, walletAddress: string, signature: string): Promise<boolean>;
    /**
     * Fail authentication
     */
    failAuthentication(challengeId: string, error: string): Promise<void>;
    /**
     * Get provider statistics
     */
    getStats(): {
        isRunning: boolean;
        totalWallets: number;
        activeChallenges: number;
        challengeStats: ReturnType<TelegramSessionManager['getChallengeStats']>;
    };
    /**
     * Connect to Telegram (required by WalletProvider interface)
     */
    connect(): Promise<WalletConnection>;
    /**
     * Clean up resources
     */
    cleanup(): Promise<void>;
}
/**
 * Create a Telegram provider instance
 */
export declare function createTelegramProvider(config: TelegramProviderConfig): TelegramProvider;
/**
 * Default Telegram provider configuration
 */
export declare const DEFAULT_TELEGRAM_CONFIG: Partial<TelegramProviderConfig>;
//# sourceMappingURL=provider.d.ts.map