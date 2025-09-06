import { ApiPromise } from '@polkadot/api';
import { SubmittableExtrinsic } from '@polkadot/api/types';
import { ISubmittableResult } from '@polkadot/types/types';
export interface TransactionResult {
    success: boolean;
    blockHash?: string;
    txHash?: string;
    error?: string;
    extrinsicHash?: string;
}
export interface CredentialTransaction {
    extrinsic: SubmittableExtrinsic<'promise', ISubmittableResult>;
    nonce: number;
    tip: string;
    estimatedFee: string;
}
export declare class RealTransactionService {
    private api;
    private availableProviders;
    private walletService;
    constructor(api: ApiPromise);
    private isWalletConnected;
    createCredentialTransaction(userAddress: string, credentialData: Record<string, unknown>, credentialType: string): Promise<CredentialTransaction>;
    private validateKusamaAddress;
    private validateCredentialData;
    signAndSubmitTransaction(userAddress: string, transaction: CredentialTransaction): Promise<TransactionResult>;
    private submitTransaction;
    private getUserNonce;
    private estimateTransactionFee;
    private createRemarkData;
    private generateMockHash;
    getTransactionStatus(txHash: string): Promise<{
        status: 'pending' | 'inBlock' | 'finalized' | 'failed';
        blockHash?: string;
        error?: string;
    }>;
    waitForTransactionConfirmation(txHash: string, timeoutMs?: number): Promise<TransactionResult>;
}
//# sourceMappingURL=realTransactionService.d.ts.map