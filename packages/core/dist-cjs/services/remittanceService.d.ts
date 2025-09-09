import { ClaimResult, RemittanceTransaction } from '../types/remittance';
import { RemittanceAuthService } from './remittanceAuthService';
export declare class RemittanceService {
    private authService;
    private exchangeRateService;
    private transactions;
    private claimLinks;
    constructor(authService: RemittanceAuthService, exchangeRateConfig?: any);
    /**
     * Create a new remittance transaction
     */
    createRemittanceTransaction(senderId: string, recipientContact: string, amount: number, targetCurrency: 'ARS' | 'BRL' | 'USD'): Promise<RemittanceTransaction>;
    /**
     * Claim a remittance transaction
     */
    claimRemittance(claimLink: string, recipientAuth: any): Promise<ClaimResult>;
    /**
     * Get transaction history for a user
     */
    getUserTransactions(userId: string): Promise<RemittanceTransaction[]>;
    /**
     * Get transaction by ID
     */
    getTransaction(transactionId: string): Promise<RemittanceTransaction | null>;
    /**
     * Get transaction by claim link
     */
    getTransactionByClaimLink(claimLink: string): Promise<RemittanceTransaction | null>;
    /**
     * Check if transaction is within limits
     */
    private checkTransactionLimits;
    /**
     * Calculate fees for a transaction
     */
    private calculateFees;
    /**
     * Get exchange rate between currencies using real-time data
     */
    private getExchangeRate;
    /**
     * Perform compliance check on transaction
     */
    private performComplianceCheck;
    /**
     * Process claim for recipient
     */
    private processClaim;
    /**
     * Authenticate recipient
     */
    private authenticateRecipient;
    /**
     * Initiate on-chain transaction
     */
    private initiateOnChainTransaction;
    /**
     * Store transaction in database
     */
    private storeTransaction;
    /**
     * Update transaction in database
     */
    private updateTransaction;
    /**
     * Get multiple exchange rates at once
     */
    getExchangeRates(from: string, toCurrencies: string[]): Promise<Record<string, number>>;
    /**
     * Clear exchange rate cache
     */
    clearExchangeRateCache(): void;
    /**
     * Get exchange rate cache statistics
     */
    getExchangeRateCacheStats(): {
        size: number;
        entries: Array<{
            key: string;
            age: number;
        }>;
    };
    /**
     * Generate unique transaction ID
     */
    private generateTransactionId;
    /**
     * Generate unique claim link
     */
    private generateClaimLink;
    /**
     * Generate reference number
     */
    private generateReference;
}
//# sourceMappingURL=remittanceService.d.ts.map