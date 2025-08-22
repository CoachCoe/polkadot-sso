import * as crypto from 'crypto';

// Use a more secure encryption algorithm
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 12; // 96 bits for GCM

// Validate and derive encryption key
function getEncryptionKey(): Buffer {
  const envKey = process.env.DATABASE_ENCRYPTION_KEY;

  if (!envKey) {
    throw new Error('DATABASE_ENCRYPTION_KEY environment variable is required');
  }

  if (envKey.length < 32) {
    throw new Error('DATABASE_ENCRYPTION_KEY must be at least 32 characters long');
  }

  // Use the first 32 bytes as the key
  return Buffer.from(envKey).subarray(0, KEY_LENGTH);
}

export const encryptField = (text: string): string => {
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    cipher.setAAD(Buffer.from('polkadot-sso', 'utf8')); // Additional authenticated data

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const tag = cipher.getAuthTag();

    // Return format: iv:tag:encrypted
    return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
  } catch (error) {
    throw new Error(
      `Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
};

export const decryptField = (encryptedText: string): string => {
  try {
    const key = getEncryptionKey();
    const parts = encryptedText.split(':');

    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }

    const [ivHex, tagHex, encrypted] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAAD(Buffer.from('polkadot-sso', 'utf8'));
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    throw new Error(
      `Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
};

// Generate a secure random key for environment variables
export const generateSecureKey = (length: number = 64): string => {
  return crypto.randomBytes(length).toString('base64');
};

// Validate secret strength
export const validateSecret = (secret: string, minLength: number = 32): boolean => {
  if (!secret || secret.length < minLength) {
    return false;
  }

  // Check for sufficient entropy (basic check)
  const uniqueChars = new Set(secret).size;
  return uniqueChars >= minLength / 2;
};

export const encryptData = encryptField;
export const decryptData = decryptField;
