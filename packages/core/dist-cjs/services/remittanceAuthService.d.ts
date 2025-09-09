import { CustodyLevelConfig, RemittanceConfig, RemittanceSession, RemittanceUser } from '../types/remittance';
import { AuthService } from './authService';
export declare class RemittanceAuthService extends AuthService {
    private custodyLevels;
    private remittanceConfig;
    /**
     * Create a remittance session with custody level management
     */
    createRemittanceSession(user: RemittanceUser, custodyLevel?: number): Promise<RemittanceSession>;
    /**
     * Upgrade user's custody level with additional verification
     */
    upgradeCustodyLevel(userId: string, currentLevel: number, targetLevel: number, additionalAuth: any): Promise<boolean>;
    /**
     * Verify enhanced security requirements (Level 1)
     */
    private verifyEnhancedSecurity;
    /**
     * Verify wallet-assisted requirements (Level 2)
     */
    private verifyWalletAssisted;
    /**
     * Verify self-custody requirements (Level 3)
     */
    private verifySelfCustody;
    /**
     * Check if user has required authentication method
     */
    private hasAuthMethod;
    /**
     * Get remittance user by ID
     */
    getRemittanceUser(userId: string): Promise<RemittanceUser | null>;
    /**
     * Update user's custody level
     */
    private updateUserCustodyLevel;
    /**
     * Update user's security level
     */
    private updateUserSecurityLevel;
    /**
     * Add recovery questions for user
     */
    private addRecoveryQuestions;
    /**
     * Verify 2FA code
     */
    private verify2FA;
    /**
     * Setup multisig wallet
     */
    private setupMultisigWallet;
    /**
     * Transfer to self-custody
     */
    private transferToSelfCustody;
    /**
     * Generate nonce for challenges
     */
    private generateRemittanceNonce;
    /**
     * Get custody level configuration
     */
    getCustodyLevelConfig(level: number): CustodyLevelConfig | null;
    /**
     * Get remittance configuration
     */
    getRemittanceConfig(): RemittanceConfig;
    /**
     * Calculate fees based on custody level
     */
    calculateFees(amount: number, custodyLevel: number): number;
}
//# sourceMappingURL=remittanceAuthService.d.ts.map