import { randomBytes } from 'crypto';

export function generateNonce(): string {
  return randomBytes(16).toString('base64');
}
