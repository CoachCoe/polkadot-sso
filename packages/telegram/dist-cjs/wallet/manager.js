"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelegramWalletManager = void 0;
const core_1 = require("@polkadot-auth/core");
const keyring_1 = require("@polkadot/keyring");
const util_1 = require("@polkadot/util");
const util_crypto_1 = require("@polkadot/util-crypto");
/**
 * Secure wallet manager for Telegram users
 */
class TelegramWalletManager {
    constructor(encryptionKey) {
        this.wallets = new Map();
        this.encryptionKey = encryptionKey || this.generateEncryptionKey();
        this.keyring = new keyring_1.Keyring({ type: 'sr25519' });
    }
    /**
     * Initialize the wallet manager
     */
    async initialize() {
        await (0, util_crypto_1.cryptoWaitReady)();
    }
    /**
     * Create a new wallet for a Telegram user
     */
    async createWallet(userId) {
        try {
            // Generate mnemonic
            const mnemonic = (0, util_crypto_1.mnemonicGenerate)();
            const seed = (0, util_crypto_1.mnemonicToMiniSecret)(mnemonic);
            // Create keypair
            const keypair = this.keyring.addFromSeed(seed);
            const address = keypair.address;
            const publicKey = (0, util_1.u8aToHex)(keypair.publicKey);
            // Encrypt the seed
            const encryptedSeed = this.encrypt(seed, userId);
            const wallet = {
                userId,
                address,
                publicKey,
                encryptedSeed,
                createdAt: new Date(),
                lastUsed: new Date(),
            };
            this.wallets.set(userId, wallet);
            return wallet;
        }
        catch (error) {
            throw core_1.ErrorService.createError('WALLET_CREATION_FAILED', 'Failed to create wallet', error);
        }
    }
    /**
     * Get wallet for a user
     */
    getWallet(userId) {
        return this.wallets.get(userId) || null;
    }
    /**
     * Sign a message with user's wallet
     */
    async signMessage(userId, message) {
        const wallet = this.getWallet(userId);
        if (!wallet) {
            throw core_1.ErrorService.createError('WALLET_NOT_FOUND', 'Wallet not found for user');
        }
        try {
            // Decrypt seed
            const seed = this.decrypt(wallet.encryptedSeed, userId);
            // Create keypair from seed
            const keypair = this.keyring.addFromSeed(seed);
            // Sign message
            const signature = keypair.sign(message);
            // Update last used
            wallet.lastUsed = new Date();
            return (0, util_1.u8aToHex)(signature);
        }
        catch (error) {
            throw core_1.ErrorService.createError('SIGNATURE_FAILED', 'Failed to sign message', error);
        }
    }
    /**
     * Verify signature
     */
    async verifySignature(userId, message, signature) {
        const wallet = this.getWallet(userId);
        if (!wallet) {
            return false;
        }
        try {
            const seed = this.decrypt(wallet.encryptedSeed, userId);
            const keypair = this.keyring.addFromSeed(seed);
            // Convert hex signature to Uint8Array
            const signatureBytes = new Uint8Array(signature.length / 2);
            for (let i = 0; i < signature.length; i += 2) {
                signatureBytes[i / 2] = parseInt(signature.substr(i, 2), 16);
            }
            return keypair.verify(message, signatureBytes, keypair.publicKey);
        }
        catch (error) {
            return false;
        }
    }
    /**
     * Delete wallet for user
     */
    deleteWallet(userId) {
        return this.wallets.delete(userId);
    }
    /**
     * Get all wallets
     */
    getAllWallets() {
        return Array.from(this.wallets.values());
    }
    /**
     * Generate encryption key
     */
    generateEncryptionKey() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < 32; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }
    /**
     * Encrypt data with user-specific key
     */
    encrypt(data, userId) {
        // Simple XOR encryption with user-specific key
        // In production, use proper encryption like AES
        const key = this.generateUserKey(userId);
        const encrypted = new Uint8Array(data.length);
        for (let i = 0; i < data.length; i++) {
            encrypted[i] = data[i] ^ key[i % key.length];
        }
        return (0, util_1.u8aToHex)(encrypted);
    }
    /**
     * Decrypt data with user-specific key
     */
    decrypt(encryptedData, userId) {
        // Simple XOR decryption with user-specific key
        // In production, use proper decryption like AES
        const data = new Uint8Array(encryptedData.length / 2);
        for (let i = 0; i < encryptedData.length; i += 2) {
            data[i / 2] = parseInt(encryptedData.substr(i, 2), 16);
        }
        const key = this.generateUserKey(userId);
        const decrypted = new Uint8Array(data.length);
        for (let i = 0; i < data.length; i++) {
            decrypted[i] = data[i] ^ key[i % key.length];
        }
        return decrypted;
    }
    /**
     * Generate user-specific encryption key
     */
    generateUserKey(userId) {
        const key = new Uint8Array(32);
        const seed = this.encryptionKey + userId.toString();
        for (let i = 0; i < 32; i++) {
            key[i] = seed.charCodeAt(i % seed.length);
        }
        return key;
    }
}
exports.TelegramWalletManager = TelegramWalletManager;
//# sourceMappingURL=manager.js.map