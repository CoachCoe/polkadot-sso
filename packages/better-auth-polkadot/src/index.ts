export { polkadotPlugin } from "./plugin"
export { createPolkadotAuthClient } from "./client"
export { usePolkadotAuth } from "./hooks/usePolkadotAuth"
export { PolkadotWalletSelector } from "./components/PolkadotWalletSelector"

export type {
  PolkadotProvider,
  PolkadotAccount,
  PolkadotChallenge,
  PolkadotSignature,
  PolkadotUser,
  PolkadotSession,
  PolkadotAuthConfig,
  PolkadotAuthResponse,
  PolkadotAuthError
} from "./types"

export {
  verifySignature,
  generateChallenge,
  generateNonce,
  isValidAddress,
  formatAddress
} from "./crypto"