interface EncryptionContext {
    purpose: 'credential' | 'session' | 'database' | 'kusama';
    version: string;
    timestamp: number;
    userId?: string;
    metadata?: Record<string, unknown>;
}
export declare class EnhancedEncryption {
    private static instance;
    private secretManager;
    private constructor();
    static getInstance(): EnhancedEncryption;
    private deriveKey;
    private generateHMAC;
    encryptData(data: string, context: EncryptionContext, additionalData?: string): Promise<string>;
    decryptData(encryptedDataString: string): Promise<{
        data: string;
        context: EncryptionContext;
    }>;
    encryptCredentialForKusama(credentialData: Record<string, unknown>, userAddress: string, _metadata?: Record<string, unknown>): Promise<string>;
    decryptCredentialFromKusama(encryptedData: string): Promise<Record<string, unknown>>;
    generateSecureRandom(length?: number): string;
    hashData(data: string, salt?: string): {
        hash: string;
        salt: string;
    };
    verifyHash(data: string, hash: string, salt: string): boolean;
}
export declare const enhancedEncryption: EnhancedEncryption;
export declare const encryptData: (_data: string) => never;
export declare const decryptData: (_data: string) => never;
export {};
//# sourceMappingURL=enhancedEncryption.d.ts.map