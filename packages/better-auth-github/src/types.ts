export interface GitHubAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes?: string[];
  authTimeout?: number;
  domain: string;
  appName?: string;
  appVersion?: string;
  statement?: string;
  uri?: string;
  generateNonce?: () => string;
  verifyMessage?: (message: string, signature: string, address: string) => Promise<boolean>;
  validateAddress?: (address: string) => boolean;
  enableIdentityResolution?: boolean;
  resolveIdentity?: (address: string) => Promise<string | null>;
}

export interface GitHubAuthMessage {
  domain: string;
  address: string;
  statement: string;
  uri: string;
  version: string;
  nonce: string;
  issuedAt: string;
  expirationTime?: string;
  notBefore?: string;
  requestId?: string;
  resources?: string[];
}

export interface GitHubAuthResult {
  success: boolean;
  address: string;
  nonce: string;
  message: string;
  signature: string;
  error?: string;
  identity?: string;
}

export interface GitHubUserInfo {
  id: number;
  login: string;
  email: string;
  name: string;
  avatar_url: string;
  html_url: string;
  public_repos: number;
  followers: number;
  following: number;
  created_at: string;
  updated_at: string;
}

export interface GitHubTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
  error?: string;
  error_description?: string;
}

export interface GitHubSession {
  id: string;
  github_id: number;
  login: string;
  email: string;
  name: string;
  avatar_url: string;
  client_id: string;
  access_token: string;
  access_token_id: string;
  fingerprint: string;
  access_token_expires_at: number;
  created_at: number;
  last_used_at: number;
  is_active: boolean;
}

export interface GitHubChallenge {
  id: string;
  client_id: string;
  state: string;
  code_verifier: string;
  code_challenge: string;
  created_at: number;
  expires_at: number;
  used: boolean;
}

export interface GitHubVerificationRequest {
  code: string;
  state: string;
  client_id: string;
}

export interface GitHubVerificationResponse {
  success: boolean;
  session?: GitHubSession;
  user?: GitHubUserInfo;
  error?: string;
}
