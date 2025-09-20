import * as crypto from 'crypto';
import { SecretManager } from './secrets.js';
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 12;
const SALT_LENGTH = 32;
const ITERATIONS = 100000;
const DIGEST = 'sha512';
interface EncryptionContext {
  purpose: 'credential' | 'session' | 'database' | 'kusama';
  version: string;
  timestamp: number;
  userId?: string;
  metadata?: Record<string, unknown>;
}
interface EncryptedData {
  version: string;
  algorithm: string;
  salt: string;
  iv: string;
  tag: string;
  encrypted: string;
  context: EncryptionContext;
  signature?: string;
}
export class EnhancedEncryption {
  private static instance: EnhancedEncryption;
  private secretManager: SecretManager;
  private constructor() {
    this.secretManager = SecretManager.getInstance();
  }
  static getInstance(): EnhancedEncryption {
    if (!EnhancedEncryption.instance) {
      EnhancedEncryption.instance = new EnhancedEncryption();
    }
    return EnhancedEncryption.instance;
  }
  private deriveKey(masterKey: string, salt: Buffer, purpose: string): Buffer {
    const purposeKey = crypto.pbkdf2Sync(masterKey + purpose, salt, ITERATIONS, KEY_LENGTH, DIGEST);
    return purposeKey;
  }
  private generateHMAC(data: string, key: Buffer): string {
    return crypto.createHmac('sha256', key).update(data).digest('hex');
  }
  async encryptData(
    data: string,
    context: EncryptionContext,
    additionalData?: string
  ): Promise<string> {
    try {
      const masterKey = this.secretManager.getSecret('DATABASE_ENCRYPTION_KEY');
      const salt = crypto.randomBytes(SALT_LENGTH);
      const key = this.deriveKey(masterKey, salt, context.purpose);
      const iv = crypto.randomBytes(IV_LENGTH);
      const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
      const aad = Buffer.from(
        JSON.stringify({
          purpose: context.purpose,
          version: context.version,
          timestamp: context.timestamp,
          userId: context.userId,
        }),
        'utf8'
      );
      cipher.setAAD(aad);
      if (additionalData) {
        cipher.setAAD(Buffer.from(additionalData, 'utf8'));
      }
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      const tag = cipher.getAuthTag();
      const encryptedData: EncryptedData = {
        version: '2.0',
        algorithm: ALGORITHM,
        salt: salt.toString('hex'),
        iv: iv.toString('hex'),
        tag: tag.toString('hex'),
        encrypted,
        context,
      };
      const hmacKey = this.deriveKey(masterKey, salt, `${context.purpose}_hmac`);
      encryptedData.signature = this.generateHMAC(
        JSON.stringify({
          version: encryptedData.version,
          algorithm: encryptedData.algorithm,
          salt: encryptedData.salt,
          iv: encryptedData.iv,
          tag: encryptedData.tag,
          encrypted: encryptedData.encrypted,
          context: encryptedData.context,
        }),
        hmacKey
      );
      return JSON.stringify(encryptedData);
    } catch (error) {
      throw new Error(
        `Enhanced encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
  async decryptData(
    encryptedDataString: string
  ): Promise<{ data: string; context: EncryptionContext }> {
    try {
      const encryptedData: EncryptedData = JSON.parse(encryptedDataString);
      if (encryptedData.version !== '2.0') {
        throw new Error('Unsupported encryption version');
      }
      const masterKey = this.secretManager.getSecret('DATABASE_ENCRYPTION_KEY');
      const salt = Buffer.from(encryptedData.salt, 'hex');
      const iv = Buffer.from(encryptedData.iv, 'hex');
      const tag = Buffer.from(encryptedData.tag, 'hex');
      const hmacKey = this.deriveKey(masterKey, salt, `${encryptedData.context.purpose}_hmac`);
      const expectedSignature = this.generateHMAC(
        JSON.stringify({
          version: encryptedData.version,
          algorithm: encryptedData.algorithm,
          salt: encryptedData.salt,
          iv: encryptedData.iv,
          tag: encryptedData.tag,
          encrypted: encryptedData.encrypted,
          context: encryptedData.context,
        }),
        hmacKey
      );
      if (encryptedData.signature !== expectedSignature) {
        throw new Error('Data integrity check failed - possible tampering detected');
      }
      const key = this.deriveKey(masterKey, salt, encryptedData.context.purpose);
      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
      const aad = Buffer.from(
        JSON.stringify({
          purpose: encryptedData.context.purpose,
          version: encryptedData.context.version,
          timestamp: encryptedData.context.timestamp,
          userId: encryptedData.context.userId,
        }),
        'utf8'
      );
      decipher.setAAD(aad);
      decipher.setAuthTag(tag);
      let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return {
        data: decrypted,
        context: encryptedData.context,
      };
    } catch (error) {
      throw new Error(
        `Enhanced decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
  async encryptCredentialForKusama(
    credentialData: Record<string, unknown>,
    userAddress: string,
    _metadata?: Record<string, unknown>
  ): Promise<string> {
    const context: EncryptionContext = {
      purpose: 'kusama',
      version: '2.0',
      timestamp: Date.now(),
      userId: userAddress,
      ...(_metadata && { metadata: _metadata }),
    };
    return this.encryptData(JSON.stringify(credentialData), context);
  }
  async decryptCredentialFromKusama(encryptedData: string): Promise<Record<string, unknown>> {
    const result = await this.decryptData(encryptedData);
    if (result.context.purpose !== 'kusama') {
      throw new Error('Invalid encryption context - not a Kusama credential');
    }
    return JSON.parse(result.data);
  }
  generateSecureRandom(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }
  hashData(data: string, salt?: string): { hash: string; salt: string } {
    const dataSalt = salt || crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(data, dataSalt, 10000, 64, 'sha512').toString('hex');
    return { hash, salt: dataSalt };
  }
  verifyHash(data: string, hash: string, salt: string): boolean {
    const computedHash = crypto.pbkdf2Sync(data, salt, 10000, 64, 'sha512').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(computedHash, 'hex'));
  }
}
export const enhancedEncryption = EnhancedEncryption.getInstance();
export const encryptData = (_data: string): never => {
  throw new Error('Use enhancedEncryption.encryptCredentialForKusama() for Kusama storage');
};
export const decryptData = (_data: string): never => {
  throw new Error('Use enhancedEncryption.decryptCredentialFromKusama() for Kusama storage');
};
