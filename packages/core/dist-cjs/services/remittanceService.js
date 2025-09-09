"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RemittanceService = void 0;
const errorService_1 = require("./errorService");
const exchangeRateService_1 = require("./exchangeRateService");
class RemittanceService {
    constructor(authService, exchangeRateConfig) {
        this.transactions = new Map();
        this.claimLinks = new Map(); // claimLink -> transactionId
        this.authService = authService;
        this.exchangeRateService = (0, exchangeRateService_1.createExchangeRateService)(exchangeRateConfig || exchangeRateService_1.DEFAULT_EXCHANGE_RATE_CONFIG);
    }
    /**
     * Create a new remittance transaction
     */
    async createRemittanceTransaction(senderId, recipientContact, amount, targetCurrency) {
        try {
            // 1. Validate sender and custody level
            const sender = await this.authService.getRemittanceUser(senderId);
            if (!sender) {
                throw errorService_1.ErrorService.createError('SENDER_NOT_FOUND', 'Sender not found');
            }
            // 2. Check transaction limits
            const canTransact = await this.checkTransactionLimits(senderId, amount, sender.custodyLevel);
            if (!canTransact) {
                throw errorService_1.ErrorService.createError('LIMIT_EXCEEDED', 'Transaction exceeds limits for custody level');
            }
            // 3. Get exchange rate
            const exchangeRate = await this.getExchangeRate('USD', targetCurrency);
            if (!exchangeRate) {
                throw errorService_1.ErrorService.createError('EXCHANGE_RATE_UNAVAILABLE', 'Exchange rate not available');
            }
            // 4. Calculate fees
            const fees = await this.calculateFees(amount, sender.custodyLevel);
            // 5. Perform compliance check
            const complianceCheck = await this.performComplianceCheck(sender, recipientContact, amount);
            if (!complianceCheck.passed) {
                throw errorService_1.ErrorService.createError('COMPLIANCE_FAILED', 'Transaction failed compliance check');
            }
            // 6. Create transaction record
            const transaction = {
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
        }
        catch (error) {
            console.error('Failed to create remittance transaction:', error);
            throw error;
        }
    }
    /**
     * Claim a remittance transaction
     */
    async claimRemittance(claimLink, recipientAuth) {
        try {
            // 1. Validate claim link
            const transaction = await this.getTransactionByClaimLink(claimLink);
            if (!transaction) {
                throw errorService_1.ErrorService.createError('INVALID_CLAIM_LINK', 'Invalid claim link');
            }
            if (transaction.expiresAt < new Date()) {
                throw errorService_1.ErrorService.createError('CLAIM_EXPIRED', 'Claim link has expired');
            }
            if (transaction.status !== 'processing') {
                throw errorService_1.ErrorService.createError('INVALID_STATUS', 'Transaction is not in a claimable state');
            }
            // 2. Authenticate recipient
            const recipient = await this.authenticateRecipient(transaction.recipientContact, recipientAuth);
            if (!recipient) {
                throw errorService_1.ErrorService.createError('RECIPIENT_AUTH_FAILED', 'Recipient authentication failed');
            }
            // 3. Process claim based on recipient's preferences
            const claimResult = await this.processClaim(transaction, recipient);
            // 4. Update transaction status
            transaction.status = 'completed';
            transaction.recipientId = recipient.id;
            transaction.updatedAt = new Date();
            await this.updateTransaction(transaction);
            return claimResult;
        }
        catch (error) {
            console.error('Failed to claim remittance:', error);
            throw error;
        }
    }
    /**
     * Get transaction history for a user
     */
    async getUserTransactions(userId) {
        const userTransactions = [];
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
    async getTransaction(transactionId) {
        return this.transactions.get(transactionId) || null;
    }
    /**
     * Get transaction by claim link
     */
    async getTransactionByClaimLink(claimLink) {
        const transactionId = this.claimLinks.get(claimLink);
        if (!transactionId) {
            return null;
        }
        return this.getTransaction(transactionId);
    }
    /**
     * Check if transaction is within limits
     */
    async checkTransactionLimits(userId, amount, custodyLevel) {
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
    async calculateFees(amount, custodyLevel) {
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
     * Get exchange rate between currencies using real-time data
     */
    async getExchangeRate(from, to) {
        try {
            const rate = await this.exchangeRateService.getRate(from, to);
            return {
                from,
                to,
                rate,
                timestamp: new Date(),
                source: 'coingecko'
            };
        }
        catch (error) {
            console.error('Failed to get exchange rate:', error);
            return null;
        }
    }
    /**
     * Perform compliance check on transaction
     */
    async performComplianceCheck(sender, recipientContact, amount) {
        // Basic compliance checks
        const flags = [];
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
    async processClaim(transaction, recipient) {
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
    async authenticateRecipient(contact, auth) {
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
    async initiateOnChainTransaction(transaction) {
        // For now, return a mock transaction hash
        // In production, this would interact with the blockchain
        return '0x' + Math.random().toString(16).substring(2, 66);
    }
    /**
     * Store transaction in database
     */
    async storeTransaction(transaction) {
        this.transactions.set(transaction.id, transaction);
        this.claimLinks.set(transaction.claimLink, transaction.id);
    }
    /**
     * Update transaction in database
     */
    async updateTransaction(transaction) {
        this.transactions.set(transaction.id, transaction);
    }
    /**
     * Get multiple exchange rates at once
     */
    async getExchangeRates(from, toCurrencies) {
        return await this.exchangeRateService.getRates(from, toCurrencies);
    }
    /**
     * Clear exchange rate cache
     */
    clearExchangeRateCache() {
        this.exchangeRateService.clearCache();
    }
    /**
     * Get exchange rate cache statistics
     */
    getExchangeRateCacheStats() {
        return this.exchangeRateService.getCacheStats();
    }
    /**
     * Generate unique transaction ID
     */
    generateTransactionId() {
        return 'txn_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
    }
    /**
     * Generate unique claim link
     */
    generateClaimLink() {
        return ('claim_' +
            Math.random().toString(36).substring(2, 15) +
            '_' +
            Math.random().toString(36).substring(2, 15));
    }
    /**
     * Generate reference number
     */
    generateReference() {
        return 'REF' + Date.now().toString(36).toUpperCase();
    }
}
exports.RemittanceService = RemittanceService;
//# sourceMappingURL=remittanceService.js.map