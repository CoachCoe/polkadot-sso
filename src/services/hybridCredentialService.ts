import * as crypto from 'crypto';
import { Database } from 'sqlite';
import { CredentialService } from '../modules/credentials';
import { decryptData, encryptData } from '../modules/security';
import {
    CreateIssuanceRequest,
    Credential,
    CredentialShare,
    CredentialType,
    CredentialVerification,
    HybridCredentialRequest,
    IssuanceRequest,
    ShareCredentialRequest,
    UserProfile,
    VerifyCredentialRequest,
} from '../types/auth';
import { createLogger } from '../utils/logger';
import { IPFSService } from './ipfsService';
import { CredentialReference, KusamaService } from './kusamaService';
const logger = createLogger('hybrid-credential-service');
export interface HybridCredential extends Credential {
  ipfs_hash?: string;
  kusama_reference?: CredentialReference;
  storage_type: 'local' | 'ipfs' | 'hybrid';
  kusama_block_hash?: string;
  kusama_extrinsic_hash?: string;
}
export class HybridCredentialService {
  constructor(
    private db: Database,
    private credentialService: CredentialService,
    private ipfsService: IPFSService,
    private kusamaService: KusamaService
  ) {}
  async initialize(): Promise<void> {
    try {
      logger.info('Initializing hybrid credential service');
      const ipfsConnected = await this.ipfsService.testConnection();
      if (!ipfsConnected) {
        logger.warn('IPFS connection failed - will use local storage only');
      }
      const kusamaConnected = await this.kusamaService.testConnection();
      if (!kusamaConnected) {
        logger.warn('Kusama connection failed - will use local storage only');
      }
      logger.info('Hybrid credential service initialized', {
        ipfsConnected,
        kusamaConnected,
      });
    } catch (error) {
      logger.error('Failed to initialize hybrid credential service', { error });
      throw error;
    }
  }
  async createCredential(
    issuerAddress: string,
    userAddress: string,
    request: HybridCredentialRequest
  ): Promise<HybridCredential> {
    try {
      logger.info('Creating hybrid credential', {
        issuerAddress,
        userAddress,
        storagePreference: request.storage_preference || 'hybrid',
      });
      const storageType = request.storage_preference || 'hybrid';
      const now = Date.now();
      const encryptedData = encryptData(JSON.stringify(request.credential_data));
      const dataHash = crypto
        .createHash('sha256')
        .update(JSON.stringify(request.credential_data))
        .digest('hex');
      let ipfsHash: string | undefined;
      let kusamaReference: CredentialReference | undefined;
      if (storageType === 'ipfs' || storageType === 'hybrid') {
        try {
          ipfsHash = await this.ipfsService.uploadEncryptedData(encryptedData);
          if (request.pin_to_ipfs) {
            await this.ipfsService.pinData(ipfsHash);
          }
          logger.info('Credential data stored on IPFS', { ipfsHash });
        } catch (error) {
          logger.error('Failed to store on IPFS, falling back to local storage', { error });
        }
      }
      if (
        (storageType === 'ipfs' || storageType === 'hybrid') &&
        ipfsHash &&
        request.store_on_kusama
      ) {
        try {
          kusamaReference = await this.kusamaService.storeCredentialReference(
            userAddress,
            ipfsHash,
            dataHash
          );
          logger.info('Credential reference stored on Kusama', { kusamaReference });
        } catch (error) {
          logger.error('Failed to store on Kusama', { error });
        }
      }
      const credentialId = crypto.randomUUID();
      const credential: HybridCredential = {
        id: credentialId,
        user_address: userAddress,
        credential_type_id: request.credential_type_id,
        issuer_address: issuerAddress,
        ...(request.issuer_name && { issuer_name: request.issuer_name }),
        credential_data: storageType === 'local' ? encryptedData : '',
        credential_hash: dataHash,
        ...(request.proof_signature && { proof_signature: request.proof_signature }),
        ...(request.proof_type && { proof_type: request.proof_type }),
        status: 'active',
        issued_at: now,
        ...(request.expires_at && { expires_at: request.expires_at }),
        created_at: now,
        updated_at: now,
        ...(request.metadata && { metadata: JSON.stringify(request.metadata) }),
        ...(ipfsHash && { ipfs_hash: ipfsHash }),
        ...(kusamaReference && { kusama_reference: kusamaReference }),
        storage_type: storageType,
      };
      await this.db.run(
        `INSERT INTO credentials (
          id, user_address, credential_type_id, issuer_address, issuer_name,
          credential_data, credential_hash, proof_signature, proof_type,
          status, issued_at, expires_at, created_at, updated_at, metadata,
          ipfs_hash, kusama_block_hash, kusama_extrinsic_hash, storage_type
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          credential.id,
          credential.user_address,
          credential.credential_type_id,
          credential.issuer_address,
          credential.issuer_name,
          credential.credential_data,
          credential.credential_hash,
          credential.proof_signature,
          credential.proof_type,
          credential.status,
          credential.issued_at,
          credential.expires_at,
          credential.created_at,
          credential.updated_at,
          credential.metadata,
          credential.ipfs_hash,
          credential.kusama_reference?.blockHash,
          credential.kusama_reference?.extrinsicHash,
          credential.storage_type,
        ]
      );
      logger.info('Hybrid credential created successfully', {
        credentialId,
        storageType,
        ipfsHash,
        kusamaReference: kusamaReference ? 'stored' : 'not stored',
      });
      return credential;
    } catch (error) {
      logger.error('Failed to create hybrid credential', { error });
      throw error;
    }
  }
  async getCredentialData(credentialId: string): Promise<Record<string, unknown> | null> {
    try {
      const credential = await this.getCredential(credentialId);
      if (!credential) return null;
      let encryptedData: string;
      if (credential.storage_type === 'ipfs' && credential.ipfs_hash) {
        encryptedData = await this.ipfsService.retrieveEncryptedData(credential.ipfs_hash);
      } else if (credential.storage_type === 'hybrid' && credential.ipfs_hash) {
        try {
          encryptedData = await this.ipfsService.retrieveEncryptedData(credential.ipfs_hash);
        } catch (error) {
          logger.warn('Failed to retrieve from IPFS, using local storage', { error });
          encryptedData = credential.credential_data;
        }
      } else {
        encryptedData = credential.credential_data;
      }
      const decryptedData = decryptData(encryptedData);
      return JSON.parse(decryptedData);
    } catch (error) {
      logger.error('Failed to get credential data', { credentialId, error });
      return null;
    }
  }
  async getCredential(id: string): Promise<HybridCredential | undefined> {
    try {
      const credential = await this.db.get<HybridCredential>(
        `SELECT *,
         ipfs_hash,
         kusama_block_hash,
         kusama_extrinsic_hash,
         storage_type
         FROM credentials WHERE id = ?`,
        [id]
      );
      if (credential?.kusama_block_hash && credential.kusama_extrinsic_hash) {
        credential.kusama_reference = {
          userAddress: credential.user_address,
          ipfsHash: credential.ipfs_hash || '',
          credentialHash: credential.credential_hash,
          timestamp: credential.created_at,
          blockHash: credential.kusama_block_hash,
          extrinsicHash: credential.kusama_extrinsic_hash,
        };
      }
      return credential;
    } catch (error) {
      logger.error('Failed to get credential', { id, error });
      return undefined;
    }
  }
  async verifyCredentialIntegrity(credentialId: string): Promise<{
    valid: boolean;
    localValid: boolean;
    ipfsValid: boolean;
    kusamaValid: boolean;
    errors: string[];
  }> {
    const result = {
      valid: true,
      localValid: true,
      ipfsValid: true,
      kusamaValid: true,
      errors: [] as string[],
    };
    try {
      const credential = await this.getCredential(credentialId);
      if (!credential) {
        result.valid = false;
        result.errors.push('Credential not found');
        return result;
      }
      if (credential.storage_type === 'local' || credential.storage_type === 'hybrid') {
        try {
          const localData = await this.getCredentialData(credentialId);
          if (!localData) {
            result.localValid = false;
            result.errors.push('Local data verification failed');
          }
        } catch (error) {
          result.localValid = false;
          result.errors.push(
            `Local verification error: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      }
      if (credential.storage_type === 'ipfs' || credential.storage_type === 'hybrid') {
        if (credential.ipfs_hash) {
          try {
            const exists = await this.ipfsService.dataExists(credential.ipfs_hash);
            if (!exists) {
              result.ipfsValid = false;
              result.errors.push('IPFS data not found');
            }
          } catch (error) {
            result.ipfsValid = false;
            result.errors.push(
              `IPFS verification error: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
          }
        }
      }
      if (credential.kusama_reference) {
        try {
          const kusamaValid = await this.kusamaService.verifyCredentialReference(
            credential.kusama_reference.ipfsHash,
            credential.kusama_reference.credentialHash
          );
          if (!kusamaValid) {
            result.kusamaValid = false;
            result.errors.push('Kusama reference not found');
          }
        } catch (error) {
          result.kusamaValid = false;
          result.errors.push(
            `Kusama verification error: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      }
      result.valid = result.localValid && result.ipfsValid && result.kusamaValid;
      return result;
    } catch (error) {
      result.valid = false;
      result.errors.push(
        `Verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      return result;
    }
  }
  async migrateToIPFS(credentialId: string): Promise<HybridCredential> {
    try {
      const credential = await this.getCredential(credentialId);
      if (!credential) {
        throw new Error('Credential not found');
      }
      if (credential.storage_type === 'ipfs' || credential.storage_type === 'hybrid') {
        throw new Error('Credential already uses IPFS storage');
      }
      const encryptedData = credential.credential_data;
      const ipfsHash = await this.ipfsService.uploadEncryptedData(encryptedData);
      await this.ipfsService.pinData(ipfsHash);
      const kusamaReference = await this.kusamaService.storeCredentialReference(
        credential.user_address,
        ipfsHash,
        credential.credential_hash
      );
      await this.db.run(
        `UPDATE credentials SET
         ipfs_hash = ?,
         kusama_block_hash = ?,
         kusama_extrinsic_hash = ?,
         storage_type = ?,
         updated_at = ?
         WHERE id = ?`,
        [
          ipfsHash,
          kusamaReference.blockHash,
          kusamaReference.extrinsicHash,
          'hybrid',
          Date.now(),
          credentialId,
        ]
      );
      return (await this.getCredential(credentialId)) as HybridCredential;
    } catch (error) {
      logger.error('Failed to migrate credential to IPFS', { credentialId, error });
      throw error;
    }
  }
  async getStorageStats(): Promise<{
    totalCredentials: number;
    localStorage: number;
    ipfsStorage: number;
    hybridStorage: number;
    kusamaReferences: number;
  }> {
    try {
      const stats = await this.db.get(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN storage_type = 'local' THEN 1 ELSE 0 END) as local_count,
          SUM(CASE WHEN storage_type = 'ipfs' THEN 1 ELSE 0 END) as ipfs_count,
          SUM(CASE WHEN storage_type = 'hybrid' THEN 1 ELSE 0 END) as hybrid_count,
          SUM(CASE WHEN kusama_block_hash IS NOT NULL THEN 1 ELSE 0 END) as kusama_count
        FROM credentials
      `);
      return {
        totalCredentials: stats.total || 0,
        localStorage: stats.local_count || 0,
        ipfsStorage: stats.ipfs_count || 0,
        hybridStorage: stats.hybrid_count || 0,
        kusamaReferences: stats.kusama_count || 0,
      };
    } catch (error) {
      logger.error('Failed to get storage stats', { error });
      throw error;
    }
  }
  async createUserProfile(address: string, profile: Partial<UserProfile>): Promise<UserProfile> {
    return this.credentialService.createUserProfile(address, profile);
  }
  async getUserProfile(address: string): Promise<UserProfile | undefined> {
    return this.credentialService.getUserProfile(address);
  }
  async createCredentialType(
    creatorAddress: string,
    typeData: Omit<CredentialType, 'id' | 'created_at' | 'updated_at' | 'created_by'>
  ): Promise<CredentialType> {
    return this.credentialService.createCredentialType(creatorAddress, typeData);
  }
  async getCredentialType(id: string): Promise<CredentialType | undefined> {
    return this.credentialService.getCredentialType(id);
  }
  async getUserCredentials(userAddress: string): Promise<HybridCredential[]> {
    const credentials = await this.db.all<HybridCredential[]>(
      `SELECT *,
       ipfs_hash,
       kusama_block_hash,
       kusama_extrinsic_hash,
       storage_type
       FROM credentials WHERE user_address = ? ORDER BY created_at DESC`,
      [userAddress]
    );
    return (credentials || []).map(credential => {
      if (credential.kusama_block_hash && credential.kusama_extrinsic_hash) {
        credential.kusama_reference = {
          userAddress: credential.user_address,
          ipfsHash: credential.ipfs_hash || '',
          credentialHash: credential.credential_hash,
          timestamp: credential.created_at,
          blockHash: credential.kusama_block_hash,
          extrinsicHash: credential.kusama_extrinsic_hash,
        };
      }
      return credential;
    });
  }
  async shareCredential(
    ownerAddress: string,
    request: ShareCredentialRequest
  ): Promise<CredentialShare> {
    return this.credentialService.shareCredential(ownerAddress, request);
  }
  async getSharedCredentials(userAddress: string): Promise<CredentialShare[]> {
    return this.credentialService.getSharedCredentials(userAddress);
  }
  async verifyCredential(
    verifierAddress: string,
    request: VerifyCredentialRequest
  ): Promise<CredentialVerification> {
    return this.credentialService.verifyCredential(verifierAddress, request);
  }
  async createIssuanceRequest(
    requesterAddress: string,
    request: CreateIssuanceRequest
  ): Promise<IssuanceRequest> {
    return this.credentialService.createIssuanceRequest(requesterAddress, request);
  }
}
