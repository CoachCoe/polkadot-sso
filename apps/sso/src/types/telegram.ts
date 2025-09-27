import { z } from 'zod';

// Telegram authentication data from widget
export interface TelegramAuthData {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

// Telegram challenge data (similar to existing Challenge interface)
export interface TelegramChallenge extends TelegramAuthData {
  challenge_id: string;
  client_id: string;
  state: string;
  code_verifier: string;
  created_at: number;
  expires_at: number;
  used: boolean;
}

// Telegram session data (extends existing Session)
export interface TelegramSession {
  id: string;
  telegram_id: number;
  username?: string;
  first_name: string;
  last_name?: string;
  photo_url?: string;
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

// Telegram bot configuration
export interface TelegramBotConfig {
  botToken: string;
  botUsername: string;
  allowedDomains: string[];
  authTimeout: number; // seconds
}

// Telegram widget template data
export interface TelegramWidgetTemplateData {
  challengeId: string;
  clientId: string;
  botUsername: string;
  state: string;
  codeVerifier: string;
  nonce: string;
}

// Zod schemas for validation
export const telegramIdSchema = z.number().int().positive('Invalid Telegram ID');
export const telegramUsernameSchema = z.string().regex(/^[a-zA-Z0-9_]{5,32}$/, 'Invalid Telegram username format');
export const telegramHashSchema = z.string().regex(/^[a-f0-9]{64}$/, 'Invalid Telegram hash format');
export const telegramAuthDateSchema = z.number().int().positive('Invalid auth date');

export const telegramAuthDataSchema = z.object({
  id: telegramIdSchema,
  first_name: z.string().min(1, 'First name is required').max(64, 'First name too long'),
  last_name: z.string().max(64, 'Last name too long').optional(),
  username: telegramUsernameSchema.optional(),
  photo_url: z.string().url('Invalid photo URL').optional(),
  auth_date: telegramAuthDateSchema,
  hash: telegramHashSchema,
});

export const telegramChallengeQuerySchema = z.object({
  client_id: z.string().min(1, 'Client ID is required'),
  state: z.string().min(16, 'State must be at least 16 characters').optional(),
});

export const telegramVerificationQuerySchema = z.object({
  challenge_id: z.string().uuid('Invalid challenge ID format'),
  code_verifier: z.string().min(32, 'Code verifier must be at least 32 characters'),
  state: z.string().min(16, 'State must be at least 16 characters'),
  // Telegram auth data will be in the request body
});

export const telegramVerificationBodySchema = z.object({
  id: telegramIdSchema,
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().optional(),
  username: z.string().optional(),
  photo_url: z.string().url().optional(),
  auth_date: telegramAuthDateSchema,
  hash: telegramHashSchema,
});

export const telegramVerificationResponseSchema = z.object({
  success: z.boolean(),
  redirect_url: z.string().url().optional(),
  error: z.string().optional(),
});

export const telegramStatusResponseSchema = z.object({
  challenge_id: z.string().uuid(),
  status: z.enum(['pending', 'completed', 'expired', 'used']),
  expires_at: z.number().int().positive(),
  created_at: z.number().int().positive(),
});

export const telegramWebAppAuthBodySchema = z.object({
  client_id: z.string().min(1, 'Client ID is required'),
  auth_data: telegramAuthDataSchema,
});

export const telegramWebAppAuthResponseSchema = z.object({
  success: z.boolean(),
  redirectUrl: z.string().url().optional(),
  session: z.object({
    sessionId: z.string(),
    expiresAt: z.number().int().positive(),
  }).optional(),
  user: z.object({
    id: z.number().int().positive(),
    username: z.string().optional(),
    firstName: z.string(),
    lastName: z.string().optional(),
    photoUrl: z.string().url().optional(),
  }).optional(),
  error: z.string().optional(),
});

// Export schemas object following existing pattern
export const telegramSchemas = {
  authData: telegramAuthDataSchema,
  challengeQuery: telegramChallengeQuerySchema,
  verificationQuery: telegramVerificationQuerySchema,
  verificationBody: telegramVerificationBodySchema,
  verificationResponse: telegramVerificationResponseSchema,
  statusResponse: telegramStatusResponseSchema,
  webAppAuthBody: telegramWebAppAuthBodySchema,
  webAppAuthResponse: telegramWebAppAuthResponseSchema,
} as const;
