export { polkadotPlugin } from "./plugin"
export { createPolkadotAuthClient } from "./client"
export { usePolkadotAuth } from "./hooks/usePolkadotAuth"
export { PolkadotWalletSelector } from "./components/PolkadotWalletSelector"

export type {
  PolkadotProvider,
  PolkadotPluginOptions
} from "./plugin"

export type {
  PolkadotAccount,
  PolkadotUser,
  PolkadotSession
} from "./client"

export {
  verifySignature,
  generateNonce,
  isValidAddress,
  formatAddress,
  createMessageHash
} from "./crypto"