import { Database } from 'sqlite';
import { CreateIssuanceRequest, Credential, CredentialShare, CredentialType, CredentialVerification, IssuanceRequest, ShareCredentialRequest, UserProfile, VerifyCredentialRequest } from '../types/auth';
import { CredentialService } from '../modules/credentials';
import { IPFSService } from './ipfsService';
import { CredentialReference, KusamaService } from './kusamaService';
export interface HybridCredential extends Credential {
    ipfs_hash?: string;
    kusama_reference?: CredentialReference;
    storage_type: 'local' | 'ipfs' | 'hybrid';
    kusama_block_hash?: string;
    kusama_extrinsic_hash?: string;
}
export declare class HybridCredentialService {
    private db;
    private credentialService;
    private ipfsService;
    private kusamaService;
    constructor(db: Database, credentialService: CredentialService, ipfsService: IPFSService, kusamaService: KusamaService);
    /**
     * Initialize the hybrid service
     */
    initialize(): Promise<void>;
    /**
     * Create a credential using hybrid storage approach
     */
    createCredential(issuerAddress: string, userAddress: string, request: HybridCredentialRequest): Promise<HybridCredential>;
    /**
     * Retrieve credential data from appropriate storage
     */
    getCredentialData(credentialId: string): Promise<Record<string, unknown> | null>;
    /**
     * Get credential with hybrid storage information
     */
    getCredential(id: string): Promise<HybridCredential | undefined>;
    /**
     * Verify credential integrity across all storage layers
     */
    verifyCredentialIntegrity(credentialId: string): Promise<{
        valid: boolean;
        localValid: boolean;
        ipfsValid: boolean;
        kusamaValid: boolean;
        errors: string[];
    }>;
    /**
     * Migrate credential from local to IPFS storage
     */
    migrateToIPFS(credentialId: string): Promise<HybridCredential>;
    /**
     * Get storage statistics
     */
    getStorageStats(): Promise<{
        totalCredentials: number;
        localStorage: number;
        ipfsStorage: number;
        hybridStorage: number;
        kusamaReferences: number;
    }>;
    createUserProfile(address: string, profile: Partial<UserProfile>): Promise<UserProfile>;
    getUserProfile(address: string): Promise<UserProfile | undefined>;
    createCredentialType(creatorAddress: string, typeData: Omit<CredentialType, 'id' | 'created_at' | 'updated_at' | 'created_by'>): Promise<CredentialType>;
    getCredentialType(id: string): Promise<CredentialType | undefined>;
    getUserCredentials(userAddress: string): Promise<HybridCredential[]>;
    shareCredential(ownerAddress: string, request: ShareCredentialRequest): Promise<CredentialShare>;
    getSharedCredentials(userAddress: string): Promise<CredentialShare[]>;
    verifyCredential(verifierAddress: string, request: VerifyCredentialRequest): Promise<CredentialVerification>;
    createIssuanceRequest(requesterAddress: string, request: CreateIssuanceRequest): Promise<IssuanceRequest>;
}
//# sourceMappingURL=hybridCredentialService.d.ts.map