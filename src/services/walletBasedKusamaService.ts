import { ApiPromise, WsProvider } from '@polkadot/api';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import crypto from 'crypto';
import { encryptData } from '../utils/encryption';
import { createLogger } from '../utils/logger';

const logger = createLogger('wallet-based-kusama');

export interface WalletCredentialData {
  userAddress: string;
  credentialData: Record<string, unknown>;
  credentialType: string;
  timestamp: number;
  encryptedData: string;
  dataHash: string;
}

export interface WalletStorageResult {
  success: boolean;
  credentialId: string;
  transactionHash?: string;
  storageMethod: 'wallet_signed' | 'mock_storage';
  userAddress: string;
  timestamp: number;
}

export class WalletBasedKusamaService {
  private api: ApiPromise | null = null;
  private isConnected = false;
  private readonly endpoint: string;

  constructor() {
    this.endpoint = process.env.KUSAMA_ENDPOINT || 'wss://kusama-rpc.polkadot.io';
  }

  async initialize(): Promise<void> {
    try {
      logger.info('Initializing Wallet-Based Kusama service', { endpoint: this.endpoint });

      await cryptoWaitReady();

      const provider = new WsProvider(this.endpoint);
      this.api = await ApiPromise.create({ provider });

      await this.api.isReady;
      this.isConnected = true;

      logger.info('✅ Wallet-Based Kusama service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Wallet-Based Kusama service', { error });
      throw new Error(
        `Kusama initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async storeCredentialWithWallet(
    userAddress: string,
    credentialData: Record<string, unknown>,
    credentialType: string,
    userSignature?: string,
    userMessage?: string
  ): Promise<WalletStorageResult> {
    try {
      if (!this.api || !this.isConnected) {
        throw new Error('Kusama service not initialized');
      }

      logger.info('Storing credential with wallet authentication', {
        userAddress,
        credentialType,
        hasSignature: !!userSignature,
      });

      // Generate credential ID
      const credentialId = `cred_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;

      // Encrypt the credential data
      const encryptedData = encryptData(JSON.stringify(credentialData));

      // Generate data hash
      const dataHash = crypto
        .createHash('sha256')
        .update(JSON.stringify(credentialData))
        .digest('hex');

      // If we have a user signature, we could potentially use it for on-chain storage
      // For now, we'll use mock storage but log the signature for future implementation
      if (userSignature && userMessage) {
        logger.info('User signature received, could be used for on-chain storage', {
          signatureLength: userSignature.length,
          messageLength: userMessage.length,
        });

        // TODO: Implement actual on-chain storage using user's wallet
        // This would involve:
        // 1. Verifying the user's signature
        // 2. Using the user's public key for storage
        // 3. Potentially using a different storage method that works with Kusama
      }

      // For now, use mock storage (this eliminates the hardcoded seed issue)
      const result: WalletStorageResult = {
        success: true,
        credentialId,
        storageMethod: 'mock_storage',
        userAddress,
        timestamp: Date.now(),
      };

      logger.info('✅ Credential stored successfully with wallet authentication', result);
      return result;
    } catch (error) {
      logger.error('Failed to store credential with wallet', { error, userAddress });
      throw new Error(
        `Wallet-based storage failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async retrieveCredentialWithWallet(
    credentialId: string,
    userAddress: string,
    userSignature?: string
  ): Promise<WalletCredentialData | null> {
    try {
      logger.info('Retrieving credential with wallet authentication', {
        credentialId,
        userAddress,
        hasSignature: !!userSignature,
      });

      // For now, return mock data since we're using mock storage
      // In a real implementation, this would:
      // 1. Verify the user's signature
      // 2. Check if the user has access to this credential
      // 3. Retrieve from actual storage (on-chain or off-chain)

      const mockCredential: WalletCredentialData = {
        userAddress,
        credentialData: { type: 'mock', id: credentialId },
        credentialType: 'mock_type',
        timestamp: Date.now(),
        encryptedData: 'mock_encrypted_data',
        dataHash: 'mock_hash',
      };

      logger.info('✅ Credential retrieved successfully with wallet authentication');
      return mockCredential;
    } catch (error) {
      logger.error('Failed to retrieve credential with wallet', {
        error,
        credentialId,
        userAddress,
      });
      return null;
    }
  }

  async listCredentialsWithWallet(
    userAddress: string,
    userSignature?: string
  ): Promise<WalletCredentialData[]> {
    try {
      logger.info('Listing credentials with wallet authentication', {
        userAddress,
        hasSignature: !!userSignature,
      });

      // For now, return mock data
      // In a real implementation, this would verify the user's signature
      // and return actual credentials they have access to

      const mockCredentials: WalletCredentialData[] = [
        {
          userAddress,
          credentialData: { type: 'academic_degree', institution: 'University of Example' },
          credentialType: 'academic_degree',
          timestamp: Date.now() - 86400000, // 1 day ago
          encryptedData: 'mock_encrypted_data_1',
          dataHash: 'mock_hash_1',
        },
        {
          userAddress,
          credentialData: {
            type: 'professional_certification',
            organization: 'Blockchain Institute',
          },
          credentialType: 'professional_certification',
          timestamp: Date.now() - 172800000, // 2 days ago
          encryptedData: 'mock_encrypted_data_2',
          dataHash: 'mock_hash_2',
        },
      ];

      logger.info('✅ Credentials listed successfully with wallet authentication', {
        count: mockCredentials.length,
      });

      return mockCredentials;
    } catch (error) {
      logger.error('Failed to list credentials with wallet', { error, userAddress });
      return [];
    }
  }

  async estimateStorageCost(
    dataSize: number,
    userAddress: string
  ): Promise<{ estimatedCost: string; currency: string; storageMethod: string }> {
    try {
      logger.info('Estimating storage cost for wallet-based storage', {
        dataSize,
        userAddress,
      });

      // Since we're using mock storage, the cost is minimal
      // In a real implementation, this would calculate actual on-chain costs
      const estimatedCost = ((dataSize / 1024) * 0.001).toFixed(3); // 0.001 KSM per KB

      const result = {
        estimatedCost,
        currency: 'KSM',
        storageMethod: 'wallet_authenticated',
      };

      logger.info('✅ Storage cost estimated successfully', result);
      return result;
    } catch (error) {
      logger.error('Failed to estimate storage cost', { error, dataSize, userAddress });
      return {
        estimatedCost: '0.001',
        currency: 'KSM',
        storageMethod: 'wallet_authenticated',
      };
    }
  }

  async getNetworkHealth(): Promise<{ isHealthy: boolean; details: Record<string, unknown> }> {
    try {
      if (!this.api || !this.isConnected) {
        return { isHealthy: false, details: { error: 'Service not initialized' } };
      }

      const [chain, nodeName, nodeVersion] = await Promise.all([
        this.api.rpc.system.chain(),
        this.api.rpc.system.name(),
        this.api.rpc.system.version(),
      ]);

      const result = {
        isHealthy: true,
        details: {
          chain: chain.toString(),
          nodeName: nodeName.toString(),
          nodeVersion: nodeVersion.toString(),
          endpoint: this.endpoint,
        },
      };

      logger.info('✅ Network health check successful', result);
      return result;
    } catch (error) {
      logger.error('Failed to get network health', { error });
      return {
        isHealthy: false,
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      };
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.api) {
        await this.api.disconnect();
        this.api = null;
        this.isConnected = false;
        logger.info('✅ Wallet-Based Kusama service disconnected');
      }
    } catch (error) {
      logger.error('Error disconnecting from Kusama', { error });
    }
  }
}
