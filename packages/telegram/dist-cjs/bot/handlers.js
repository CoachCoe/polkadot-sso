"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelegramBotHandlers = void 0;
/**
 * Telegram bot command handlers
 */
class TelegramBotHandlers {
    constructor(bot, walletManager, sessionManager, ssoServerUrl) {
        this.bot = bot;
        this.walletManager = walletManager;
        this.sessionManager = sessionManager;
        this.ssoServerUrl = ssoServerUrl;
    }
    /**
     * Register all command handlers
     */
    registerHandlers() {
        // Start command
        this.bot.start(this.handleStart.bind(this));
        // Help command
        this.bot.help(this.handleHelp.bind(this));
        // Wallet command
        this.bot.command('wallet', this.handleWallet.bind(this));
        // Auth command
        this.bot.command('auth', this.handleAuth.bind(this));
        // Status command
        this.bot.command('status', this.handleStatus.bind(this));
        // Error handler
        this.bot.catch(this.handleError.bind(this));
    }
    /**
     * Handle /start command
     */
    async handleStart(ctx) {
        try {
            const commandCtx = this.createCommandContext(ctx);
            // Check if this is an authentication deep link
            if (commandCtx.args.length > 0 && commandCtx.args[0] === 'auth') {
                await this.handleAuthDeepLink(commandCtx);
                return;
            }
            // Regular start command
            const user = this.extractUser(ctx);
            if (user) {
                this.sessionManager.storeUserSession(user);
            }
            const message = `
🚀 *Welcome to Polkadot SSO!*

I can help you authenticate with Polkadot applications using your Telegram account.

*Available commands:*
/help - Show this help message
/wallet - Manage your Polkadot wallet
/auth - Start authentication process
/status - Check your authentication status

*How it works:*
1. Scan a QR code from a Polkadot app
2. I'll create a secure wallet for you
3. Sign the authentication message
4. You're logged in! 🎉

Ready to get started? Use /wallet to create your first wallet!
      `;
            await ctx.reply(message, { parse_mode: 'Markdown' });
        }
        catch (error) {
            await this.handleError(error, ctx);
        }
    }
    /**
     * Handle /help command
     */
    async handleHelp(ctx) {
        const message = `
📚 *Polkadot SSO Help*

*Commands:*
/start - Start the bot
/help - Show this help message
/wallet - Create or manage your wallet
/auth - Start authentication process
/status - Check your status

*Authentication Flow:*
1. Open a Polkadot app in your browser
2. Choose "Sign in with Telegram"
3. Scan the QR code with your camera
4. I'll handle the rest automatically!

*Security:*
- Your private keys are encrypted and stored securely
- Only you can access your wallet
- All transactions require your approval

Need help? Contact support or check our documentation.
    `;
        await ctx.reply(message, { parse_mode: 'Markdown' });
    }
    /**
     * Handle /wallet command
     */
    async handleWallet(ctx) {
        try {
            const commandCtx = this.createCommandContext(ctx);
            const user = this.extractUser(ctx);
            if (!user) {
                await ctx.reply('❌ Unable to identify user. Please try again.');
                return;
            }
            // Check if user already has a wallet
            const existingWallet = this.walletManager.getWallet(user.id);
            if (existingWallet) {
                const message = `
💼 *Your Polkadot Wallet*

*Address:* \`${existingWallet.address}\`
*Created:* ${existingWallet.createdAt.toLocaleDateString()}
*Last Used:* ${existingWallet.lastUsed.toLocaleDateString()}

*Actions:*
- Your wallet is ready to use
- Use /auth to start authentication
- Your private key is encrypted and secure
        `;
                await ctx.reply(message, { parse_mode: 'Markdown' });
            }
            else {
                // Create new wallet
                await ctx.reply('🔄 Creating your Polkadot wallet...');
                try {
                    const wallet = await this.walletManager.createWallet(user.id);
                    const message = `
🎉 *Wallet Created Successfully!*

*Address:* \`${wallet.address}\`
*Created:* ${wallet.createdAt.toLocaleDateString()}

*Next Steps:*
- Your wallet is now ready
- Use /auth to start authentication
- Keep your address safe for reference

*Security Note:*
Your private key is encrypted and stored securely. Only you can access it.
          `;
                    await ctx.reply(message, { parse_mode: 'Markdown' });
                }
                catch (error) {
                    await ctx.reply('❌ Failed to create wallet. Please try again later.');
                }
            }
        }
        catch (error) {
            await this.handleError(error, ctx);
        }
    }
    /**
     * Handle /auth command
     */
    async handleAuth(ctx) {
        try {
            const commandCtx = this.createCommandContext(ctx);
            const user = this.extractUser(ctx);
            if (!user) {
                await ctx.reply('❌ Unable to identify user. Please try again.');
                return;
            }
            // Check if user has a wallet
            const wallet = this.walletManager.getWallet(user.id);
            if (!wallet) {
                await ctx.reply('❌ You need to create a wallet first. Use /wallet to create one.');
                return;
            }
            const message = `
🔐 *Authentication Ready*

Your wallet is ready for authentication:
*Address:* \`${wallet.address}\`

*To authenticate:*
1. Open the Polkadot app in your browser
2. Choose "Sign in with Telegram"
3. Scan the QR code with your camera
4. I'll automatically sign the authentication message

*Status:* Ready to authenticate ✅
      `;
            await ctx.reply(message, { parse_mode: 'Markdown' });
        }
        catch (error) {
            await this.handleError(error, ctx);
        }
    }
    /**
     * Handle /status command
     */
    async handleStatus(ctx) {
        try {
            const user = this.extractUser(ctx);
            if (!user) {
                await ctx.reply('❌ Unable to identify user. Please try again.');
                return;
            }
            const wallet = this.walletManager.getWallet(user.id);
            const stats = this.sessionManager.getChallengeStats();
            let message = `
📊 *Your Status*

*User ID:* ${user.id}
*Username:* ${user.username || 'Not set'}
*Wallet:* ${wallet ? '✅ Created' : '❌ Not created'}

*Authentication Stats:*
- Total: ${stats.total}
- Pending: ${stats.pending}
- Completed: ${stats.completed}
- Failed: ${stats.failed}
      `;
            if (wallet) {
                message += `
*Wallet Details:*
- Address: \`${wallet.address}\`
- Created: ${wallet.createdAt.toLocaleDateString()}
- Last Used: ${wallet.lastUsed.toLocaleDateString()}
        `;
            }
            await ctx.reply(message, { parse_mode: 'Markdown' });
        }
        catch (error) {
            await this.handleError(error, ctx);
        }
    }
    /**
     * Handle authentication deep link
     */
    async handleAuthDeepLink(ctx) {
        try {
            // This would be called when user clicks the deep link
            // Implementation depends on how the deep link parameters are passed
            console.log('🔗 Authentication deep link received. Processing...');
        }
        catch (error) {
            console.error('Deep link error:', error);
        }
    }
    /**
     * Handle errors
     */
    async handleError(error, ctx) {
        console.error('Telegram bot error:', error);
        try {
            await ctx.reply('❌ An error occurred. Please try again later.');
        }
        catch (replyError) {
            console.error('Failed to send error message:', replyError);
        }
    }
    /**
     * Create command context from Telegraf context
     */
    createCommandContext(ctx) {
        const message = ctx.message;
        const user = message?.from;
        return {
            userId: user?.id || 0,
            username: user?.username,
            chatId: message?.chat?.id || 0,
            messageId: message?.message_id || 0,
            command: message?.text?.split(' ')[0]?.replace('/', '') || '',
            args: message?.text?.split(' ').slice(1) || [],
        };
    }
    /**
     * Extract user from context
     */
    extractUser(ctx) {
        const message = ctx.message;
        const user = message?.from;
        if (!user) {
            return null;
        }
        return {
            id: user.id,
            username: user.username,
            first_name: user.first_name,
            last_name: user.last_name,
            language_code: user.language_code,
            is_bot: user.is_bot,
        };
    }
}
exports.TelegramBotHandlers = TelegramBotHandlers;
//# sourceMappingURL=handlers.js.map