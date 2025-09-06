import type { SubmittableExtrinsic } from '@polkadot/api/types';
export interface WalletCredentialData {
    credentialId: string;
    userAddress: string;
    credentialData: Record<string, unknown>;
    credentialType: string;
    timestamp: number;
    encryptedData: string;
    dataHash: string;
}
export interface WalletStorageResult {
    success: boolean;
    credentialId: string;
    transactionHash?: string;
    storageMethod: 'kusama_remarks' | 'kusama_extrinsic';
    userAddress: string;
    timestamp: number;
}
export declare class WalletBasedKusamaService {
    private api;
    private isConnected;
    private readonly endpoint;
    private availableProviders;
    constructor();
    initialize(): Promise<void>;
    storeCredentialWithWallet(userAddress: string, credentialData: Record<string, unknown>, credentialType: string, userSignature?: string, userMessage?: string): Promise<WalletStorageResult>;
    retrieveCredentialWithWallet(credentialId: string, userAddress: string, userSignature?: string): Promise<WalletCredentialData | null>;
    listCredentialsWithWallet(userAddress: string, userSignature?: string): Promise<WalletCredentialData[]>;
    estimateStorageCost(dataSize: number, userAddress: string): Promise<{
        estimatedCost: string;
        currency: string;
        storageMethod: string;
    }>;
    getNetworkHealth(): Promise<{
        isHealthy: boolean;
        details: Record<string, unknown>;
    }>;
    storeInKusamaRemarks(userAddress: string, credentialData: Record<string, unknown>, credentialType: string, userSignature?: string, userMessage?: string): Promise<{
        success: boolean;
        remarkHash: string;
        blockHash: string;
    }>;
    retrieveFromKusamaRemarks(remarkHash: string, userAddress: string): Promise<Record<string, unknown> | null>;
    validateCredentialSize(credentialData: Record<string, unknown>): {
        isValid: boolean;
        size: number;
        maxSize: number;
    };
    getUserNonce(userAddress: string): Promise<number>;
    createCredentialTransaction(userAddress: string, credentialData: Record<string, unknown>, credentialType: string, userSignature?: string, userMessage?: string): Promise<{
        extrinsic: SubmittableExtrinsic<'promise'>;
        nonce: number;
        tip: string;
    }>;
    submitSignedTransaction(signedExtrinsic: SubmittableExtrinsic<'promise'>, userAddress: string): Promise<{
        success: boolean;
        blockHash: string;
        txHash: string;
    }>;
    queryUserCredentials(userAddress: string, fromBlock?: number, toBlock?: number): Promise<Array<{
        blockNumber: number;
        remarkData: Record<string, unknown>;
    }>>;
    getAvailableWalletProviders(): string[];
    connectWallet(providerName: string): Promise<{
        success: boolean;
        address?: string;
        error?: string;
    }>;
    isWalletConnected(address: string): boolean;
    private getWalletConnection;
    disconnect(): Promise<void>;
}
//# sourceMappingURL=walletBasedKusamaService.d.ts.map