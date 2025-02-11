import { rateLimit } from 'express-rate-limit';
import { TokenPayload } from '../types/auth';

export const JWT_CONFIG = {
  algorithm: 'HS512' as const,
  issuer: 'polkadot-sso',
  accessTokenExpiry: 15 * 60, // 15 minutes
  refreshTokenExpiry: 7 * 24 * 60 * 60 // 7 days
};

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many authentication attempts, please try again later'
});

export interface VerifyTokenResult {
  valid: boolean;
  decoded?: TokenPayload;
  error?: string;
}
