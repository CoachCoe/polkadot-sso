// Main exports
export { DEFAULT_TELEGRAM_CONFIG, TelegramProvider, createTelegramProvider } from './provider';

// Type exports
export type {
  TelegramChallenge,
  TelegramCommandContext,
  TelegramCommandHandler,
  TelegramDeepLinkParams,
  TelegramMiddleware,
  TelegramProviderConfig,
  TelegramProviderEvents,
  TelegramQRData,
  TelegramUser,
  TelegramWallet,
} from './types';

// Component exports
export { TelegramQRGenerator } from './auth/qr-generator';
export { TelegramSessionManager } from './auth/session';
export { TelegramBotHandlers } from './bot/handlers';
export { TelegramWalletManager } from './wallet/manager';

// Default export
export { createTelegramProvider as default } from './provider';
