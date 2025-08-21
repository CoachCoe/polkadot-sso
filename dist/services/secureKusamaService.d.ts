export interface SecureKusamaConfig {
    endpoint: string;
    accountSeed?: string;
    accountType?: 'sr25519' | 'ed25519' | 'ecdsa';
    maxRetries: number;
    timeout: number;
    enableAuditLogging: boolean;
}
export interface SecureCredentialData {
    userAddress: string;
    encryptedData: string;
    dataHash: string;
    integrityHash: string;
    timestamp: number;
    blockHash: string;
    extrinsicHash: string;
    storageMethod: 'remark' | 'batch' | 'custom_pallet';
    version: string;
    metadata?: Record<string, unknown>;
}
export interface StorageValidation {
    valid: boolean;
    localValid: boolean;
    kusamaValid: boolean;
    integrityValid: boolean;
    errors: string[];
    warnings: string[];
}
/**
 * Secure Kusama service with enhanced security features
 */
export declare class SecureKusamaService {
    private api;
    private keyring;
    private account;
    private config;
    private isConnected;
    private secretManager;
    private retryCount;
    constructor(config: SecureKusamaConfig);
    /**
     * Initialize secure connection to Kusama network
     */
    initialize(): Promise<void>;
    /**
     * Validate configuration security
     */
    private validateConfig;
    /**
     * Initialize account with security checks
     */
    private initializeAccount;
    /**
     * Securely store encrypted credential data
     */
    storeCredentialSecurely(userAddress: string, credentialData: Record<string, unknown>, storageMethod?: 'remark' | 'batch' | 'custom_pallet', metadata?: Record<string, unknown>): Promise<SecureCredentialData>;
    /**
     * Store data using remarks with retry logic
     */
    private storeInRemarks;
    /**
     * Store data using batch transactions
     */
    private storeInBatch;
    /**
     * Store data using custom pallet (simulated)
     */
    private storeInCustomPallet;
    /**
     * Retrieve and validate credential data
     */
    retrieveCredentialSecurely(userAddress: string, dataHash: string, storageMethod: 'remark' | 'batch' | 'custom_pallet'): Promise<Record<string, unknown> | null>;
    /**
     * Validate credential data structure
     */
    private validateCredentialStructure;
    /**
     * Comprehensive validation of stored credential
     */
    validateCredentialIntegrity(userAddress: string, dataHash: string, storageMethod: 'remark' | 'batch' | 'custom_pallet'): Promise<StorageValidation>;
    /**
     * Execute operation with retry logic
     */
    private executeWithRetry;
    /**
     * Validate Kusama address format
     */
    private validateKusamaAddress;
    /**
     * Split data into chunks
     */
    private splitIntoChunks;
    /**
     * Retrieve data from Kusama (implementation similar to previous service)
     */
    private retrieveFromKusama;
    /**
     * Disconnect securely
     */
    disconnect(): Promise<void>;
}
export declare const defaultSecureKusamaConfig: SecureKusamaConfig;
export declare const secureKusamaService: SecureKusamaService;
//# sourceMappingURL=secureKusamaService.d.ts.map