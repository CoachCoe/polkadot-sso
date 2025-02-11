import crypto from 'crypto';

export function generateSecureId(): string {
  return crypto.randomUUID();
}

export function generateNonce(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function generateFingerprint(): string {
  return crypto.randomBytes(16).toString('hex');
}
