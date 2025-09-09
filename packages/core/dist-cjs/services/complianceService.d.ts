import { ComplianceCheck, KYCResult, RemittanceTransaction } from '../types/remittance';
export interface KYCProvider {
    verifyDocuments(documents: any): Promise<DocumentVerificationResult>;
    verifyIdentity(identity: any): Promise<IdentityVerificationResult>;
    screenUser(identity: any, address: any): Promise<AMLResult>;
}
export interface DocumentVerificationResult {
    isValid: boolean;
    confidence: number;
    documentType: string;
    extractedData: any;
}
export interface IdentityVerificationResult {
    isVerified: boolean;
    confidence: number;
    matchScore: number;
    livenessScore?: number;
}
export interface AMLResult {
    isClean: boolean;
    riskScore: number;
    sanctions: string[];
    pep: boolean;
    adverseMedia: string[];
}
export declare class ComplianceService {
    private kycProvider;
    private amlProvider;
    private riskThresholds;
    constructor(kycProvider?: KYCProvider, amlProvider?: KYCProvider);
    /**
     * Perform comprehensive KYC verification
     */
    performKYC(userId: string, documents: any): Promise<KYCResult>;
    /**
     * Monitor transaction for compliance
     */
    monitorTransaction(transaction: RemittanceTransaction): Promise<ComplianceCheck>;
    /**
     * Analyze transaction risk factors
     */
    private analyzeTransactionRisk;
    /**
     * Analyze transaction patterns
     */
    private analyzeTransactionPattern;
    /**
     * Calculate overall risk score from verification results
     */
    private calculateRiskScore;
    /**
     * Flag transaction for manual review
     */
    private flagForReview;
    /**
     * Get compliance status for user
     */
    getComplianceStatus(userId: string): Promise<{
        kycStatus: string;
        riskLevel: string;
        lastReview: Date;
        nextReview: Date;
    }>;
}
//# sourceMappingURL=complianceService.d.ts.map