import { Credential, CredentialType } from '../types/credential';
/**
 * Generate a unique credential ID
 */
export declare function generateCredentialId(): string;
/**
 * Generate a credential hash for integrity verification
 */
export declare function generateCredentialHash(data: Record<string, unknown>): string;
/**
 * Validate credential data against schema
 */
export declare function validateCredentialData(data: Record<string, unknown>, credentialType: CredentialType): {
    valid: boolean;
    errors: string[];
};
/**
 * Check if credential is expired
 */
export declare function isCredentialExpired(credential: Credential): boolean;
/**
 * Check if credential is active
 */
export declare function isCredentialActive(credential: Credential): boolean;
/**
 * Format credential for display
 */
export declare function formatCredentialForDisplay(credential: Credential): {
    id: string;
    type: string;
    status: string;
    issuedAt: string;
    expiresAt?: string;
    isActive: boolean;
};
/**
 * Generate credential summary for sharing
 */
export declare function generateCredentialSummary(credential: Credential): {
    id: string;
    type: string;
    status: string;
    issuedAt: string;
    expiresAt?: string;
};
//# sourceMappingURL=credentialUtils.d.ts.map