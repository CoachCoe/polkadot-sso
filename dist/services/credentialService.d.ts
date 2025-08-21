import { Database } from 'sqlite';
import { CreateCredentialRequest, CreateIssuanceRequest, Credential, CredentialRevocation, CredentialShare, CredentialType, CredentialVerification, IssuanceRequest, ShareCredentialRequest, UserProfile, VerifyCredentialRequest } from '../types/auth';
export declare class CredentialService {
    private db;
    constructor(db: Database);
    createUserProfile(address: string, profileData: Partial<UserProfile>): Promise<UserProfile>;
    getUserProfile(address: string): Promise<UserProfile | undefined>;
    updateUserProfile(address: string, updates: Partial<UserProfile>): Promise<void>;
    createCredentialType(creatorAddress: string, typeData: Omit<CredentialType, 'id' | 'created_at' | 'updated_at' | 'created_by'>): Promise<CredentialType>;
    getCredentialType(id: string): Promise<CredentialType | undefined>;
    getActiveCredentialTypes(): Promise<CredentialType[]>;
    createCredential(issuerAddress: string, userAddress: string, request: CreateCredentialRequest): Promise<Credential>;
    getCredential(id: string): Promise<Credential | undefined>;
    getUserCredentials(userAddress: string): Promise<Credential[]>;
    getCredentialData(credentialId: string): Promise<Record<string, unknown> | null>;
    shareCredential(ownerAddress: string, request: ShareCredentialRequest): Promise<CredentialShare>;
    getSharedCredentials(userAddress: string): Promise<CredentialShare[]>;
    revokeCredentialShare(shareId: string): Promise<void>;
    verifyCredential(verifierAddress: string, request: VerifyCredentialRequest): Promise<CredentialVerification>;
    getCredentialVerifications(credentialId: string): Promise<CredentialVerification[]>;
    revokeCredential(credentialId: string, revokedByAddress: string, reason?: string): Promise<CredentialRevocation>;
    createIssuanceRequest(requesterAddress: string, request: CreateIssuanceRequest): Promise<IssuanceRequest>;
    getPendingIssuanceRequests(issuerAddress: string): Promise<IssuanceRequest[]>;
    approveIssuanceRequest(requestId: string, approvedBy: string, issuedCredentialId?: string): Promise<void>;
    rejectIssuanceRequest(requestId: string, rejectedBy: string, reason: string): Promise<void>;
    cleanupExpiredCredentials(): Promise<void>;
}
//# sourceMappingURL=credentialService.d.ts.map