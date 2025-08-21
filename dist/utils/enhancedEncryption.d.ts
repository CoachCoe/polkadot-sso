interface EncryptionContext {
    purpose: 'credential' | 'session' | 'database' | 'kusama';
    version: string;
    timestamp: number;
    userId?: string;
    metadata?: Record<string, unknown>;
}
/**
 * Enhanced encryption utility with key derivation and context-aware encryption
 */
export declare class EnhancedEncryption {
    private static instance;
    private secretManager;
    private constructor();
    static getInstance(): EnhancedEncryption;
    /**
     * Derive encryption key using PBKDF2 with salt
     */
    private deriveKey;
    /**
     * Generate HMAC for data integrity
     */
    private generateHMAC;
    /**
     * Enhanced encryption with context and integrity protection
     */
    encryptData(data: string, context: EncryptionContext, additionalData?: string): Promise<string>;
    /**
     * Enhanced decryption with integrity verification
     */
    decryptData(encryptedDataString: string): Promise<{
        data: string;
        context: EncryptionContext;
    }>;
    /**
     * Encrypt credential data specifically for Kusama storage
     */
    encryptCredentialForKusama(credentialData: Record<string, unknown>, userAddress: string, _metadata?: Record<string, unknown>): Promise<string>;
    /**
     * Decrypt credential data from Kusama storage
     */
    decryptCredentialFromKusama(encryptedData: string): Promise<Record<string, unknown>>;
    /**
     * Generate secure random data
     */
    generateSecureRandom(length?: number): string;
    /**
     * Hash data with salt for verification
     */
    hashData(data: string, salt?: string): {
        hash: string;
        salt: string;
    };
    /**
     * Verify data hash
     */
    verifyHash(data: string, hash: string, salt: string): boolean;
}
export declare const enhancedEncryption: EnhancedEncryption;
export declare const encryptData: (data: string) => never;
export declare const decryptData: (data: string) => never;
export {};
//# sourceMappingURL=enhancedEncryption.d.ts.map