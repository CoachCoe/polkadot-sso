/**
 * Google OAuth 2.0 types and interfaces
 */

import { z } from 'zod';

export interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  authTimeout: number; // in seconds
}

export interface GoogleChallenge {
  id: string;
  client_id: string;
  code_verifier: string;
  code_challenge: string;
  state: string;
  nonce: string;
  created_at: number;
  expires_at: number;
  used: boolean;
}

export interface GoogleAuthResponse {
  code: string;
  state: string;
  scope?: string;
  error?: string;
  error_description?: string;
}

export interface GoogleUserInfo {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
  locale: string;
  hd?: string; 
}

export interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
  token_type: string;
  id_token?: string;
}

export interface GoogleIdToken {
  iss: string;  
  sub: string;  
  aud: string; 
  exp: number; 
  iat: number;  
  email: string;
  email_verified: boolean;
  name: string;
  picture: string;
  given_name: string;
  family_name: string;
  locale: string;
  hd?: string; 
  nonce?: string;
}

export interface GoogleSession {
  id: string;
  google_id: string;
  email: string;
  name: string;
  picture?: string;
  client_id: string;
  access_token: string;
  refresh_token?: string;
  access_token_id: string;
  refresh_token_id?: string;
  fingerprint: string;
  access_token_expires_at: number;
  refresh_token_expires_at?: number;
  created_at: number;
  last_used_at: number;
  is_active: boolean;
}

export interface GoogleVerificationRequest {
  code: string;
  state: string;
  client_id: string;
}

export interface GoogleVerificationResponse {
  success: boolean;
  session?: GoogleSession;
  redirect_url?: string;
  error?: string;
}

export const googleChallengeQuerySchema = z.object({
  client_id: z.string().min(1, 'Client ID is required'),
});

export const googleVerificationQuerySchema = z.object({
  code: z.string().min(1, 'Authorization code is required'),
  state: z.string().min(1, 'State parameter is required'),
  client_id: z.string().min(1, 'Client ID is required'),
});

export const googleVerificationBodySchema = z.object({
  code: z.string().min(1, 'Authorization code is required'),
  state: z.string().min(1, 'State parameter is required'),
  client_id: z.string().min(1, 'Client ID is required'),
});

export const googleVerificationResponseSchema = z.object({
  success: z.boolean(),
  session: z.object({
    id: z.string(),
    google_id: z.string(),
    email: z.string(),
    name: z.string(),
    picture: z.string().optional(),
    client_id: z.string(),
    access_token: z.string(),
    refresh_token: z.string().optional(),
    access_token_id: z.string(),
    refresh_token_id: z.string().optional(),
    fingerprint: z.string(),
    access_token_expires_at: z.number(),
    refresh_token_expires_at: z.number().optional(),
    created_at: z.number(),
    last_used_at: z.number(),
    is_active: z.boolean(),
  }).optional(),
  redirect_url: z.string().optional(),
  error: z.string().optional(),
});

export const googleStatusResponseSchema = z.object({
  status: z.enum(['pending', 'completed', 'expired', 'failed']),
  message: z.string(),
  expiresAt: z.number().optional(),
  challengeId: z.string().optional(),
});

export const googleSchemas = {
  challengeQuery: googleChallengeQuerySchema,
  verificationQuery: googleVerificationQuerySchema,
  verificationBody: googleVerificationBodySchema,
  verificationResponse: googleVerificationResponseSchema,
  statusResponse: googleStatusResponseSchema,
} as const;
