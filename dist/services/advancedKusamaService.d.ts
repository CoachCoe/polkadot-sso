export interface KusamaConfig {
    endpoint: string;
    accountSeed?: string;
    accountType?: 'sr25519' | 'ed25519' | 'ecdsa';
}
export interface EncryptedCredentialData {
    userAddress: string;
    encryptedData: string;
    dataHash: string;
    timestamp: number;
    blockHash: string;
    extrinsicHash: string;
    storageMethod: 'remark' | 'batch' | 'custom_pallet';
}
export declare class AdvancedKusamaService {
    private api;
    private keyring;
    private account;
    private config;
    private isConnected;
    constructor(config: KusamaConfig);
    /**
     * Initialize connection to Kusama network
     */
    initialize(): Promise<void>;
    /**
     * Method 1: Store encrypted data in Kusama remarks (limited size)
     */
    storeEncryptedDataInRemarks(userAddress: string, credentialData: Record<string, unknown>): Promise<EncryptedCredentialData>;
    /**
     * Method 2: Store encrypted data using batch calls (more efficient)
     */
    storeEncryptedDataInBatch(userAddress: string, credentialData: Record<string, unknown>): Promise<EncryptedCredentialData>;
    /**
     * Method 3: Store encrypted data using custom pallet (most efficient)
     * Note: This requires a custom pallet to be deployed on Kusama
     */
    storeEncryptedDataInCustomPallet(userAddress: string, credentialData: Record<string, unknown>): Promise<EncryptedCredentialData>;
    /**
     * Retrieve encrypted data from Kusama
     */
    retrieveEncryptedData(userAddress: string, dataHash: string, storageMethod: 'remark' | 'batch' | 'custom_pallet'): Promise<Record<string, unknown> | null>;
    /**
     * Verify encrypted data exists on Kusama
     */
    verifyEncryptedData(userAddress: string, dataHash: string, storageMethod: 'remark' | 'batch' | 'custom_pallet'): Promise<boolean>;
    /**
     * Get storage cost estimate
     */
    getStorageCostEstimate(dataSize: number, storageMethod: 'remark' | 'batch' | 'custom_pallet'): Promise<{
        estimatedCost: string;
        transactionCount: number;
        storageMethod: string;
    }>;
    /**
     * Split data into chunks for storage
     */
    private splitIntoChunks;
    /**
     * Disconnect from Kusama network
     */
    disconnect(): Promise<void>;
}
export declare const defaultAdvancedKusamaConfig: KusamaConfig;
export declare const advancedKusamaService: AdvancedKusamaService;
//# sourceMappingURL=advancedKusamaService.d.ts.map