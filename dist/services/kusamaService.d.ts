export interface KusamaConfig {
    endpoint: string;
    accountSeed?: string;
    accountType?: 'sr25519' | 'ed25519' | 'ecdsa';
}
export interface CredentialReference {
    userAddress: string;
    ipfsHash: string;
    credentialHash: string;
    timestamp: number;
    blockHash: string;
    extrinsicHash: string;
}
export declare class KusamaService {
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
     * Store credential reference on Kusama blockchain
     * @param userAddress - Polkadot address of the credential owner
     * @param ipfsHash - IPFS hash of the encrypted credential data
     * @param credentialHash - Hash of the credential for integrity verification
     * @returns Transaction hash and block information
     */
    storeCredentialReference(userAddress: string, ipfsHash: string, credentialHash: string): Promise<CredentialReference>;
    /**
     * Retrieve credential references for a user from Kusama blockchain
     * @param userAddress - Polkadot address to search for
     * @param fromBlock - Optional starting block number
     * @returns Array of credential references
     */
    getCredentialReferences(userAddress: string, fromBlock?: number): Promise<CredentialReference[]>;
    /**
     * Verify credential reference exists on Kusama
     * @param ipfsHash - IPFS hash to verify
     * @param credentialHash - Credential hash to verify
     * @returns True if reference exists, false otherwise
     */
    verifyCredentialReference(ipfsHash: string, credentialHash: string): Promise<boolean>;
    /**
     * Get Kusama network information
     * @returns Network information
     */
    getNetworkInfo(): Promise<any>;
    /**
     * Test Kusama connection
     * @returns True if connection is successful
     */
    testConnection(): Promise<boolean>;
    /**
     * Disconnect from Kusama network
     */
    disconnect(): Promise<void>;
}
export declare const defaultKusamaConfig: KusamaConfig;
export declare const kusamaService: KusamaService;
//# sourceMappingURL=kusamaService.d.ts.map