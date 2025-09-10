import { Telegraf } from 'telegraf';
import { TelegramSessionManager } from '../auth/session';
import { TelegramWalletManager } from '../wallet/manager';
/**
 * Telegram bot command handlers
 */
export declare class TelegramBotHandlers {
    private bot;
    private walletManager;
    private sessionManager;
    private ssoServerUrl;
    constructor(bot: Telegraf, walletManager: TelegramWalletManager, sessionManager: TelegramSessionManager, ssoServerUrl: string);
    /**
     * Register all command handlers
     */
    registerHandlers(): void;
    /**
     * Handle /start command
     */
    private handleStart;
    /**
     * Handle /help command
     */
    private handleHelp;
    /**
     * Handle /wallet command
     */
    private handleWallet;
    /**
     * Handle /auth command
     */
    private handleAuth;
    /**
     * Handle /status command
     */
    private handleStatus;
    /**
     * Handle authentication deep link
     */
    private handleAuthDeepLink;
    /**
     * Handle errors
     */
    private handleError;
    /**
     * Create command context from Telegraf context
     */
    private createCommandContext;
    /**
     * Extract user from context
     */
    private extractUser;
}
//# sourceMappingURL=handlers.d.ts.map