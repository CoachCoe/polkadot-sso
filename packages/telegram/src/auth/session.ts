import { TelegramChallenge, TelegramUser } from '../types';

/**
 * Session manager for Telegram authentication
 */
export class TelegramSessionManager {
  private challenges: Map<string, TelegramChallenge> = new Map();
  private userSessions: Map<number, TelegramUser> = new Map();
  private challengeExpiration: number;

  constructor(challengeExpiration: number = 5 * 60 * 1000) {
    this.challengeExpiration = challengeExpiration;
  }

  /**
   * Create a new authentication challenge
   */
  createChallenge(message: string): TelegramChallenge {
    const challengeId = this.generateChallengeId();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.challengeExpiration);

    const challenge: TelegramChallenge = {
      id: challengeId,
      message,
      expiresAt,
      status: 'pending',
      createdAt: now,
    };

    this.challenges.set(challengeId, challenge);

    // Set up automatic expiration
    setTimeout(() => {
      this.expireChallenge(challengeId);
    }, this.challengeExpiration);

    return challenge;
  }

  /**
   * Get challenge by ID
   */
  getChallenge(challengeId: string): TelegramChallenge | null {
    return this.challenges.get(challengeId) || null;
  }

  /**
   * Update challenge status
   */
  updateChallengeStatus(
    challengeId: string,
    status: TelegramChallenge['status'],
    userId?: number,
    walletAddress?: string,
    signature?: string
  ): boolean {
    const challenge = this.challenges.get(challengeId);
    if (!challenge) {
      return false;
    }

    challenge.status = status;
    if (userId !== undefined) challenge.userId = userId;
    if (walletAddress !== undefined) challenge.walletAddress = walletAddress;
    if (signature !== undefined) challenge.signature = signature;

    this.challenges.set(challengeId, challenge);
    return true;
  }

  /**
   * Complete authentication
   */
  completeAuthentication(
    challengeId: string,
    userId: number,
    walletAddress: string,
    signature: string
  ): boolean {
    return this.updateChallengeStatus(challengeId, 'completed', userId, walletAddress, signature);
  }

  /**
   * Fail authentication
   */
  failAuthentication(challengeId: string, error: string): boolean {
    return this.updateChallengeStatus(challengeId, 'failed');
  }

  /**
   * Expire challenge
   */
  expireChallenge(challengeId: string): boolean {
    return this.updateChallengeStatus(challengeId, 'expired');
  }

  /**
   * Clean up expired challenges
   */
  cleanupExpiredChallenges(): number {
    const now = new Date();
    let cleaned = 0;

    for (const [challengeId, challenge] of this.challenges.entries()) {
      if (challenge.expiresAt < now && challenge.status === 'pending') {
        challenge.status = 'expired';
        this.challenges.set(challengeId, challenge);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Store user session
   */
  storeUserSession(user: TelegramUser): void {
    this.userSessions.set(user.id, user);
  }

  /**
   * Get user session
   */
  getUserSession(userId: number): TelegramUser | null {
    return this.userSessions.get(userId) || null;
  }

  /**
   * Remove user session
   */
  removeUserSession(userId: number): boolean {
    return this.userSessions.delete(userId);
  }

  /**
   * Get all active challenges
   */
  getActiveChallenges(): TelegramChallenge[] {
    return Array.from(this.challenges.values()).filter(challenge => challenge.status === 'pending');
  }

  /**
   * Get challenge statistics
   */
  getChallengeStats(): {
    total: number;
    pending: number;
    completed: number;
    expired: number;
    failed: number;
  } {
    const challenges = Array.from(this.challenges.values());

    return {
      total: challenges.length,
      pending: challenges.filter(c => c.status === 'pending').length,
      completed: challenges.filter(c => c.status === 'completed').length,
      expired: challenges.filter(c => c.status === 'expired').length,
      failed: challenges.filter(c => c.status === 'failed').length,
    };
  }

  /**
   * Generate unique challenge ID
   */
  private generateChallengeId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2);
    return `tg_${timestamp}_${random}`;
  }

  /**
   * Validate challenge
   */
  validateChallenge(challengeId: string): boolean {
    const challenge = this.challenges.get(challengeId);
    if (!challenge) {
      return false;
    }

    if (challenge.status !== 'pending') {
      return false;
    }

    if (challenge.expiresAt < new Date()) {
      this.expireChallenge(challengeId);
      return false;
    }

    return true;
  }
}
