export interface ChallengeParams {
  id: string;
  message: string;
  client_id: string;
  created_at: number;
  expires_at: number;
  code_verifier: string;
  code_challenge: string;
  state: string;
}

export interface SessionParams {
  accessToken: string;
  refreshToken: string;
  accessJwtid: string;
  refreshJwtid: string;
  fingerprint: string;
  accessExpires: number;
  refreshExpires: number;
  address: string;
  clientId: string;
} 