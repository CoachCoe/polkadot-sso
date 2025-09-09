import { ComplianceCheck, KYCResult, RemittanceTransaction } from '../types/remittance';
import { ErrorService } from './errorService';

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

export class ComplianceService {
  private kycProvider: KYCProvider;
  private amlProvider: KYCProvider;
  private riskThresholds = {
    low: 0.3,
    medium: 0.6,
    high: 0.8,
  };

  constructor(kycProvider?: KYCProvider, amlProvider?: KYCProvider) {
    this.kycProvider = kycProvider || new MockKYCProvider();
    this.amlProvider = amlProvider || new MockAMLProvider();
  }

  /**
   * Perform comprehensive KYC verification
   */
  async performKYC(userId: string, documents: any): Promise<KYCResult> {
    try {
      // 1. Document verification
      const docResult = await this.kycProvider.verifyDocuments(documents);
      if (!docResult.isValid) {
        return {
          status: 'rejected',
          riskScore: 1.0,
          requiredActions: ['DOCUMENT_VERIFICATION_FAILED'],
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        };
      }

      // 2. Identity verification
      const identityResult = await this.kycProvider.verifyIdentity(documents.identity);
      if (!identityResult.isVerified) {
        return {
          status: 'rejected',
          riskScore: 0.9,
          requiredActions: ['IDENTITY_VERIFICATION_FAILED'],
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        };
      }

      // 3. AML screening
      const amlResult = await this.amlProvider.screenUser(documents.identity, documents.address);

      // 4. Calculate overall risk score
      const riskScore = await this.calculateRiskScore(docResult, identityResult, amlResult);

      // 5. Determine KYC status
      let status: 'pending' | 'verified' | 'rejected';
      let requiredActions: string[] = [];

      if (riskScore < this.riskThresholds.low) {
        status = 'verified';
      } else if (riskScore < this.riskThresholds.medium) {
        status = 'pending';
        requiredActions = ['MANUAL_REVIEW'];
      } else {
        status = 'rejected';
        requiredActions = ['HIGH_RISK_DETECTED'];
      }

      // Add specific actions based on AML results
      if (amlResult.sanctions.length > 0) {
        status = 'rejected';
        requiredActions.push('SANCTIONS_MATCH');
      }

      if (amlResult.pep) {
        requiredActions.push('PEP_DETECTED');
      }

      if (amlResult.adverseMedia.length > 0) {
        requiredActions.push('ADVERSE_MEDIA');
      }

      return {
        status,
        riskScore,
        requiredActions,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      };
    } catch (error) {
      console.error('KYC verification failed:', error);
      throw ErrorService.createError('KYC_FAILED', 'KYC verification failed');
    }
  }

  /**
   * Monitor transaction for compliance
   */
  async monitorTransaction(transaction: RemittanceTransaction): Promise<ComplianceCheck> {
    try {
      const riskFactors = await this.analyzeTransactionRisk(transaction);

      if (riskFactors.score > this.riskThresholds.high) {
        // Flag for manual review
        await this.flagForReview(transaction);
        return {
          passed: false,
          riskScore: riskFactors.score,
          flags: riskFactors.flags,
          requiredActions: ['MANUAL_REVIEW', 'ENHANCED_DUE_DILIGENCE'],
        };
      }

      if (riskFactors.score > this.riskThresholds.medium) {
        return {
          passed: true,
          riskScore: riskFactors.score,
          flags: riskFactors.flags,
          requiredActions: ['ENHANCED_MONITORING'],
        };
      }

      return {
        passed: true,
        riskScore: riskFactors.score,
        flags: [],
        requiredActions: [],
      };
    } catch (error) {
      console.error('Transaction monitoring failed:', error);
      throw ErrorService.createError(
        'COMPLIANCE_MONITORING_FAILED',
        'Transaction monitoring failed'
      );
    }
  }

