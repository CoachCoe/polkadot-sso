import {
  ClaimResult,
  ComplianceCheck,
  ExchangeRate,
  FeeBreakdown,
  RemittanceTransaction,
  RemittanceUser,
} from '../types/remittance';
import { ErrorService } from './errorService';
import { RemittanceAuthService } from './remittanceAuthService';

export class RemittanceService {
  private authService: RemittanceAuthService;
  private exchangeRates: Map<string, ExchangeRate> = new Map();
  private transactions: Map<string, RemittanceTransaction> = new Map();
  private claimLinks: Map<string, string> = new Map(); // claimLink -> transactionId

  constructor(authService: RemittanceAuthService) {
    this.authService = authService;
    this.initializeExchangeRates();
  }

  /**
   * Create a new remittance transaction
   */
  async createRemittanceTransaction(
    senderId: string,
    recipientContact: string,
    amount: number,
    targetCurrency: 'ARS' | 'BRL' | 'USD'
  ): Promise<RemittanceTransaction> {
    try {
      // 1. Validate sender and custody level
      const sender = await this.authService.getRemittanceUser(senderId);
      if (!sender) {
        throw ErrorService.createError('SENDER_NOT_FOUND', 'Sender not found');
      }

      // 2. Check transaction limits
      const canTransact = await this.checkTransactionLimits(senderId, amount, sender.custodyLevel);

      if (!canTransact) {
        throw ErrorService.createError(
          'LIMIT_EXCEEDED',
          'Transaction exceeds limits for custody level'
        );
      }

      // 3. Get exchange rate
      const exchangeRate = await this.getExchangeRate('USD', targetCurrency);
      if (!exchangeRate) {
        throw ErrorService.createError('EXCHANGE_RATE_UNAVAILABLE', 'Exchange rate not available');
      }

      // 4. Calculate fees
      const fees = await this.calculateFees(amount, sender.custodyLevel);

      // 5. Perform compliance check
      const complianceCheck = await this.performComplianceCheck(sender, recipientContact, amount);

      if (!complianceCheck.passed) {
        throw ErrorService.createError('COMPLIANCE_FAILED', 'Transaction failed compliance check');
      }

      // 6. Create transaction record
      const transaction: RemittanceTransaction = {
        id: this.generateTransactionId(),
        senderId,
        recipientContact,
        amount,
        currency: 'USD',
        targetCurrency,
        status: 'pending',
        claimLink: this.generateClaimLink(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        fees,
        exchangeRate: exchangeRate.rate,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // 7. Store transaction
      await this.storeTransaction(transaction);

      // 8. Initiate on-chain transaction
      const txHash = await this.initiateOnChainTransaction(transaction);
      transaction.onChainTxHash = txHash;
      transaction.status = 'processing';

      // 9. Update transaction with on-chain hash
      await this.updateTransaction(transaction);

      return transaction;
    } catch (error) {
      console.error('Failed to create remittance transaction:', error);
      throw error;
    }
  }

  /**
   * Claim a remittance transaction
   */
  async claimRemittance(claimLink: string, recipientAuth: any): Promise<ClaimResult> {
    try {
      // 1. Validate claim link
      const transaction = await this.getTransactionByClaimLink(claimLink);
      if (!transaction) {
        throw ErrorService.createError('INVALID_CLAIM_LINK', 'Invalid claim link');
      }

      if (transaction.expiresAt < new Date()) {
        throw ErrorService.createError('CLAIM_EXPIRED', 'Claim link has expired');
      }

      if (transaction.status !== 'processing') {
        throw ErrorService.createError('INVALID_STATUS', 'Transaction is not in a claimable state');
      }

      // 2. Authenticate recipient
      const recipient = await this.authenticateRecipient(
        transaction.recipientContact,
        recipientAuth
      );

      if (!recipient) {
        throw ErrorService.createError('RECIPIENT_AUTH_FAILED', 'Recipient authentication failed');
      }

      // 3. Process claim based on recipient's preferences
      const claimResult = await this.processClaim(transaction, recipient);

      // 4. Update transaction status
      transaction.status = 'completed';
      transaction.recipientId = recipient.id;
      transaction.updatedAt = new Date();
      await this.updateTransaction(transaction);

      return claimResult;
    } catch (error) {
      console.error('Failed to claim remittance:', error);
      throw error;
    }
  }

  /**
   * Get transaction history for a user
   */
  async getUserTransactions(userId: string): Promise<RemittanceTransaction[]> {
    const userTransactions: RemittanceTransaction[] = [];

    for (const transaction of this.transactions.values()) {
      if (transaction.senderId === userId || transaction.recipientId === userId) {
        userTransactions.push(transaction);
      }
    }

    return userTransactions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Get transaction by ID
   */
  async getTransaction(transactionId: string): Promise<RemittanceTransaction | null> {
    return this.transactions.get(transactionId) || null;
  }

  /**
   * Get transaction by claim link
   */
  async getTransactionByClaimLink(claimLink: string): Promise<RemittanceTransaction | null> {
    const transactionId = this.claimLinks.get(claimLink);
    if (!transactionId) {
      return null;
    }
    return this.getTransaction(transactionId);
  }

  /**
   * Check if transaction is within limits
   */
  private async checkTransactionLimits(
    userId: string,
    amount: number,
    custodyLevel: number
  ): Promise<boolean> {
    const userTransactions = await this.getUserTransactions(userId);
    const limits = this.authService.getCustodyLevelConfig(custodyLevel)?.limits;

    if (!limits) {
      return true; // No limits for self-custody
    }

    // Check daily limit
    const today = new Date().toISOString().split('T')[0];
    const todayAmount = userTransactions
      .filter(tx => tx.createdAt.toISOString().split('T')[0] === today)
      .reduce((sum, tx) => sum + tx.amount, 0);

    if (todayAmount + amount > limits.daily) {
      return false;
    }

    // Check monthly limit
    const thisMonth = new Date().toISOString().substring(0, 7);
    const monthAmount = userTransactions
      .filter(tx => tx.createdAt.toISOString().substring(0, 7) === thisMonth)
      .reduce((sum, tx) => sum + tx.amount, 0);

    if (monthAmount + amount > limits.monthly) {
      return false;
    }

    // Check per-transaction limit
    if (amount > limits.perTransaction) {
      return false;
    }

    return true;
  }

  /**
   * Calculate fees for a transaction
   */
  private async calculateFees(amount: number, custodyLevel: number): Promise<FeeBreakdown> {
    const config = this.authService.getRemittanceConfig();
    const { baseFee, custodyDiscount, minFee, networkFee, exchangeFee } = config.feeStructure;

    const discount = custodyLevel * custodyDiscount;
    const finalFee = Math.max(baseFee - discount, minFee);

    const platformFee = amount * finalFee;
    const total = platformFee + networkFee + exchangeFee;

    return {
      platform: platformFee,
      network: networkFee,
      exchange: exchangeFee,
      total,
    };
  }

  /**
   * Get exchange rate between currencies
   */
  private async getExchangeRate(from: string, to: string): Promise<ExchangeRate | null> {
    const key = `${from}-${to}`;
    return this.exchangeRates.get(key) || null;
  }

  /**
   * Perform compliance check on transaction
   */
  private async performComplianceCheck(
    sender: RemittanceUser,
    recipientContact: string,
    amount: number
  ): Promise<ComplianceCheck> {
    // Basic compliance checks
    const flags: string[] = [];
    let riskScore = 0;

    // Check amount thresholds
    if (amount > 10000) {
      flags.push('HIGH_AMOUNT');
      riskScore += 0.3;
    }

    // Check sender KYC status
    if (sender.kycStatus !== 'verified') {
      flags.push('KYC_NOT_VERIFIED');
      riskScore += 0.4;
    }

    // Check custody level
    if (sender.custodyLevel < 1 && amount > 1000) {
      flags.push('LOW_CUSTODY_HIGH_AMOUNT');
      riskScore += 0.2;
    }

    const passed = riskScore < 0.7;
    const requiredActions = passed ? [] : ['MANUAL_REVIEW'];

    return {
      passed,
      riskScore,
      flags,
      requiredActions,
    };
  }

  /**
   * Process claim for recipient
   */
  private async processClaim(
    transaction: RemittanceTransaction,
    recipient: any
  ): Promise<ClaimResult> {
    // For now, simulate successful claim
    // In production, this would integrate with cash-out partners

    const claimAmount = transaction.amount * (transaction.exchangeRate || 1);

    return {
      success: true,
      amount: claimAmount,
      currency: transaction.targetCurrency,
      method: 'cash', // or 'bank' or 'wallet'
      reference: this.generateReference(),
    };
  }

  /**
   * Authenticate recipient
   */
  private async authenticateRecipient(contact: string, auth: any): Promise<any> {
    // For now, return a mock recipient
    // In production, this would verify SMS/email codes, etc.
    return {
      id: 'recipient-' + Date.now(),
      contact,
      verified: true,
    };
  }

  /**
   * Initiate on-chain transaction
   */
  private async initiateOnChainTransaction(transaction: RemittanceTransaction): Promise<string> {
    // For now, return a mock transaction hash
    // In production, this would interact with the blockchain
    return '0x' + Math.random().toString(16).substring(2, 66);
  }

  /**
   * Store transaction in database
   */
  private async storeTransaction(transaction: RemittanceTransaction): Promise<void> {
    this.transactions.set(transaction.id, transaction);
    this.claimLinks.set(transaction.claimLink, transaction.id);
  }

  /**
   * Update transaction in database
   */
  private async updateTransaction(transaction: RemittanceTransaction): Promise<void> {
    this.transactions.set(transaction.id, transaction);
  }

  /**
   * Initialize exchange rates (mock data)
   */
  private initializeExchangeRates(): void {
    this.exchangeRates.set('USD-ARS', {
      from: 'USD',
      to: 'ARS',
      rate: 850.0,
      timestamp: new Date(),
      source: 'mock',
    });

    this.exchangeRates.set('USD-BRL', {
      from: 'USD',
      to: 'BRL',
      rate: 5.2,
      timestamp: new Date(),
      source: 'mock',
    });

    this.exchangeRates.set('USD-USD', {
      from: 'USD',
      to: 'USD',
      rate: 1.0,
      timestamp: new Date(),
      source: 'mock',
    });
  }

  /**
   * Generate unique transaction ID
   */
  private generateTransactionId(): string {
    return 'txn_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
  }

  /**
   * Generate unique claim link
   */
  private generateClaimLink(): string {
    return (
      'claim_' +
      Math.random().toString(36).substring(2, 15) +
      '_' +
      Math.random().toString(36).substring(2, 15)
    );
  }

  /**
   * Generate reference number
   */
  private generateReference(): string {
    return 'REF' + Date.now().toString(36).toUpperCase();
  }
}
