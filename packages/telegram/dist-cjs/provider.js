"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_TELEGRAM_CONFIG = exports.TelegramProvider = void 0;
exports.createTelegramProvider = createTelegramProvider;
const core_1 = require("@polkadot-auth/core");
const events_1 = require("events");
const telegraf_1 = require("telegraf");
const qr_generator_1 = require("./auth/qr-generator");
const session_1 = require("./auth/session");
const handlers_1 = require("./bot/handlers");
const manager_1 = require("./wallet/manager");
/**
 * Telegram provider for Polkadot SSO
 */
class TelegramProvider extends events_1.EventEmitter {
    constructor(config) {
        super();
        this.id = 'telegram';
        this.name = 'Telegram';
        this.icon = '📱';
        this.isAvailable = () => true;
        this.isRunning = false;
        this.config = {
            qrCodeSize: 256,
            autoCreateWallet: true,
            challengeExpiration: 5 * 60 * 1000, // 5 minutes
            ...config,
        };
        // Initialize components
        this.bot = new telegraf_1.Telegraf(this.config.botToken);
        this.walletManager = new manager_1.TelegramWalletManager(this.config.encryptionKey);
        this.sessionManager = new session_1.TelegramSessionManager(this.config.challengeExpiration);
        this.qrGenerator = new qr_generator_1.TelegramQRGenerator(this.config.ssoServerUrl, this.config.botUsername, this.config.qrCodeSize);
        this.botHandlers = new handlers_1.TelegramBotHandlers(this.bot, this.walletManager, this.sessionManager, this.config.ssoServerUrl);
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
    async initialize() {
        try {
            await this.walletManager.initialize();
            console.log('✅ Telegram provider initialized');
        }
        catch (error) {
            throw core_1.ErrorService.createError('PROVIDER_INIT_FAILED', 'Failed to initialize Telegram provider', error);
        }
    }
    /**
     * Start the Telegram bot
     */
    async startBot() {
        if (this.isRunning) {
            return;
        }
        try {
            await this.bot.launch();
            this.isRunning = true;
            console.log('🤖 Telegram bot started');
        }
        catch (error) {
            throw core_1.ErrorService.createError('BOT_START_FAILED', 'Failed to start Telegram bot', error);
        }
    }
    /**
     * Stop the Telegram bot
     */
    async stopBot() {
        if (!this.isRunning) {
            return;
        }
        try {
            await this.bot.stop();
            this.isRunning = false;
            console.log('🛑 Telegram bot stopped');
        }
        catch (error) {
            throw core_1.ErrorService.createError('BOT_STOP_FAILED', 'Failed to stop Telegram bot', error);
        }
    }
    /**
     * Generate QR code for authentication
     */
    async generateQRCode(challengeId, message) {
        try {
            // Create challenge in session manager
            const challenge = this.sessionManager.createChallenge(message);
            // Generate QR code
            const qrData = await this.qrGenerator.generateQRCode(challengeId, message);
            // Emit event
            this.emit('auth:start', { challengeId, userId: challenge.userId });
            return qrData;
        }
        catch (error) {
            throw core_1.ErrorService.createError('QR_GENERATION_FAILED', 'Failed to generate QR code', error);
        }
    }
    /**
     * Check authentication status
     */
    async checkAuthStatus(challengeId) {
        return this.sessionManager.getChallenge(challengeId);
    }
    /**
     * Create wallet for user
     */
    async createWallet(userId) {
        try {
            const wallet = await this.walletManager.createWallet(userId);
            // Emit event
            this.emit('wallet:created', { userId, address: wallet.address });
            return wallet;
        }
        catch (error) {
            this.emit('wallet:error', { userId, error: error.message });
            throw error;
        }
    }
    /**
     * Get user wallet
     */
    async getWallet(userId) {
        return this.walletManager.getWallet(userId);
    }
    /**
     * Sign message with user's wallet
     */
    async signMessage(userId, message) {
        try {
            const signature = await this.walletManager.signMessage(userId, message);
            return signature;
        }
        catch (error) {
            throw core_1.ErrorService.createError('SIGNATURE_FAILED', 'Failed to sign message', error);
        }
    }
    /**
     * Verify signature
     */
    async verifySignature(userId, message, signature) {
        return this.walletManager.verifySignature(userId, message, signature);
    }
    /**
     * Complete authentication
     */
    async completeAuthentication(challengeId, userId, walletAddress, signature) {
        try {
            const success = this.sessionManager.completeAuthentication(challengeId, userId, walletAddress, signature);
            if (success) {
                this.emit('auth:success', { challengeId, userId, address: walletAddress });
            }
            else {
                this.emit('auth:failure', { challengeId, error: 'Failed to complete authentication' });
            }
            return success;
        }
        catch (error) {
            this.emit('auth:failure', { challengeId, error: error.message });
            return false;
        }
    }
    /**
     * Fail authentication
     */
    async failAuthentication(challengeId, error) {
        this.sessionManager.failAuthentication(challengeId, error);
        this.emit('auth:failure', { challengeId, error });
    }
    /**
     * Get provider statistics
     */
    getStats() {
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
    async connect() {
        // For Telegram, connection is handled through QR code flow
        // This method is required by the interface but not used in the same way
        throw new Error('Telegram authentication requires QR code flow. Use generateQRCode() instead.');
    }
    /**
     * Clean up resources
     */
    async cleanup() {
        try {
            await this.stopBot();
            console.log('🧹 Telegram provider cleaned up');
        }
        catch (error) {
            console.error('Failed to cleanup Telegram provider:', error);
        }
    }
}
exports.TelegramProvider = TelegramProvider;
/**
 * Create a Telegram provider instance
 */
function createTelegramProvider(config) {
    return new TelegramProvider(config);
}
/**
 * Default Telegram provider configuration
 */
exports.DEFAULT_TELEGRAM_CONFIG = {
    qrCodeSize: 256,
    autoCreateWallet: true,
    challengeExpiration: 5 * 60 * 1000, // 5 minutes
};
//# sourceMappingURL=provider.js.map