  /**
   * Analyze transaction risk factors
   */
  private async analyzeTransactionRisk(transaction: RemittanceTransaction): Promise<{
    score: number;
    flags: string[];
  }> {
    let riskScore = 0;
    const flags: string[] = [];

    // Amount-based risk
    if (transaction.amount > 10000) {
      riskScore += 0.3;
      flags.push('HIGH_AMOUNT');
    } else if (transaction.amount > 5000) {
      riskScore += 0.2;
      flags.push('MEDIUM_AMOUNT');
    }

    // Currency risk
    if (transaction.targetCurrency === 'ARS' && transaction.amount > 5000) {
      riskScore += 0.1;
      flags.push('HIGH_VOLUME_ARS');
    }

    // Time-based risk (weekend/holiday transactions)
    const now = new Date();
    const dayOfWeek = now.getDay();
    const hour = now.getHours();

    if (dayOfWeek === 0 || dayOfWeek === 6) {
      // Weekend
      riskScore += 0.1;
      flags.push('WEEKEND_TRANSACTION');
    }

    if (hour < 6 || hour > 22) {
      // Off-hours
      riskScore += 0.1;
      flags.push('OFF_HOURS_TRANSACTION');
    }

    // Pattern analysis (would integrate with historical data)
    const patternRisk = await this.analyzeTransactionPattern(transaction);
    riskScore += patternRisk.score;
    flags.push(...patternRisk.flags);

    return { score: Math.min(riskScore, 1.0), flags };
  }

  /**
   * Analyze transaction patterns
   */
  private async analyzeTransactionPattern(transaction: RemittanceTransaction): Promise<{
    score: number;
    flags: string[];
  }> {
    // Mock pattern analysis
    // In production, this would analyze historical transaction data
    let score = 0;
    const flags: string[] = [];

    // Simulate pattern checks
    const random = Math.random();
    if (random > 0.8) {
      score += 0.2;
      flags.push('UNUSUAL_PATTERN');
    }

    return { score, flags };
  }

  /**
   * Calculate overall risk score from verification results
   */
  private async calculateRiskScore(
    docResult: DocumentVerificationResult,
    identityResult: IdentityVerificationResult,
    amlResult: AMLResult
  ): Promise<number> {
    let riskScore = 0;

    // Document verification weight: 20%
    riskScore += (1 - docResult.confidence) * 0.2;

    // Identity verification weight: 30%
    riskScore += (1 - identityResult.confidence) * 0.3;

    // AML screening weight: 50%
    riskScore += amlResult.riskScore * 0.5;

    return Math.min(riskScore, 1.0);
  }

  /**
   * Flag transaction for manual review
   */
  private async flagForReview(transaction: RemittanceTransaction): Promise<void> {
    // In production, this would create a review ticket in your compliance system
    console.log(`Flagging transaction ${transaction.id} for manual review`);
  }

  /**
   * Get compliance status for user
   */
  async getComplianceStatus(userId: string): Promise<{
    kycStatus: string;
    riskLevel: string;
    lastReview: Date;
    nextReview: Date;
  }> {
    // Mock implementation
    return {
      kycStatus: 'verified',
      riskLevel: 'low',
      lastReview: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      nextReview: new Date(Date.now() + 335 * 24 * 60 * 60 * 1000),
    };
  }
}

/**
 * Mock KYC Provider for development/testing
 */
class MockKYCProvider implements KYCProvider {
  async verifyDocuments(documents: any): Promise<DocumentVerificationResult> {
    // Mock document verification
    return {
      isValid: true,
      confidence: 0.95,
      documentType: 'passport',
      extractedData: {
        name: 'John Doe',
        documentNumber: 'A1234567',
        expiryDate: '2030-12-31',
      },
    };
  }

  async verifyIdentity(identity: any): Promise<IdentityVerificationResult> {
    // Mock identity verification
    return {
      isVerified: true,
      confidence: 0.92,
      matchScore: 0.95,
      livenessScore: 0.98,
    };
  }

  async screenUser(identity: any, address: any): Promise<AMLResult> {
    // Mock AML screening
    return {
      isClean: true,
      riskScore: 0.1,
      sanctions: [],
      pep: false,
      adverseMedia: [],
    };
  }
}

/**
 * Mock AML Provider for development/testing
 */
class MockAMLProvider implements KYCProvider {
  async verifyDocuments(documents: any): Promise<DocumentVerificationResult> {
    return {
      isValid: true,
      confidence: 0.95,
      documentType: 'passport',
      extractedData: {},
    };
  }

  async verifyIdentity(identity: any): Promise<IdentityVerificationResult> {
    return {
      isVerified: true,
      confidence: 0.92,
      matchScore: 0.95,
    };
  }

  async screenUser(identity: any, address: any): Promise<AMLResult> {
    return {
      isClean: true,
      riskScore: 0.1,
      sanctions: [],
      pep: false,
      adverseMedia: [],
    };
  }
}
