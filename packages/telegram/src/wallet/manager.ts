import { ErrorService } from '@polkadot-auth/core';
import { Keyring } from '@polkadot/keyring';
import { u8aToHex } from '@polkadot/util';
import { cryptoWaitReady, mnemonicGenerate, mnemonicToMiniSecret } from '@polkadot/util-crypto';
import { TelegramWallet } from '../types';

/**
 * Secure wallet manager for Telegram users
 */
export class TelegramWalletManager {
  private keyring: Keyring;
  private wallets: Map<number, TelegramWallet> = new Map();
  private encryptionKey: string;

  constructor(encryptionKey?: string) {
    this.encryptionKey = encryptionKey || this.generateEncryptionKey();
    this.keyring = new Keyring({ type: 'sr25519' });
  }

  /**
   * Initialize the wallet manager
   */
  async initialize(): Promise<void> {
    await cryptoWaitReady();
  }

  /**
   * Create a new wallet for a Telegram user
   */
  async createWallet(userId: number): Promise<TelegramWallet> {
    try {
      // Generate mnemonic
      const mnemonic = mnemonicGenerate();
      const seed = mnemonicToMiniSecret(mnemonic);

      // Create keypair
      const keypair = this.keyring.addFromSeed(seed);
      const address = keypair.address;
      const publicKey = u8aToHex(keypair.publicKey);

      // Encrypt the seed
      const encryptedSeed = this.encrypt(seed, userId);

      const wallet: TelegramWallet = {
        userId,
        address,
        publicKey,
        encryptedSeed,
        createdAt: new Date(),
        lastUsed: new Date(),
      };

      this.wallets.set(userId, wallet);

      return wallet;
    } catch (error) {
      throw ErrorService.createError('WALLET_CREATION_FAILED', 'Failed to create wallet', error);
    }
  }

  /**
   * Get wallet for a user
   */
  getWallet(userId: number): TelegramWallet | null {
    return this.wallets.get(userId) || null;
  }

  /**
   * Sign a message with user's wallet
   */
  async signMessage(userId: number, message: string): Promise<string> {
    const wallet = this.getWallet(userId);
    if (!wallet) {
      throw ErrorService.createError('WALLET_NOT_FOUND', 'Wallet not found for user');
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

      return u8aToHex(signature);
    } catch (error) {
      throw ErrorService.createError('SIGNATURE_FAILED', 'Failed to sign message', error);
    }
  }

  /**
   * Verify signature
   */
  async verifySignature(userId: number, message: string, signature: string): Promise<boolean> {
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
    } catch (error) {
      return false;
    }
  }

  /**
   * Delete wallet for user
   */
  deleteWallet(userId: number): boolean {
    return this.wallets.delete(userId);
  }

  /**
   * Get all wallets
   */
  getAllWallets(): TelegramWallet[] {
    return Array.from(this.wallets.values());
  }

  /**
   * Generate encryption key
   */
  private generateEncryptionKey(): string {
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
  private encrypt(data: Uint8Array, userId: number): string {
    // Simple XOR encryption with user-specific key
    // In production, use proper encryption like AES
    const key = this.generateUserKey(userId);
    const encrypted = new Uint8Array(data.length);

    for (let i = 0; i < data.length; i++) {
      encrypted[i] = data[i] ^ key[i % key.length];
    }

    return u8aToHex(encrypted);
  }

  /**
   * Decrypt data with user-specific key
   */
  private decrypt(encryptedData: string, userId: number): Uint8Array {
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
  private generateUserKey(userId: number): Uint8Array {
    const key = new Uint8Array(32);
    const seed = this.encryptionKey + userId.toString();

    for (let i = 0; i < 32; i++) {
      key[i] = seed.charCodeAt(i % seed.length);
    }

    return key;
  }
}
