import crypto from 'crypto';

export function generateNonce(): string {
  return crypto.randomBytes(16).toString('base64');
}
