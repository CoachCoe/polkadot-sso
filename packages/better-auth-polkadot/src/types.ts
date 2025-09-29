export interface PolkadotProvider {
  id: string
  name: string
  chain: string
  rpcUrl: string
  ss58Format: number
  decimals: number
  tokenSymbol: string
}

export interface PolkadotAccount {
  address: string
  name?: string
  source: string
  chain: string
}

export interface PolkadotChallenge {
  message: string
  nonce: string
  chain: string
  expiresAt: number
}

export interface PolkadotSignature {
  signature: string
  address: string
  message: string
  chain: string
}

export interface PolkadotUser {
  id: string
  address: string
  chain: string
  provider: string
  createdAt: Date
  updatedAt: Date
}

export interface PolkadotSession {
  id: string
  userId: string
  token: string
  expiresAt: Date
  createdAt: Date
}

export interface PolkadotAuthConfig {
  providers: PolkadotProvider[]
  chains: {
    polkadot?: string
    kusama?: string
    westend?: string
  }
  rpcUrls: {
    polkadot?: string
    kusama?: string
    westend?: string
  }
}

export interface PolkadotAuthResponse {
  user: PolkadotUser
  session: PolkadotSession
  token: string
}

export interface PolkadotAuthError {
  error: string
  code: string
  details?: any
}