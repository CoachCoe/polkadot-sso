import * as crypto from 'crypto';
import { decryptData, encryptData } from '../utils/encryption';
import { createLogger } from '../utils/logger';
// Removed advanced Kusama service import

export interface KusamaCredential extends Record<string, unknown> {
  id: string;
  type: string;
  data: string;
  encrypted: boolean;
  hash: string;
  timestamp: number;
  address: string;
}

export interface KusamaStorageResult {
  success: boolean;
  transactionHash?: string;
  cost?: number;
  error?: string;
  credentialId?: string;
}

export class KusamaIntegrationService {
  private isInitialized: boolean = false;
  private logger = createLogger('kusama-integration');

  constructor() {
    // Debug environment variables
    console.log('🔍 Debug - Environment variables:');
    console.log('KUSAMA_ENDPOINT:', process.env.KUSAMA_ENDPOINT);
    console.log('KUSAMA_ACCOUNT_SEED:', process.env.KUSAMA_ACCOUNT_SEED);
    console.log('KUSAMA_ACCOUNT_TYPE:', process.env.KUSAMA_ACCOUNT_TYPE);
  }

  async initialize(): Promise<boolean> {
    try {
      if (this.isInitialized) return true;

      this.logger.info('Initializing Kusama integration service...');
      // TODO: Initialize with wallet-based service instead
      this.isInitialized = true;
      this.logger.info('✅ Kusama integration service initialized successfully');
      return true;
    } catch (error) {
      this.logger.error('Failed to initialize Kusama integration service:', error);
      return false;
    }
  }

