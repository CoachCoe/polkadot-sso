import { CreateCredentialRequest, CreateIssuanceRequest, Credential, CredentialRevocation, CredentialShare, CredentialType, CredentialVerification, IssuanceRequest, ShareCredentialRequest, UserProfile, VerifyCredentialRequest } from '../types/credential';
interface CreateCredentialTypeRequest {
    name: string;
    description?: string;
    schema_version: string;
    schema_definition: Record<string, unknown>;
    issuer_pattern?: string;
    required_fields: string[];
    optional_fields: string[];
    validation_rules: Record<string, unknown>;
    created_by: string;
}
export declare class CredentialService {
    constructor();
    createUserProfile(address: string, profileData: Partial<UserProfile>): Promise<UserProfile>;
    getUserProfile(address: string): Promise<UserProfile | undefined>;
    updateUserProfile(address: string, updates: Partial<UserProfile>): Promise<void>;
    createCredentialType(typeData: CreateCredentialTypeRequest): Promise<CredentialType>;
    getCredentialType(typeId: string): Promise<CredentialType | undefined>;
    getActiveCredentialTypes(): Promise<CredentialType[]>;
    createCredential(userAddress: string, issuerAddress: string, request: CreateCredentialRequest): Promise<Credential>;
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
    getCredentialStats(): Promise<{
        total: number;
        active: number;
        revoked: number;
        expired: number;
        by_type: Record<string, number>;
    }>;
}
export {};
//# sourceMappingURL=credentialService.d.ts.map