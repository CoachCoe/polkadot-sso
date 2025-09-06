export interface KusamaCredential extends Record<string, unknown> {
    id: string;
    type: string;
    data: string;
    encrypted: boolean;
    hash: string;
    timestamp: number;
    address: string;
}
export interface KusamaStorageResult {
    success: boolean;
    transactionHash?: string;
    cost?: number;
    error?: string;
    credentialId?: string;
}
export declare class KusamaIntegrationService {
    private isInitialized;
    private logger;
    constructor();
    initialize(): Promise<boolean>;
    storeCredential(credentialData: Record<string, unknown>, credentialType: string, userAddress: string, encryptionKey?: string): Promise<KusamaStorageResult>;
    retrieveCredential(credentialId: string, userAddress: string, encryptionKey?: string): Promise<any>;
    getStorageCostEstimate(dataSize: number): Promise<number>;
    verifyCredential(credential: KusamaCredential): Promise<boolean>;
    listUserCredentials(userAddress: string): Promise<KusamaCredential[]>;
    getNetworkHealth(): Promise<{
        status: string;
        peers: number;
        latency: number;
    }>;
    getActiveMonitors(): Promise<string[]>;
    private generateHash;
    private encryptWithUserKey;
    private decryptWithUserKey;
    private getMockCredential;
    private getMockUserCredentials;
}
export declare const kusamaIntegrationService: KusamaIntegrationService;
//# sourceMappingURL=kusamaIntegrationService.d.ts.map