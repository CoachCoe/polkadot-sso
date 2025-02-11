import crypto from 'crypto';
import { pbkdf2Sync, randomBytes } from 'crypto';

export function generateSecureId(): string {
  return crypto.randomUUID();
}

export function generateNonce(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function generateFingerprint(): string {
  return crypto.randomBytes(16).toString('hex');
}

export function hashSecret(secret: string): { hash: string; salt: string } {
  const salt = randomBytes(16).toString('hex');
  const hash = pbkdf2Sync(secret, salt, 100000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

export function verifySecret(secret: string, hash: string, salt: string): boolean {
  const verifyHash = pbkdf2Sync(secret, salt, 100000, 64, 'sha512').toString('hex');
  return hash === verifyHash;
}
