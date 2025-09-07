export { usePolkadotAuth } from './hooks/usePolkadotAuth';
export { PolkadotAuthClient, createPolkadotAuthClient } from './PolkadotAuthClient';
export {
  PolkadotJsAdapter,
  SubWalletAdapter,
  TalismanAdapter,
  defaultWalletAdapters,
  getAvailableWallets,
  getWalletAdapter,
} from './walletAdapters';

export type {
  AuthChallenge,
  AuthError,
  AuthTokens,
  PolkadotAuthClient as IPolkadotAuthClient,
  PolkadotAuthConfig,
  PolkadotWalletAdapter,
  UsePolkadotAuthReturn,
  UserSession,
  WalletSigner,
} from './types';
