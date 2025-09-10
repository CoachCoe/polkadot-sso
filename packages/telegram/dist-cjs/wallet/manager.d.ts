import { TelegramWallet } from '../types';
/**
 * Secure wallet manager for Telegram users
 */
export declare class TelegramWalletManager {
    private keyring;
    private wallets;
    private encryptionKey;
    constructor(encryptionKey?: string);
    /**
     * Initialize the wallet manager
     */
    initialize(): Promise<void>;
    /**
     * Create a new wallet for a Telegram user
     */
    createWallet(userId: number): Promise<TelegramWallet>;
    /**
     * Get wallet for a user
     */
    getWallet(userId: number): TelegramWallet | null;
    /**
     * Sign a message with user's wallet
     */
    signMessage(userId: number, message: string): Promise<string>;
    /**
     * Verify signature
     */
    verifySignature(userId: number, message: string, signature: string): Promise<boolean>;
    /**
     * Delete wallet for user
     */
    deleteWallet(userId: number): boolean;
    /**
     * Get all wallets
     */
    getAllWallets(): TelegramWallet[];
    /**
     * Generate encryption key
     */
    private generateEncryptionKey;
    /**
     * Encrypt data with user-specific key
     */
    private encrypt;
    /**
     * Decrypt data with user-specific key
     */
    private decrypt;
    /**
     * Generate user-specific encryption key
     */
    private generateUserKey;
}
//# sourceMappingURL=manager.d.ts.map