import { TelegramChallenge, TelegramUser } from '../types';
/**
 * Session manager for Telegram authentication
 */
export declare class TelegramSessionManager {
    private challenges;
    private userSessions;
    private challengeExpiration;
    constructor(challengeExpiration?: number);
    /**
     * Create a new authentication challenge
     */
    createChallenge(message: string): TelegramChallenge;
    /**
     * Get challenge by ID
     */
    getChallenge(challengeId: string): TelegramChallenge | null;
    /**
     * Update challenge status
     */
    updateChallengeStatus(challengeId: string, status: TelegramChallenge['status'], userId?: number, walletAddress?: string, signature?: string): boolean;
    /**
     * Complete authentication
     */
    completeAuthentication(challengeId: string, userId: number, walletAddress: string, signature: string): boolean;
    /**
     * Fail authentication
     */
    failAuthentication(challengeId: string, error: string): boolean;
    /**
     * Expire challenge
     */
    expireChallenge(challengeId: string): boolean;
    /**
     * Clean up expired challenges
     */
    cleanupExpiredChallenges(): number;
    /**
     * Store user session
     */
    storeUserSession(user: TelegramUser): void;
    /**
     * Get user session
     */
    getUserSession(userId: number): TelegramUser | null;
    /**
     * Remove user session
     */
    removeUserSession(userId: number): boolean;
    /**
     * Get all active challenges
     */
    getActiveChallenges(): TelegramChallenge[];
    /**
     * Get challenge statistics
     */
    getChallengeStats(): {
        total: number;
        pending: number;
        completed: number;
        expired: number;
        failed: number;
    };
    /**
     * Generate unique challenge ID
     */
    private generateChallengeId;
    /**
     * Validate challenge
     */
    validateChallenge(challengeId: string): boolean;
}
//# sourceMappingURL=session.d.ts.map