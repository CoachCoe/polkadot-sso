"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@polkadot-auth/core");
const express_1 = require("express");
const router = (0, express_1.Router)();
// Initialize services
const authService = new core_1.RemittanceAuthService();
const remittanceService = new core_1.RemittanceService(authService);
const complianceService = new core_1.ComplianceService();
// Middleware to ensure user is authenticated
const requireAuth = (req, res, next) => {
    const session = req.session;
    if (!session || !session.userId) {
        return res.status(401).json({
            error: 'Authentication required',
            code: 'AUTH_REQUIRED',
        });
    }
    next();
};
// Middleware to validate custody level
const requireCustodyLevel = (minLevel) => {
    return (req, res, next) => {
        const session = req.session;
        if (session.custodyLevel < minLevel) {
            return res.status(403).json({
                error: `Custody level ${minLevel} required`,
                code: 'INSUFFICIENT_CUSTODY_LEVEL',
                currentLevel: session.custodyLevel,
                requiredLevel: minLevel,
            });
        }
        next();
    };
};
/**
 * Send money endpoint
 * POST /api/remittance/send
 */
router.post('/send', requireAuth, async (req, res) => {
    try {
        const { recipient, amount, targetCurrency } = req.body;
        const session = req.session;
        // Validate input
        if (!recipient || !amount || !targetCurrency) {
            return res.status(400).json({
                error: 'Missing required fields: recipient, amount, targetCurrency',
                code: 'MISSING_FIELDS',
            });
        }
        if (amount <= 0) {
            return res.status(400).json({
                error: 'Amount must be positive',
                code: 'INVALID_AMOUNT',
            });
        }
        if (!['ARS', 'BRL', 'USD'].includes(targetCurrency)) {
            return res.status(400).json({
                error: 'Unsupported target currency',
                code: 'UNSUPPORTED_CURRENCY',
            });
        }
        // Check if amount is within limits
        if (session.limits && amount > session.limits.perTransaction) {
            return res.status(400).json({
                error: 'Amount exceeds per-transaction limit',
                code: 'LIMIT_EXCEEDED',
                limit: session.limits.perTransaction,
            });
        }
        // Create remittance transaction
        const transaction = await remittanceService.createRemittanceTransaction(session.userId, recipient, amount, targetCurrency);
        res.json({
            success: true,
            transaction: {
                id: transaction.id,
                amount: transaction.amount,
                currency: transaction.currency,
                targetCurrency: transaction.targetCurrency,
                status: transaction.status,
                claimLink: transaction.claimLink,
                expiresAt: transaction.expiresAt,
                fees: transaction.fees,
                exchangeRate: transaction.exchangeRate,
                createdAt: transaction.createdAt,
            },
        });
    }
    catch (error) {
        console.error('Send money error:', error);
        res.status(500).json({
            error: error.message || 'Failed to send money',
            code: error.code || 'SEND_FAILED',
        });
    }
});
/**
 * Get transaction history
 * GET /api/remittance/history
 */
router.get('/history', requireAuth, async (req, res) => {
    try {
        const session = req.session;
        const { page = 1, limit = 20 } = req.query;
        const transactions = await remittanceService.getUserTransactions(session.userId);
        // Paginate results
        const startIndex = (Number(page) - 1) * Number(limit);
        const endIndex = startIndex + Number(limit);
        const paginatedTransactions = transactions.slice(startIndex, endIndex);
        res.json({
            success: true,
            transactions: paginatedTransactions,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total: transactions.length,
                pages: Math.ceil(transactions.length / Number(limit)),
            },
        });
    }
    catch (error) {
        console.error('Get history error:', error);
        res.status(500).json({
            error: error.message || 'Failed to get transaction history',
            code: 'HISTORY_FAILED',
        });
    }
});
/**
 * Get specific transaction
 * GET /api/remittance/transaction/:id
 */
router.get('/transaction/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const session = req.session;
        const transaction = await remittanceService.getTransaction(id);
        if (!transaction) {
            return res.status(404).json({
                error: 'Transaction not found',
                code: 'TRANSACTION_NOT_FOUND',
            });
        }
        // Check if user has access to this transaction
        if (transaction.senderId !== session.userId && transaction.recipientId !== session.userId) {
            return res.status(403).json({
                error: 'Access denied',
                code: 'ACCESS_DENIED',
            });
        }
        res.json({
            success: true,
            transaction,
        });
    }
    catch (error) {
        console.error('Get transaction error:', error);
        res.status(500).json({
            error: error.message || 'Failed to get transaction',
            code: 'GET_TRANSACTION_FAILED',
        });
    }
});
/**
 * Upgrade custody level
 * POST /api/remittance/upgrade-custody
 */
router.post('/upgrade-custody', requireAuth, async (req, res) => {
    try {
        const { targetLevel, additionalAuth } = req.body;
        const session = req.session;
        if (!targetLevel || targetLevel <= session.custodyLevel) {
            return res.status(400).json({
                error: 'Invalid target custody level',
                code: 'INVALID_TARGET_LEVEL',
            });
        }
        if (targetLevel > 3) {
            return res.status(400).json({
                error: 'Maximum custody level is 3',
                code: 'MAX_LEVEL_EXCEEDED',
            });
        }
        const success = await authService.upgradeCustodyLevel(session.userId, session.custodyLevel, targetLevel, additionalAuth);
        if (success) {
            // Update session
            session.custodyLevel = targetLevel;
            session.limits = authService.getCustodyLevelConfig(targetLevel)?.limits || null;
            res.json({
                success: true,
                newLevel: targetLevel,
                limits: session.limits,
            });
        }
        else {
            res.status(400).json({
                error: 'Custody level upgrade failed',
                code: 'UPGRADE_FAILED',
            });
        }
    }
    catch (error) {
        console.error('Upgrade custody error:', error);
        res.status(500).json({
            error: error.message || 'Failed to upgrade custody level',
            code: 'UPGRADE_FAILED',
        });
    }
});
/**
 * Claim remittance
 * POST /api/remittance/claim
 */
