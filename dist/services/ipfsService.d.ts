export interface IPFSConfig {
    host: string;
    port: number;
    protocol: 'http' | 'https';
    apiPath?: string;
}
export declare class IPFSService {
    private ipfs;
    private config;
    constructor(config: IPFSConfig);
    private initializeIPFS;
    /**
     * Upload encrypted data to IPFS
     * @param encryptedData - The encrypted credential data
     * @returns IPFS hash (CID) of the uploaded data
     */
    uploadEncryptedData(encryptedData: string): Promise<string>;
    /**
     * Retrieve encrypted data from IPFS
     * @param ipfsHash - The IPFS hash (CID) of the data
     * @returns The encrypted data as a string
     */
    retrieveEncryptedData(ipfsHash: string): Promise<string>;
    /**
     * Check if data exists on IPFS
     * @param ipfsHash - The IPFS hash (CID) to check
     * @returns True if data exists, false otherwise
     */
    dataExists(ipfsHash: string): Promise<boolean>;
    /**
     * Pin data to IPFS to ensure it stays available
     * @param ipfsHash - The IPFS hash (CID) to pin
     */
    pinData(ipfsHash: string): Promise<void>;
    /**
     * Unpin data from IPFS
     * @param ipfsHash - The IPFS hash (CID) to unpin
     */
    unpinData(ipfsHash: string): Promise<void>;
    /**
     * Get IPFS node information
     * @returns Node information
     */
    getNodeInfo(): Promise<Record<string, unknown>>;
    /**
     * Test IPFS connection
     * @returns True if connection is successful
     */
    testConnection(): Promise<boolean>;
}
export declare const defaultIPFSConfig: IPFSConfig;
export declare const ipfsService: IPFSService;
//# sourceMappingURL=ipfsService.d.ts.map