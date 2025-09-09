export interface PolkadotAuthConfig {
  defaultChain?: string;
  chains?: ChainConfig[];
  providers?: string[];
  customProviders?: WalletProvider[];
  session?: SessionConfig;
  database?: DatabaseConfig;
  security?: SecurityConfig;
  ui?: UIConfig;
}

export interface ChainConfig {
  id: string;
  name: string;
  rpcUrl: string;
  ss58Format: number;
  decimals?: number;
  symbol?: string;
  isTestnet?: boolean;
  // Security: Backup RPC endpoints for redundancy and failover
  backupRpcUrls?: string[];
  // Security: Chain-specific security settings
  security?: ChainSecurityConfig;
}

export interface ChainSecurityConfig {
  minConfirmationBlocks: number;
  maxRetries: number;
  timeout: number;
  enableStrictValidation: boolean;
}

export interface WalletProvider {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  connect: () => Promise<WalletConnection>;
  isAvailable: () => boolean | Promise<boolean>;
}

export interface WalletConnection {
  provider: WalletProvider;
  accounts: WalletAccount[];
  signMessage: (message: string) => Promise<string>;
  signTransaction?: (transaction: any) => Promise<any>;
  disconnect: () => Promise<void>;
}

export interface WalletAccount {
  address: string;
  name?: string;
  type?: string;
  genesisHash?: string;
  meta?: Record<string, any>;
}

export interface SessionConfig {
  strategy?: 'jwt' | 'database';
  maxAge?: number;
  databaseUrl?: string;
}

export interface DatabaseConfig {
  type: 'sqlite' | 'postgres' | 'mysql' | 'mongodb';
  url?: string;
  adapter?: DatabaseAdapter;
}

export interface DatabaseAdapter {
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  createChallenge: (challenge: Challenge) => Promise<void>;
  getChallenge: (id: string) => Promise<Challenge | null>;
  updateChallenge: (id: string, updates: Partial<Challenge>) => Promise<void>;
  createSession: (session: Session) => Promise<void>;
  getSession: (id: string) => Promise<Session | null>;
  updateSession: (id: string, updates: Partial<Session>) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
}

export interface SecurityConfig {
  enableNonce?: boolean;
  enableDomainBinding?: boolean;
  enableRequestTracking?: boolean;
  challengeExpiration?: number;
  allowedDomains?: string[];
}

export interface UIConfig {
  signInUrl?: string;
  signOutUrl?: string;
  errorUrl?: string;
  callbackUrl?: string;
}

export interface Challenge {
  id: string;
  message: string;
  clientId: string;
  nonce: string;
  issuedAt: string;
  expiresAt: string;
  createdAt: number;
  expiresAtTimestamp: number;
  used: boolean;
  state?: string;
  codeVerifier?: string;
  codeChallenge?: string;
}

export interface Session {
  id: string;
  address: string;
  clientId: string;
  accessToken: string;
  refreshToken: string;
  accessTokenId: string;
  refreshTokenId: string;
  fingerprint: string;
  accessTokenExpiresAt: number;
  refreshTokenExpiresAt: number;
  createdAt: number;
  lastUsedAt: number;
  isActive: boolean;
}

export interface AuthResult {
  success: boolean;
  session?: Session;
  error?: string;
  errorCode?: string;
}

export interface SIWEMessage {
  domain: string;
  address: string;
  statement: string;
  uri: string;
  version: string;
  chainId: string;
  nonce: string;
  issuedAt: string;
  expirationTime?: string;
  notBefore?: string;
  requestId?: string;
  resources?: string[];
}

export interface SIWESignature {
  message: string;
  signature: string;
  address: string;
  nonce: string;
}

export interface PolkadotAuthInstance {
  config: PolkadotAuthConfig;
  createChallenge: (clientId: string, userAddress?: string) => Promise<Challenge>;
  verifySignature: (signature: SIWESignature, challenge: Challenge) => Promise<AuthResult>;
  createSession: (
    address: string,
    clientId: string,
    parsedMessage: SIWEMessage
  ) => Promise<Session>;
  getSession: (accessToken: string) => Promise<Session | null>;
  refreshSession: (refreshToken: string) => Promise<Session | null>;
  invalidateSession: (sessionId: string) => Promise<void>;
  getProviders: () => WalletProvider[];
  getChains: () => ChainConfig[];
}

// User and Session types for remittance
export interface PolkadotUser {
  id: string;
  address: string;
  name?: string;
  email?: string;
  phone?: string;
  createdAt: Date;
  lastLogin: Date;
  isActive: boolean;
}

export interface PolkadotSession {
  id: string;
  userId: string;
  address: string;
  clientId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  createdAt: Date;
  lastUsedAt: Date;
  isActive: boolean;
}

// Export remittance types
export * from './remittance';