router.post('/claim', async (req, res) => {
    try {
        const { claimLink, recipientAuth } = req.body;
        if (!claimLink || !recipientAuth) {
            return res.status(400).json({
                error: 'Missing required fields: claimLink, recipientAuth',
                code: 'MISSING_FIELDS',
            });
        }
        const result = await remittanceService.claimRemittance(claimLink, recipientAuth);
        res.json({
            success: true,
            result,
        });
    }
    catch (error) {
        console.error('Claim remittance error:', error);
        res.status(500).json({
            error: error.message || 'Failed to claim remittance',
            code: 'CLAIM_FAILED',
        });
    }
});
/**
 * Get exchange rates
 * GET /api/remittance/rates
 */
router.get('/rates', async (req, res) => {
    try {
        const { from = 'USD', to } = req.query;
        if (to) {
            // Get single exchange rate
            const rates = await remittanceService.getExchangeRates('USD', [to]);
            const rate = rates[to];
            if (!rate) {
                return res.status(400).json({
                    error: 'Exchange rate not available',
                    code: 'RATE_NOT_AVAILABLE',
                });
            }
            res.json({
                success: true,
                from: 'USD',
                to: to,
                rate: rate,
                timestamp: new Date().toISOString(),
            });
        }
        else {
            // Get all supported exchange rates
            const supportedCurrencies = ['ARS', 'BRL', 'USD'];
            const rates = await remittanceService.getExchangeRates('USD', supportedCurrencies);
            res.json({
                success: true,
                rates: Object.entries(rates).reduce((acc, [currency, rate]) => {
                    acc[`USD-${currency}`] = rate;
                    return acc;
                }, {}),
                timestamp: new Date().toISOString(),
            });
        }
    }
    catch (error) {
        console.error('Exchange rate fetch error:', error);
        res.status(500).json({
            error: error.message || 'Failed to fetch exchange rates',
            code: 'EXCHANGE_RATE_ERROR',
        });
    }
});
/**
 * Get custody level information
 * GET /api/remittance/custody-levels
 */
router.get('/custody-levels', requireAuth, async (req, res) => {
    try {
        const session = req.session;
        const config = authService.getRemittanceConfig();
        res.json({
            success: true,
            currentLevel: session.custodyLevel,
            levels: config.custodyLevels,
            limits: session.limits,
        });
    }
    catch (error) {
        console.error('Get custody levels error:', error);
        res.status(500).json({
            error: error.message || 'Failed to get custody levels',
            code: 'CUSTODY_LEVELS_FAILED',
        });
    }
});
/**
 * Perform KYC verification
 * POST /api/remittance/kyc
 */
router.post('/kyc', requireAuth, async (req, res) => {
    try {
        const { documents } = req.body;
        const session = req.session;
        if (!documents) {
            return res.status(400).json({
                error: 'Documents required for KYC',
                code: 'DOCUMENTS_REQUIRED',
            });
        }
        const kycResult = await complianceService.performKYC(session.userId, documents);
        res.json({
            success: true,
            kyc: kycResult,
        });
    }
    catch (error) {
        console.error('KYC error:', error);
        res.status(500).json({
            error: error.message || 'KYC verification failed',
            code: 'KYC_FAILED',
        });
    }
});
/**
 * Get compliance status
 * GET /api/remittance/compliance
 */
router.get('/compliance', requireAuth, async (req, res) => {
    try {
        const session = req.session;
        const complianceStatus = await complianceService.getComplianceStatus(session.userId);
        res.json({
            success: true,
            compliance: complianceStatus,
        });
    }
    catch (error) {
        console.error('Get compliance error:', error);
        res.status(500).json({
            error: error.message || 'Failed to get compliance status',
            code: 'COMPLIANCE_FAILED',
        });
    }
});
/**
 * Get transaction quote (fees and exchange rate)
 * GET /api/remittance/quote
 */
router.get('/quote', requireAuth, async (req, res) => {
    try {
        const { amount, targetCurrency } = req.query;
        const session = req.session;
        if (!amount || !targetCurrency) {
            return res.status(400).json({
                error: 'Missing required fields: amount, targetCurrency',
                code: 'MISSING_FIELDS',
            });
        }
        const amountNum = Number(amount);
        if (amountNum <= 0) {
            return res.status(400).json({
                error: 'Amount must be positive',
                code: 'INVALID_AMOUNT',
            });
        }
        // Calculate fees
        const fees = authService.calculateFees(amountNum, session.custodyLevel);
        // Get exchange rate (mock)
        const exchangeRate = targetCurrency === 'ARS' ? 850.0 : targetCurrency === 'BRL' ? 5.2 : 1.0;
        const recipientAmount = amountNum * exchangeRate;
        res.json({
            success: true,
            quote: {
                amount: amountNum,
                currency: 'USD',
                targetCurrency,
                exchangeRate,
                recipientAmount,
                fees,
                totalCost: amountNum + fees.total,
                expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
            },
        });
    }
    catch (error) {
        console.error('Get quote error:', error);
        res.status(500).json({
            error: error.message || 'Failed to get quote',
            code: 'QUOTE_FAILED',
        });
    }
});
exports.default = router;
//# sourceMappingURL=remittance.js.map