export interface PolkadotAuthConfig {
  domain: string;
  appName?: string;
  appVersion?: string;
  statement?: string;
  uri?: string;
  chainId?: string;
  generateNonce?: () => string;
  verifyMessage?: (message: string, signature: string, address: string) => Promise<boolean>;
  validateAddress?: (address: string) => boolean;
  enableIdentityResolution?: boolean;
  resolveIdentity?: (address: string) => Promise<string | null>;
}

export interface PolkadotAuthResult {
  success: boolean;
  address: string;
  chainId: string;
  nonce: string;
  message: string;
  signature: string;
  identity?: string;
  error?: string;
}

export interface PolkadotWalletInfo {
  name: string;
  icon: string;
  url: string;
  extensionId?: string;
  installed: boolean;
}

export interface PolkadotAccount {
  address: string;
  name?: string;
  source: string;
  isSelected?: boolean;
  type?: string;
  publicKey?: string;
}