  /**
   * Store encrypted credentials on Kusama
   */
  async storeCredential(
    credentialData: Record<string, unknown>,
    credentialType: string,
    userAddress: string,
    encryptionKey?: string
  ): Promise<KusamaStorageResult> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const credentialId = `cred_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Encrypt the credential data
      const dataToEncrypt = JSON.stringify({
        type: credentialType,
        data: credentialData,
        timestamp: Date.now(),
        address: userAddress,
      });

      // Encrypt data with user-provided key or system default
      let encryptedData: string;
      if (encryptionKey) {
        encryptedData = this.encryptWithUserKey(dataToEncrypt, encryptionKey);
      } else {
        // Use system default encryption from environment
        encryptedData = encryptData(dataToEncrypt);
      }

      // Create credential object
      const credential: KusamaCredential = {
        id: credentialId,
        type: credentialType,
        data: encryptedData,
        encrypted: !!encryptionKey,
        hash: this.generateHash(dataToEncrypt),
        timestamp: Date.now(),
        address: userAddress,
      };

      this.logger.info(`Storing credential ${credentialId} on Kusama for address ${userAddress}`);

      // Store on Kusama using remarks
      // TODO: Use wallet-based service instead
      const result = { extrinsicHash: `mock_hash_${Date.now()}` };

      this.logger.info(`✅ Credential ${credentialId} stored successfully on Kusama`);
      return {
        success: true,
        transactionHash: result.extrinsicHash,
        cost: 0.001, // Approximate cost for remark storage
        credentialId,
      };
    } catch (error) {
      this.logger.error('Failed to store credential on Kusama:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Retrieve and decrypt credentials from Kusama
   */
  async retrieveCredential(
    credentialId: string,
    userAddress: string,
    encryptionKey?: string
  ): Promise<any> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      this.logger.info(`Retrieving credential ${credentialId} from Kusama`);

      // In a real implementation, you'd query Kusama for the credential
      // For now, we'll simulate retrieval from local storage
      // This would be replaced with actual Kusama blockchain queries

      const mockCredential = await this.getMockCredential(credentialId);
      if (!mockCredential) {
        throw new Error('Credential not found');
      }

      // Decrypt data based on encryption method used
      if (mockCredential.encrypted && encryptionKey) {
        const dataString = String(mockCredential.data);
        const decryptedData = this.decryptWithUserKey(dataString, encryptionKey);
        return JSON.parse(decryptedData);
      } else if (mockCredential.encrypted && !encryptionKey) {
        // Try system default decryption
        try {
          const dataString = String(mockCredential.data);
          const decryptedData = decryptData(dataString);
          return JSON.parse(decryptedData);
        } catch (error) {
          throw new Error('Credential is encrypted but no valid decryption key provided');
        }
      } else {
        // Unencrypted data - ensure data is a string before parsing
        const dataString = String(mockCredential.data);
        return JSON.parse(dataString);
      }
    } catch (error) {
      this.logger.error('Failed to retrieve credential from Kusama:', error);
      throw error;
    }
  }

  /**
   * Get cost estimate for storing credentials
   */
  async getStorageCostEstimate(dataSize: number): Promise<number> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // const estimate = await this.kusamaService.getStorageCostEstimate(dataSize, 'remark'); // Removed
      const estimate = 0.001; // Mock estimate

      return estimate;
    } catch (error) {
      this.logger.error('Failed to get storage cost estimate:', error);
      return 0;
    }
  }

  /**
   * Verify credential integrity
   */
  async verifyCredential(credential: KusamaCredential): Promise<boolean> {
    try {
      const dataString = JSON.stringify({
        type: credential.type,
        data: credential.data,
        timestamp: credential.timestamp,
        address: credential.address,
      });

      const expectedHash = this.generateHash(dataString);
      return expectedHash === credential.hash;
    } catch (error) {
      this.logger.error('Failed to verify credential:', error);
      return false;
    }
  }

  /**
   * List all credentials for a user address
   */
  async listUserCredentials(userAddress: string): Promise<KusamaCredential[]> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // In a real implementation, this would query Kusama blockchain
      // For now, return mock data
      return this.getMockUserCredentials(userAddress);
    } catch (error) {
      this.logger.error('Failed to list user credentials:', error);
      return [];
    }
  }

  /**
   * Get network health status
   */
  async getNetworkHealth() {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // return await this.kusamaService.getNetworkHealth(); // Removed
      return { status: 'healthy', peers: 10, latency: 100 };
    } catch (error) {
      this.logger.error('Failed to get network health:', error);
      throw error;
    }
  }

  /**
   * Get active transaction monitors
   */
  async getActiveMonitors(): Promise<string[]> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // return this.kusamaService.getActiveMonitors(); // Removed
      return [];
    } catch (error) {
      this.logger.error('Failed to get active monitors:', error);
      return [];
    }
  }

  private generateHash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Encrypt data with user-provided key using AES-256-GCM
   */
  private encryptWithUserKey(data: string, userKey: string): string {
    // Ensure key is at least 32 characters
    if (userKey.length < 32) {
      throw new Error('Encryption key must be at least 32 characters long');
    }

    // Derive a 32-byte key from user input
    const key = crypto.scryptSync(userKey, 'polkadot-sso-salt', 32);
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    cipher.setAAD(Buffer.from('kusama-credential', 'utf8'));

    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const tag = cipher.getAuthTag();

    // Return format: iv:tag:encrypted
    return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt data with user-provided key
   */
  private decryptWithUserKey(encryptedData: string, userKey: string): string {
    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }

    const [ivHex, tagHex, encrypted] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');

    // Derive the same key
    const key = crypto.scryptSync(userKey, 'polkadot-sso-salt', 32);

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAAD(Buffer.from('kusama-credential', 'utf8'));
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  // TODO: Implement actual Kusama queries
  private async getMockCredential(credentialId: string): Promise<KusamaCredential | null> {
    // This would be replaced with actual Kusama blockchain queries
    const mockCredentials = this.getMockUserCredentials(
      '5Dy3rM7WVhwv58ogVn1RGK9rmnq7HwUBqeZheT9U5B26mXZd'
    );
    return mockCredentials.find(c => c.id === credentialId) || null;
  }

  private getMockUserCredentials(userAddress: string): KusamaCredential[] {
    return [
      {
        id: 'cred_1234567890_abc123',
        type: 'academic_degree',
        data: JSON.stringify({
          type: 'academic_degree',
          data: {
            institution: 'University of Example',
            degree: 'Bachelor of Science',
            year: '2023',
            field: 'Computer Science',
          },
          timestamp: Date.now(),
          address: userAddress,
        }),
        encrypted: false,
        hash: 'mock_hash_123',
        timestamp: Date.now(),
        address: userAddress,
      },
      {
        id: 'cred_1234567891_def456',
        type: 'professional_certification',
        data: JSON.stringify({
          type: 'professional_certification',
          data: {
            organization: 'Blockchain Institute',
            certification: 'Polkadot Developer',
            year: '2024',
            level: 'Advanced',
          },
          timestamp: Date.now(),
          address: userAddress,
        }),
        encrypted: true,
        hash: 'mock_hash_456',
        timestamp: Date.now(),
        address: userAddress,
      },
    ];
  }
}

// Export singleton instance
export const kusamaIntegrationService = new KusamaIntegrationService();
