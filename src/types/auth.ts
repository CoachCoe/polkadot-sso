export interface PKCEChallenge {
  code_verifier: string;
  code_challenge: string;
  state: string;
}

export interface Challenge extends PKCEChallenge {
  id: string;
  message: string;
  client_id: string;
  created_at: number;
  expires_at: number;
  used: boolean;
}

export interface Session {
  id: string;
  address: string;
  client_id: string;
  access_token: string;
  refresh_token: string;
  access_token_id: string;
  refresh_token_id: string;
  fingerprint: string;
  access_token_expires_at: number;
  refresh_token_expires_at: number;
  created_at: number;
  last_used_at: number;
  is_active: boolean;
}

export interface Client {
  client_id: string;
  name: string;
  redirect_url: string;
  allowed_origins: string[];
}

export interface TokenPayload {
  address: string;
  client_id: string;
  type: 'access' | 'refresh';
  iat: number;
  exp: number;
  jti: string;
  fingerprint: string;
}
