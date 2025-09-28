/**
 * Cryptographic utilities for signature verification and secure operations
 */

import crypto from 'crypto';
import { createLogger } from './logger.js';
import { AUTH_CONFIG } from '../constants/config.js';

const logger = createLogger('crypto-utils');

/**
 * Verify a cryptographic signature
 * Note: This is a placeholder implementation. In production, you should use
 * proper cryptographic libraries like @polkadot/util-crypto for Substrate signatures
 */
export function verifySignature(
  message: string,
  signature: string,
  address: string,
  publicKey?: string
): boolean {
  try {
    // Basic validation
    if (!signature || signature.length < AUTH_CONFIG.MIN_SIGNATURE_LENGTH) {
      logger.warn('Invalid signature format', { 
        signatureLength: signature?.length || 0,
        address: address.substring(0, 10) + '...'
      });
      return false;
    }

    if (!message || message.length > AUTH_CONFIG.MAX_MESSAGE_LENGTH) {
      logger.warn('Invalid message format', { 
        messageLength: message?.length || 0,
        address: address.substring(0, 10) + '...'
      });
      return false;
    }

    if (!address || address.length > AUTH_CONFIG.MAX_ADDRESS_LENGTH) {
      logger.warn('Invalid address format', { 
        addressLength: address?.length || 0
      });
      return false;
    }

    // TODO: Implement proper signature verification
    // For Polkadot/Substrate addresses, you would:
    // 1. Decode the address to get the public key
    // 2. Verify the signature against the message hash
    // 3. Ensure the signature is valid for the given public key
    
    logger.info('Signature verification attempt', {
      messageLength: message.length,
      signaturePreview: signature.substring(0, 16),
      address: address.substring(0, 10) + '...',
      // Don't log full signature or message for security
    });

    // TEMPORARY: Return true for development
    // ⚠️ SECURITY WARNING: This should be replaced with proper verification
    logger.warn('Signature verification is disabled - SECURITY RISK!');
    return true;
    
  } catch (error) {
    logger.error('Signature verification error', {
      error: error instanceof Error ? error.message : String(error),
      address: address.substring(0, 10) + '...',
    });
    return false;
  }
}

/**
 * Generate a secure random string
 */
export function generateSecureRandom(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate a secure random UUID
 */
export function generateSecureUUID(): string {
  return crypto.randomUUID();
}

/**
 * Generate random bytes
 */
export function randomBytes(length: number): Buffer {
  return crypto.randomBytes(length);
}

/**
 * Create hash
 */
export function createHash(algorithm: string) {
  return crypto.createHash(algorithm);
}

/**
 * Generate random UUID
 */
export function randomUUID(): string {
  return crypto.randomUUID();
}

/**
 * Hash a string using SHA-256
 */
export function hashString(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

/**
 * Create HMAC signature
 */
export function createHMAC(data: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

/**
 * Verify HMAC signature
 */
export function verifyHMAC(data: string, signature: string, secret: string): boolean {
  const expectedSignature = createHMAC(data, secret);
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}

/**
 * Encrypt sensitive data
 */
export function encryptData(data: string, key: string): string {
  const iv = crypto.randomBytes(16);
  const keyHash = crypto.createHash('sha256').update(key).digest();
  const cipher = crypto.createCipheriv('aes-256-cbc', keyHash, iv);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Decrypt sensitive data
 */
export function decryptData(encryptedData: string, key: string): string {
  const parts = encryptedData.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  const keyHash = crypto.createHash('sha256').update(key).digest();
  const decipher = crypto.createDecipheriv('aes-256-cbc', keyHash, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}