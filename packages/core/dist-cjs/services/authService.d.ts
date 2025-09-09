import type { AuthResult, Challenge, Session, SIWEMessage, SIWESignature } from '../types/index.js';
export interface AuthServiceConfig {
    challengeExpiration?: number;
    sessionExpiration?: number;
    enableNonce?: boolean;
    enableDomainBinding?: boolean;
    allowedDomains?: string[];
}
export declare class AuthService {
    private config;
    private challenges;
    private sessions;
    constructor(config?: AuthServiceConfig);
    /**
     * Create a new authentication challenge
     */
    createChallenge(clientId: string, userAddress?: string): Promise<Challenge>;
    /**
     * Verify a signature against a challenge
     */
    verifySignature(signature: SIWESignature, challenge: Challenge): Promise<AuthResult>;
    /**
     * Create a new session after successful authentication
     */
    createSession(address: string, clientId: string, parsedMessage: SIWEMessage): Promise<Session>;
    /**
     * Get a session by access token
     */
    getSession(accessToken: string): Promise<Session | null>;
    /**
     * Refresh a session using refresh token
     */
    refreshSession(refreshToken: string): Promise<Session | null>;
    /**
     * Invalidate a session
     */
    invalidateSession(sessionId: string): Promise<void>;
    /**
     * Clean up expired challenges and sessions
     */
    cleanup(): Promise<void>;
    /**
     * Create SIWE message
     */
    private createSIWEMessage;
    /**
     * Format SIWE message for signing
     */
    private formatSIWEMessage;
    /**
     * Verify signature cryptographically using Polkadot's signature verification
     *
     * This implementation uses @polkadot/util-crypto for proper signature verification
     * against the claimed Polkadot address.
     */
    private verifySignatureCryptographically;
    /**
     * Generate a unique ID
     */
    private generateId;
    /**
     * Generate a cryptographic nonce
     */
    private generateNonce;
    /**
     * Generate a secure token
     */
    private generateToken;
    /**
     * Generate a fingerprint for the session
     */
    private generateFingerprint;
}
export declare const authService: AuthService;
//# sourceMappingURL=authService.d.ts.map