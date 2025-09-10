import { WalletProvider } from '@polkadot-auth/core';

/**
 * Configuration for Telegram provider
 */
export interface TelegramProviderConfig {
  /** Telegram bot token from @BotFather */
  botToken: string;
  /** Telegram bot username (without @) */
  botUsername: string;
  /** SSO server URL for callbacks */
  ssoServerUrl: string;
  /** QR code size in pixels */
  qrCodeSize?: number;
  /** Auto-create wallet for new users */
  autoCreateWallet?: boolean;
  /** Challenge expiration time in milliseconds */
  challengeExpiration?: number;
  /** Encryption key for wallet storage */
  encryptionKey?: string;
}

/**
 * Telegram user data
 */
export interface TelegramUser {
  id: number;
  username?: string;
  first_name: string;
  last_name?: string;
  language_code?: string;
  is_bot: boolean;
}

/**
 * Authentication challenge for Telegram
 */
export interface TelegramChallenge {
  id: string;
  userId?: number;
  message: string;
  expiresAt: Date;
  status: 'pending' | 'completed' | 'expired' | 'failed';
  walletAddress?: string;
  signature?: string;
  createdAt: Date;
}

/**
 * QR code data for Telegram authentication
 */
export interface TelegramQRData {
  challengeId: string;
  deepLink: string;
  qrCode: string;
  expiresAt: Date;
}

/**
 * Telegram bot command context
 */
export interface TelegramCommandContext {
  userId: number;
  username?: string;
  chatId: number;
  messageId: number;
  command: string;
  args: string[];
}

/**
 * Wallet data for Telegram user
 */
export interface TelegramWallet {
  userId: number;
  address: string;
  publicKey: string;
  encryptedSeed: string;
  createdAt: Date;
  lastUsed: Date;
}

/**
 * Telegram provider events
 */
export interface TelegramProviderEvents {
  'auth:start': { challengeId: string; userId?: number };
  'auth:success': { challengeId: string; userId: number; address: string };
  'auth:failure': { challengeId: string; error: string };
  'auth:expired': { challengeId: string };
  'wallet:created': { userId: number; address: string };
  'wallet:error': { userId: number; error: string };
}

/**
 * Telegram provider implementation
 */
export interface TelegramProvider extends WalletProvider {
  /** Generate QR code for authentication */
  generateQRCode(challengeId: string, message: string): Promise<TelegramQRData>;

  /** Check authentication status */
  checkAuthStatus(challengeId: string): Promise<TelegramChallenge | null>;

  /** Create wallet for user */
  createWallet(userId: number): Promise<TelegramWallet>;

  /** Get user wallet */
  getWallet(userId: number): Promise<TelegramWallet | null>;

  /** Sign message with user's wallet */
  signMessage(userId: number, message: string): Promise<string>;

  /** Start bot polling */
  startBot(): Promise<void>;

  /** Stop bot polling */
  stopBot(): Promise<void>;
}

/**
 * Deep link parameters for Telegram
 */
export interface TelegramDeepLinkParams {
  challengeId: string;
  message: string;
  ssoUrl: string;
}

/**
 * Bot command handler function
 */
export type TelegramCommandHandler = (ctx: TelegramCommandContext) => Promise<void>;

/**
 * Bot middleware function
 */
export type TelegramMiddleware = (
  ctx: TelegramCommandContext,
  next: () => Promise<void>
) => Promise<void>;
