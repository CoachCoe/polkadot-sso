import { ErrorService, WalletConnection, WalletProvider } from '@polkadot-auth/core';
import { EventEmitter } from 'events';
import { Telegraf } from 'telegraf';
import { TelegramQRGenerator } from './auth/qr-generator';
import { TelegramSessionManager } from './auth/session';
import { TelegramBotHandlers } from './bot/handlers';
import { TelegramChallenge, TelegramProviderConfig, TelegramQRData, TelegramWallet } from './types';
import { TelegramWalletManager } from './wallet/manager';

/**
 * Telegram provider for Polkadot SSO
 */
export class TelegramProvider extends EventEmitter implements WalletProvider {
  public readonly id = 'telegram';
  public readonly name = 'Telegram';
  public readonly icon = '📱';
  public readonly isAvailable = () => true;

  private config: TelegramProviderConfig;
  private bot: Telegraf;
  private walletManager: TelegramWalletManager;
  private sessionManager: TelegramSessionManager;
  private qrGenerator: TelegramQRGenerator;
  private botHandlers: TelegramBotHandlers;
  private isRunning = false;

  constructor(config: TelegramProviderConfig) {
    super();
    this.config = {
      qrCodeSize: 256,
      autoCreateWallet: true,
      challengeExpiration: 5 * 60 * 1000, // 5 minutes
      ...config,
    };

    // Initialize components
    this.bot = new Telegraf(this.config.botToken);
    this.walletManager = new TelegramWalletManager(this.config.encryptionKey);
    this.sessionManager = new TelegramSessionManager(this.config.challengeExpiration);
    this.qrGenerator = new TelegramQRGenerator(
      this.config.ssoServerUrl,
      this.config.botUsername,
      this.config.qrCodeSize
    );
    this.botHandlers = new TelegramBotHandlers(
      this.bot,
      this.walletManager,
      this.sessionManager,
      this.config.ssoServerUrl
    );

    // Register bot handlers
    this.botHandlers.registerHandlers();

    // Set up periodic cleanup
    setInterval(() => {
      this.sessionManager.cleanupExpiredChallenges();
    }, 60000); // Clean up every minute
  }

  /**
   * Initialize the provider
   */
  async initialize(): Promise<void> {
    try {
      await this.walletManager.initialize();
      console.log('✅ Telegram provider initialized');
    } catch (error) {
      throw ErrorService.createError(
        'PROVIDER_INIT_FAILED',
        'Failed to initialize Telegram provider',
        error
      );
    }
  }

  /**
   * Start the Telegram bot
   */
  async startBot(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    try {
      await this.bot.launch();
      this.isRunning = true;
      console.log('🤖 Telegram bot started');
    } catch (error) {
      throw ErrorService.createError('BOT_START_FAILED', 'Failed to start Telegram bot', error);
    }
  }

  /**
   * Stop the Telegram bot
   */
  async stopBot(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    try {
      await this.bot.stop();
      this.isRunning = false;
      console.log('🛑 Telegram bot stopped');
    } catch (error) {
      throw ErrorService.createError('BOT_STOP_FAILED', 'Failed to stop Telegram bot', error);
    }
  }

  /**
   * Generate QR code for authentication
   */
  async generateQRCode(challengeId: string, message: string): Promise<TelegramQRData> {
    try {
      // Create challenge in session manager
      const challenge = this.sessionManager.createChallenge(message);

      // Generate QR code
      const qrData = await this.qrGenerator.generateQRCode(challengeId, message);

      // Emit event
      this.emit('auth:start', { challengeId, userId: challenge.userId });

      return qrData;
    } catch (error) {
      throw ErrorService.createError('QR_GENERATION_FAILED', 'Failed to generate QR code', error);
    }
  }

  /**
   * Check authentication status
   */
  async checkAuthStatus(challengeId: string): Promise<TelegramChallenge | null> {
    return this.sessionManager.getChallenge(challengeId);
  }

  /**
   * Create wallet for user
   */
  async createWallet(userId: number): Promise<TelegramWallet> {
    try {
      const wallet = await this.walletManager.createWallet(userId);

      // Emit event
      this.emit('wallet:created', { userId, address: wallet.address });

      return wallet;
    } catch (error) {
      this.emit('wallet:error', { userId, error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Get user wallet
   */
  async getWallet(userId: number): Promise<TelegramWallet | null> {
    return this.walletManager.getWallet(userId);
  }

  /**
   * Sign message with user's wallet
   */
  async signMessage(userId: number, message: string): Promise<string> {
    try {
      const signature = await this.walletManager.signMessage(userId, message);
      return signature;
    } catch (error) {
      throw ErrorService.createError('SIGNATURE_FAILED', 'Failed to sign message', error);
    }
  }

  /**
   * Verify signature
   */
  async verifySignature(userId: number, message: string, signature: string): Promise<boolean> {
    return this.walletManager.verifySignature(userId, message, signature);
  }

  /**
   * Complete authentication
   */
  async completeAuthentication(
    challengeId: string,
    userId: number,
    walletAddress: string,
    signature: string
  ): Promise<boolean> {
    try {
      const success = this.sessionManager.completeAuthentication(
        challengeId,
        userId,
        walletAddress,
        signature
      );

      if (success) {
        this.emit('auth:success', { challengeId, userId, address: walletAddress });
      } else {
        this.emit('auth:failure', { challengeId, error: 'Failed to complete authentication' });
      }

      return success;
    } catch (error) {
      this.emit('auth:failure', { challengeId, error: (error as Error).message });
      return false;
    }
  }

  /**
   * Fail authentication
   */
  async failAuthentication(challengeId: string, error: string): Promise<void> {
    this.sessionManager.failAuthentication(challengeId, error);
    this.emit('auth:failure', { challengeId, error });
  }

  /**
   * Get provider statistics
   */
  getStats(): {
    isRunning: boolean;
    totalWallets: number;
    activeChallenges: number;
    challengeStats: ReturnType<TelegramSessionManager['getChallengeStats']>;
  } {
    return {
      isRunning: this.isRunning,
      totalWallets: this.walletManager.getAllWallets().length,
      activeChallenges: this.sessionManager.getActiveChallenges().length,
      challengeStats: this.sessionManager.getChallengeStats(),
    };
  }

  /**
   * Connect to Telegram (required by WalletProvider interface)
   */
  async connect(): Promise<WalletConnection> {
    // For Telegram, connection is handled through QR code flow
    // This method is required by the interface but not used in the same way
    throw new Error('Telegram authentication requires QR code flow. Use generateQRCode() instead.');
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    try {
      await this.stopBot();
      console.log('🧹 Telegram provider cleaned up');
    } catch (error) {
      console.error('Failed to cleanup Telegram provider:', error);
    }
  }
}

/**
 * Create a Telegram provider instance
 */
export function createTelegramProvider(config: TelegramProviderConfig): TelegramProvider {
  return new TelegramProvider(config);
}

/**
 * Default Telegram provider configuration
 */
export const DEFAULT_TELEGRAM_CONFIG: Partial<TelegramProviderConfig> = {
  qrCodeSize: 256,
  autoCreateWallet: true,
  challengeExpiration: 5 * 60 * 1000, // 5 minutes
};
