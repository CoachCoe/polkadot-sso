"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RemittanceAuthService = void 0;
const authService_1 = require("./authService");
class RemittanceAuthService extends authService_1.AuthService {
    constructor() {
        super(...arguments);
        this.custodyLevels = {
            0: {
                method: 'sms_email',
                limits: { daily: 500, monthly: 2000, perTransaction: 500, currency: 'USD' },
                requiredAuth: ['phone', 'email'],
                description: 'Basic SMS/Email authentication with platform custody'
            },
            1: {
                method: 'enhanced_security',
                limits: { daily: 2000, monthly: 10000, perTransaction: 2000, currency: 'USD' },
                requiredAuth: ['phone', 'email', '2fa'],
                description: 'Enhanced security with 2FA and shared custody'
            },
            2: {
                method: 'wallet_assisted',
                limits: { daily: 10000, monthly: 50000, perTransaction: 10000, currency: 'USD' },
                requiredAuth: ['wallet_signature', 'backup_method'],
                description: 'Wallet-assisted with 2-of-3 multisig'
            },
            3: {
                method: 'self_custody',
                limits: null, // No limits for full self-custody
                requiredAuth: ['wallet_signature'],
                description: 'Full self-custody with complete wallet control'
            }
        };
        this.remittanceConfig = {
            custodyLevels: this.custodyLevels,
            supportedCurrencies: ['USD', 'ARS', 'BRL'],
            supportedCorridors: ['US-AR', 'US-BR'],
            defaultLimits: { daily: 500, monthly: 2000, perTransaction: 500, currency: 'USD' },
            feeStructure: {
                baseFee: 0.02, // 2% base fee
                custodyDiscount: 0.005, // 0.5% discount per level
                minFee: 0.01, // Min 1%
                networkFee: 0.50, // Fixed network fee
                exchangeFee: 0.25 // Fixed exchange fee
            }
        };
    }
    /**
     * Create a remittance session with custody level management
     */
    async createRemittanceSession(user, custodyLevel = 0) {
        // Create base session using existing AuthService
        const baseSession = await this.createSession(user.address, user.id, // Using user ID as clientId for remittance
        {
            domain: 'remittance.polkadot-sso.com',
            address: user.address,
            statement: 'Sign in to Polkadot Remittance',
            uri: 'https://remittance.polkadot-sso.com',
            version: '1',
            chainId: 'polkadot',
            nonce: this.generateRemittanceNonce(),
            issuedAt: new Date().toISOString()
        });
        if (!baseSession) {
            throw new Error('Failed to create base session');
        }
        // Extend with remittance-specific data
        const remittanceSession = {
            ...baseSession,
            userId: user.id,
            custodyLevel,
            kycStatus: user.kycStatus,
            limits: this.custodyLevels[custodyLevel]?.limits || null,
            walletAddresses: user.walletAddresses,
            recoveryMethods: user.recoveryMethods,
            expiresAt: new Date(baseSession.accessTokenExpiresAt),
            createdAt: new Date(baseSession.createdAt),
            lastUsedAt: new Date()
        };
        return remittanceSession;
    }
    /**
     * Upgrade user's custody level with additional verification
     */
    async upgradeCustodyLevel(userId, currentLevel, targetLevel, additionalAuth) {
        if (targetLevel <= currentLevel) {
            throw new Error('Target custody level must be higher than current level');
        }
        if (targetLevel > 3) {
            throw new Error('Invalid custody level: maximum is 3');
        }
        const requirements = this.custodyLevels[targetLevel];
        const user = await this.getRemittanceUser(userId);
        if (!user) {
            throw new Error('User not found');
        }
        // Check if user meets requirements for target level
        for (const authMethod of requirements.requiredAuth) {
            if (!this.hasAuthMethod(user, authMethod)) {
                throw new Error(`Missing required authentication method: ${authMethod}`);
            }
        }
        // Perform additional verification based on target level
        let verificationResult = false;
        switch (targetLevel) {
            case 1:
                verificationResult = await this.verifyEnhancedSecurity(user, additionalAuth);
                break;
            case 2:
                verificationResult = await this.verifyWalletAssisted(user, additionalAuth);
                break;
            case 3:
                verificationResult = await this.verifySelfCustody(user, additionalAuth);
                break;
            default:
                throw new Error(`Invalid custody level: ${targetLevel}`);
        }
        if (verificationResult) {
            // Update user's custody level
            await this.updateUserCustodyLevel(userId, targetLevel);
            return true;
        }
        return false;
    }
    /**
     * Verify enhanced security requirements (Level 1)
     */
    async verifyEnhancedSecurity(user, auth) {
        try {
            // Verify 2FA if provided
            if (auth.twoFactorCode) {
                const isValid2FA = await this.verify2FA(user.id, auth.twoFactorCode);
                if (!isValid2FA) {
                    return false;
                }
            }
            // Add recovery questions if provided
            if (auth.recoveryQuestions) {
                await this.addRecoveryQuestions(user.id, auth.recoveryQuestions);
            }
            // Update user record with enhanced security
            await this.updateUserSecurityLevel(user.id, 1);
            return true;
        }
        catch (error) {
            console.error('Enhanced security verification failed:', error);
            return false;
        }
    }
    /**
     * Verify wallet-assisted requirements (Level 2)
     */
    async verifyWalletAssisted(user, auth) {
        try {
            // Verify wallet signature
            if (!auth.walletSignature || !auth.walletAddress) {
                throw new Error('Wallet signature and address required');
            }
            // Verify signature using existing AuthService
            const isValidSignature = await this.verifySignature({
                message: `Upgrade to custody level 2 for ${user.id}`,
                signature: auth.walletSignature,
                address: auth.walletAddress,
                nonce: this.generateRemittanceNonce()
            }, {
                id: 'upgrade-challenge',
                message: `Upgrade to custody level 2 for ${user.id}`,
                clientId: user.id,
                nonce: this.generateRemittanceNonce(),
                issuedAt: new Date().toISOString(),
                expiresAt: new Date(Date.now() + 300000).toISOString(), // 5 minutes
                createdAt: Date.now(),
                expiresAtTimestamp: Date.now() + 300000,
                used: false
            });
            if (!isValidSignature.success) {
                return false;
            }
            // Set up 2-of-3 multisig (user device + platform + recovery)
            await this.setupMultisigWallet(user.id, auth.walletAddress);
            // Update user record
            await this.updateUserCustodyLevel(user.id, 2);
            return true;
        }
        catch (error) {
            console.error('Wallet-assisted verification failed:', error);
            return false;
        }
    }
    /**
     * Verify self-custody requirements (Level 3)
     */
    async verifySelfCustody(user, auth) {
        try {
            // Verify wallet signature for full control
            if (!auth.walletSignature || !auth.walletAddress) {
                throw new Error('Wallet signature and address required');
            }
            // Verify signature using existing AuthService
            const isValidSignature = await this.verifySignature({
                message: `Upgrade to full self-custody for ${user.id}`,
                signature: auth.walletSignature,
                address: auth.walletAddress,
                nonce: this.generateRemittanceNonce()
            }, {
                id: 'self-custody-challenge',
                message: `Upgrade to full self-custody for ${user.id}`,
                clientId: user.id,
                nonce: this.generateRemittanceNonce(),
                issuedAt: new Date().toISOString(),
                expiresAt: new Date(Date.now() + 300000).toISOString(), // 5 minutes
                createdAt: Date.now(),
                expiresAtTimestamp: Date.now() + 300000,
                used: false
            });
            if (!isValidSignature.success) {
                return false;
            }
            // Transfer full control to user wallet
            await this.transferToSelfCustody(user.id, auth.walletAddress);
            // Update user record
            await this.updateUserCustodyLevel(user.id, 3);
            return true;
        }
        catch (error) {
            console.error('Self-custody verification failed:', error);
            return false;
        }
    }
    /**
     * Check if user has required authentication method
     */
    hasAuthMethod(user, method) {
        switch (method) {
            case 'phone':
                return !!user.phone;
            case 'email':
                return !!user.email;
            case '2fa':
                return user.recoveryMethods.some(rm => rm.type === 'backup_questions' && rm.verified);
            case 'wallet_signature':
                return Object.keys(user.walletAddresses).length > 0;
            case 'backup_method':
                return user.recoveryMethods.some(rm => rm.verified);
            default:
                return false;
        }
    }
    /**
     * Get remittance user by ID
     */
    async getRemittanceUser(userId) {
        // This would integrate with your existing user database
        // For now, return a mock implementation
        return {
            id: userId,
            address: 'mock-address',
            name: 'Mock User',
            email: 'user@example.com',
            phone: '+1234567890',
            createdAt: new Date(),
            lastLogin: new Date(),
            isActive: true,
            custodyLevel: 0,
            kycStatus: 'pending',
            limits: this.custodyLevels[0]?.limits || { daily: 500, monthly: 2000, perTransaction: 500, currency: 'USD' },
            walletAddresses: {},
            recoveryMethods: [],
            lastActivity: new Date()
        };
    }
    /**
     * Update user's custody level
     */
    async updateUserCustodyLevel(userId, level) {
        // This would update the user record in your database
        console.log(`Updating user ${userId} to custody level ${level}`);
    }
    /**
     * Update user's security level
     */
    async updateUserSecurityLevel(userId, level) {
        // This would update security settings in your database
        console.log(`Updating user ${userId} security level to ${level}`);
    }
    /**
     * Add recovery questions for user
     */
    async addRecoveryQuestions(userId, questions) {
        // This would store recovery questions in your database
        console.log(`Adding recovery questions for user ${userId}`);
    }
    /**
     * Verify 2FA code
     */
    async verify2FA(userId, code) {
        // This would integrate with your 2FA provider
        // For now, return true for demo purposes
        return true;
    }
    /**
     * Setup multisig wallet
     */
    async setupMultisigWallet(userId, walletAddress) {
        // This would create a multisig wallet on the blockchain
        console.log(`Setting up multisig wallet for user ${userId} with address ${walletAddress}`);
    }
    /**
     * Transfer to self-custody
     */
    async transferToSelfCustody(userId, walletAddress) {
        // This would transfer full control to the user's wallet
        console.log(`Transferring to self-custody for user ${userId} with address ${walletAddress}`);
    }
    /**
     * Generate nonce for challenges
     */
    generateRemittanceNonce() {
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }
    /**
     * Get custody level configuration
     */
    getCustodyLevelConfig(level) {
        return this.custodyLevels[level] || null;
    }
    /**
     * Get remittance configuration
     */
    getRemittanceConfig() {
        return this.remittanceConfig;
    }
    /**
     * Calculate fees based on custody level
     */
    calculateFees(amount, custodyLevel) {
        const { baseFee, custodyDiscount, minFee } = this.remittanceConfig.feeStructure;
        const discount = custodyLevel * custodyDiscount;
        const finalFee = Math.max(baseFee - discount, minFee);
        return amount * finalFee;
    }
}
exports.RemittanceAuthService = RemittanceAuthService;
//# sourceMappingURL=remittanceAuthService.js.map