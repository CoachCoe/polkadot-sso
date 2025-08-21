import { Request } from 'express';
export interface PKCEChallenge {
    code_verifier: string;
    code_challenge: string;
    state: string;
}
export interface Challenge extends PKCEChallenge {
    id: string;
    message: string;
    client_id: string;
    created_at: number;
    expires_at: number;
    used: boolean;
}
export interface Session {
    id: string;
    address: string;
    client_id: string;
    access_token: string;
    refresh_token: string;
    access_token_id: string;
    refresh_token_id: string;
    fingerprint: string;
    access_token_expires_at: number;
    refresh_token_expires_at: number;
    created_at: number;
    last_used_at: number;
    is_active: boolean;
}
export interface Client {
    client_id: string;
    name: string;
    redirect_url: string;
    allowed_origins: string[];
}
export interface TokenPayload {
    address: string;
    client_id: string;
    type: 'access' | 'refresh';
    jti: string;
    fingerprint: string;
    iat?: number;
    exp?: number;
    aud?: string;
    iss?: string;
}
export interface UserProfile {
    id: string;
    address: string;
    display_name?: string;
    email?: string;
    avatar_url?: string;
    bio?: string;
    website?: string;
    location?: string;
    timezone?: string;
    preferences?: string;
    created_at: number;
    updated_at: number;
    last_login_at?: number;
    is_verified: boolean;
    verification_level: number;
}
export interface CredentialType {
    id: string;
    name: string;
    description?: string;
    schema_version: string;
    schema_definition: string;
    issuer_pattern?: string;
    required_fields: string;
    optional_fields: string;
    validation_rules: string;
    is_active: boolean;
    created_at: number;
    updated_at: number;
    created_by: string;
}
export interface Credential {
    id: string;
    user_address: string;
    credential_type_id: string;
    issuer_address: string;
    issuer_name?: string;
    credential_data: string;
    credential_hash: string;
    proof_signature?: string;
    proof_type?: string;
    status: 'active' | 'revoked' | 'expired' | 'pending';
    issued_at: number;
    expires_at?: number;
    created_at: number;
    updated_at: number;
    metadata?: string;
}
export interface CredentialShare {
    id: string;
    credential_id: string;
    owner_address: string;
    shared_with_address: string;
    shared_with_client_id?: string;
    permissions: string;
    access_level: 'read' | 'write' | 'admin';
    expires_at?: number;
    created_at: number;
    created_by: string;
    is_active: boolean;
}
export interface CredentialVerification {
    id: string;
    credential_id: string;
    verifier_address: string;
    verification_type: 'proof' | 'signature' | 'manual' | 'automated';
    verification_data?: string;
    verification_signature?: string;
    status: 'verified' | 'failed' | 'pending' | 'expired';
    verified_at?: number;
    expires_at?: number;
    created_at: number;
    notes?: string;
}
export interface CredentialTemplate {
    id: string;
    name: string;
    description?: string;
    credential_type_id: string;
    template_data: string;
    issuer_address: string;
    is_public: boolean;
    usage_count: number;
    created_at: number;
    updated_at: number;
    created_by: string;
}
export interface IssuanceRequest {
    id: string;
    requester_address: string;
    issuer_address: string;
    credential_type_id: string;
    template_id?: string;
    request_data: string;
    status: 'pending' | 'approved' | 'rejected' | 'issued';
    approved_at?: number;
    rejected_at?: number;
    rejection_reason?: string;
    issued_credential_id?: string;
    created_at: number;
    updated_at: number;
    expires_at?: number;
}
export interface CredentialRevocation {
    id: string;
    credential_id: string;
    revoked_by_address: string;
    revocation_reason?: string;
    revocation_signature?: string;
    revoked_at: number;
    created_at: number;
}
export interface RequestWithId extends Request {
    id: string;
}
export interface CreateCredentialRequest {
    credential_type_id: string;
    credential_data: Record<string, unknown>;
    expires_at?: number;
    metadata?: Record<string, unknown>;
}
export interface HybridCredentialRequest extends CreateCredentialRequest {
    storage_preference?: 'local' | 'ipfs' | 'hybrid';
    pin_to_ipfs?: boolean;
    store_on_kusama?: boolean;
    issuer_name?: string;
    proof_signature?: string;
    proof_type?: string;
}
export interface ShareCredentialRequest {
    credential_id: string;
    shared_with_address: string;
    shared_with_client_id?: string;
    permissions: string[];
    access_level: 'read' | 'write' | 'admin';
    expires_at?: number;
}
export interface VerifyCredentialRequest {
    credential_id: string;
    verification_type: 'proof' | 'signature' | 'manual' | 'automated';
    verification_data?: Record<string, unknown>;
    notes?: string;
}
export interface CreateIssuanceRequest {
    issuer_address: string;
    credential_type_id: string;
    template_id?: string;
    request_data: Record<string, unknown>;
    expires_at?: number;
}
export interface UpdateUserProfileRequest {
    display_name?: string;
    email?: string;
    avatar_url?: string;
    bio?: string;
    website?: string;
    location?: string;
    timezone?: string;
    preferences?: Record<string, unknown>;
}
//# sourceMappingURL=auth.d.ts.map