import crypto from 'crypto';
import { Database } from 'sqlite';
import { createLogger } from '../utils/logger.js';
import { getValidatedEnv } from '../utils/envValidation.js';
import { getCacheStrategies } from './cacheService.js';
import { getDatabaseConnection, releaseDatabaseConnection } from '../config/db.js';
import { getJWTService } from './jwtService.js';
import type { TelegramAuthData, TelegramChallenge, TelegramSession, TelegramBotConfig } from '../types/telegram.js';
import type { Session } from '../types/auth.js';

const logger = createLogger('telegram-auth-service');
const env = getValidatedEnv();

export class TelegramAuthService {
  private botConfig: TelegramBotConfig | null = null;
  private cacheStrategies = getCacheStrategies();

  constructor() {
    this.initializeBotConfig();
  }

  private initializeBotConfig(): void {
    if (env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_BOT_USERNAME) {
      this.botConfig = {
        botToken: env.TELEGRAM_BOT_TOKEN,
        botUsername: env.TELEGRAM_BOT_USERNAME,
        allowedDomains: env.TELEGRAM_ALLOWED_DOMAINS,
        authTimeout: env.TELEGRAM_AUTH_TIMEOUT,
      };
      logger.info('Telegram bot configuration initialized', {
        botUsername: this.botConfig.botUsername,
        allowedDomains: this.botConfig.allowedDomains,
        authTimeout: this.botConfig.authTimeout,
      });
    } else {
      logger.warn('Telegram bot configuration not available - Telegram authentication disabled');
    }
  }

  /**
   * Check if Telegram authentication is enabled
   */
  isEnabled(): boolean {
    return this.botConfig !== null;
  }

  /**
   * Get bot configuration
   */
  getBotConfig(): TelegramBotConfig | null {
    return this.botConfig;
  }

  /**
   * Generate a Telegram authentication challenge
   */
  async generateChallenge(clientId: string, state?: string): Promise<TelegramChallenge> {
    if (!this.botConfig) {
      throw new Error('Telegram authentication is not configured');
    }

    const challengeId = crypto.randomUUID();
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const challengeState = state || crypto.randomBytes(16).toString('hex');
    const now = Date.now();
    const expiresAt = now + (this.botConfig.authTimeout * 1000);

    // Create a placeholder challenge (will be updated when user authenticates)
    const challenge: TelegramChallenge = {
      challenge_id: challengeId,
      client_id: clientId,
      state: challengeState,
      code_verifier: codeVerifier,
      created_at: now,
      expires_at: expiresAt,
      used: false,
      // Placeholder Telegram data - will be filled during verification
      id: 0,
      first_name: '',
      auth_date: 0,
      hash: '',
    };

    // Store challenge in database
    await this.storeChallenge(challenge);

    logger.info('Telegram challenge generated', {
      challengeId,
      clientId,
      expiresAt: new Date(expiresAt).toISOString(),
    });

    return challenge;
  }

  /**
   * Store challenge in database
   */
  private async storeChallenge(challenge: TelegramChallenge): Promise<void> {
    const db = await getDatabaseConnection();
    try {
      await db.run(
        `INSERT INTO telegram_challenges (
          challenge_id, client_id, state, code_verifier, 
          telegram_id, first_name, last_name, username, photo_url, auth_date, hash,
          created_at, expires_at, used
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          challenge.challenge_id,
          challenge.client_id,
          challenge.state,
          challenge.code_verifier,
          challenge.id,
          challenge.first_name,
          challenge.last_name || null,
          challenge.username || null,
          challenge.photo_url || null,
          challenge.auth_date,
          challenge.hash,
          challenge.created_at,
          challenge.expires_at,
          challenge.used ? 1 : 0,
        ]
      );
    } finally {
      releaseDatabaseConnection(db);
    }
  }

  /**
   * Get challenge by ID
   */
  async getChallenge(challengeId: string): Promise<TelegramChallenge | null> {
    const db = await getDatabaseConnection();
    try {
      const row = await db.get(
        'SELECT * FROM telegram_challenges WHERE challenge_id = ?',
        [challengeId]
      ) as any;

      if (!row) {
        return null;
      }

      return {
        challenge_id: row.challenge_id,
        client_id: row.client_id,
        state: row.state,
        code_verifier: row.code_verifier,
        created_at: row.created_at,
        expires_at: row.expires_at,
        used: Boolean(row.used),
        id: row.telegram_id,
        first_name: row.first_name,
        last_name: row.last_name,
        username: row.username,
        photo_url: row.photo_url,
        auth_date: row.auth_date,
        hash: row.hash,
      };
    } finally {
      releaseDatabaseConnection(db);
    }
  }

  /**
   * Verify Telegram authentication data
   */
  verifyTelegramAuth(authData: TelegramAuthData): boolean {
    if (!this.botConfig) {
      throw new Error('Telegram authentication is not configured');
    }

    try {
      // Create data string for verification (following Telegram's specification)
      const dataCheckString = this.createDataCheckString(authData);
      
      // Create secret key from bot token (following Telegram's specification)
      const secretKey = crypto
        .createHash('sha256')
        .update(this.botConfig.botToken)
        .digest();

      // Calculate hash
      const calculatedHash = crypto
        .createHmac('sha256', secretKey)
        .update(dataCheckString)
        .digest('hex');

      // Compare hashes
      const isValid = calculatedHash === authData.hash;

      // Check auth_date to prevent replay attacks (should be within last 5 minutes)
      const now = Math.floor(Date.now() / 1000);
      const authDateValid = (now - authData.auth_date) <= this.botConfig!.authTimeout;

      logger.info('Telegram auth verification', {
        telegramId: authData.id,
        username: authData.username,
        isValid,
        authDateValid,
        authDate: new Date(authData.auth_date * 1000).toISOString(),
        timeDiff: now - authData.auth_date,
      });

      return isValid && authDateValid;
    } catch (error) {
      logger.error('Telegram auth verification failed', { error: error instanceof Error ? error.message : 'Unknown error' });
      return false;
    }
  }

  /**
   * Create data check string for Telegram verification
   */
  private createDataCheckString(authData: TelegramAuthData): string {
    const data: Record<string, string> = {
      id: authData.id.toString(),
      first_name: authData.first_name,
      auth_date: authData.auth_date.toString(),
    };

    if (authData.last_name) {
      data.last_name = authData.last_name;
    }
    if (authData.username) {
      data.username = authData.username;
    }
    if (authData.photo_url) {
      data.photo_url = authData.photo_url;
    }

    // Sort keys and create query string
    const sortedKeys = Object.keys(data).sort();
    return sortedKeys.map(key => `${key}=${data[key]}`).join('\n');
  }

  /**
   * Mark challenge as used
   */
  async markChallengeUsed(challengeId: string): Promise<void> {
    const db = await getDatabaseConnection();
    try {
      await db.run(
        'UPDATE telegram_challenges SET used = 1 WHERE challenge_id = ?',
        [challengeId]
      );
      logger.info('Telegram challenge marked as used', { challengeId });
    } finally {
      releaseDatabaseConnection(db);
    }
  }

  /**
   * Create session for authenticated Telegram user
   */
  async createSession(
    authData: TelegramAuthData,
    clientId: string,
    challengeId: string
  ): Promise<TelegramSession> {
    const db = await getDatabaseConnection();
    try {
      const sessionId = crypto.randomUUID();
      const fingerprint = crypto.randomBytes(16).toString('hex');
      
      // Generate tokens using existing JWT service
      const jwtService = getJWTService();
      const tokenPair = jwtService.generateTokenPair({
        id: sessionId,
        address: `telegram:${authData.id}`, // Use Telegram ID as address
        client_id: clientId,
        access_token: '',
        refresh_token: '',
        access_token_id: '',
        refresh_token_id: '',
        fingerprint,
        access_token_expires_at: 0,
        refresh_token_expires_at: 0,
        created_at: Date.now(),
        last_used_at: Date.now(),
        is_active: true,
      });

      // Store session in database
      await db.run(
        `INSERT INTO telegram_sessions (
          id, telegram_id, username, first_name, last_name, photo_url,
          client_id, access_token, refresh_token, access_token_id, refresh_token_id,
          fingerprint, access_token_expires_at, refresh_token_expires_at,
          created_at, last_used_at, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          sessionId,
          authData.id,
          authData.username || null,
          authData.first_name,
          authData.last_name || null,
          authData.photo_url || null,
          clientId,
          tokenPair.accessToken,
          tokenPair.refreshToken,
          crypto.randomUUID(),
          crypto.randomUUID(),
          fingerprint,
          tokenPair.accessTokenExpiresAt,
          tokenPair.refreshTokenExpiresAt,
          Date.now(),
          Date.now(),
          1,
        ]
      );

      const session: TelegramSession = {
        id: sessionId,
        telegram_id: authData.id,
        username: authData.username,
        first_name: authData.first_name,
        last_name: authData.last_name,
        photo_url: authData.photo_url,
        client_id: clientId,
        access_token: tokenPair.accessToken,
        refresh_token: tokenPair.refreshToken,
        access_token_id: crypto.randomUUID(),
        refresh_token_id: crypto.randomUUID(),
        fingerprint,
        access_token_expires_at: tokenPair.accessTokenExpiresAt,
        refresh_token_expires_at: tokenPair.refreshTokenExpiresAt,
        created_at: Date.now(),
        last_used_at: Date.now(),
        is_active: true,
      };

      // Cache session
      const cacheKey = `telegram_session:${authData.id}:${clientId}`;
      await this.cacheStrategies.setSession(cacheKey, session);

      logger.info('Telegram session created', {
        sessionId,
        telegramId: authData.id,
        username: authData.username,
        clientId,
      });

      return session;
    } finally {
      releaseDatabaseConnection(db);
    }
  }

  /**
   * Get session by Telegram ID and client ID
   */
  async getSession(telegramId: number, clientId: string): Promise<TelegramSession | null> {
    const cacheKey = `telegram_session:${telegramId}:${clientId}`;
    let session = await this.cacheStrategies.getSession<TelegramSession>(cacheKey);

    if (!session) {
      const db = await getDatabaseConnection();
      try {
        const row = await db.get(
          'SELECT * FROM telegram_sessions WHERE telegram_id = ? AND client_id = ? AND is_active = 1',
          [telegramId, clientId]
        ) as any;

        if (row) {
          session = {
            id: row.id,
            telegram_id: row.telegram_id,
            username: row.username,
            first_name: row.first_name,
            last_name: row.last_name,
            photo_url: row.photo_url,
            client_id: row.client_id,
            access_token: row.access_token,
            refresh_token: row.refresh_token,
            access_token_id: row.access_token_id,
            refresh_token_id: row.refresh_token_id,
            fingerprint: row.fingerprint,
            access_token_expires_at: row.access_token_expires_at,
            refresh_token_expires_at: row.refresh_token_expires_at,
            created_at: row.created_at,
            last_used_at: row.last_used_at,
            is_active: Boolean(row.is_active),
          };

          await this.cacheStrategies.setSession(cacheKey, session);
        }
      } finally {
        releaseDatabaseConnection(db);
      }
    }

    return session;
  }

  /**
   * Clean up expired challenges
   */
  async cleanupExpiredChallenges(): Promise<number> {
    const db = await getDatabaseConnection();
    try {
      const result = await db.run(
        'DELETE FROM telegram_challenges WHERE expires_at < ?',
        [Date.now()]
      );
      
      const deletedCount = result.changes || 0;
      if (deletedCount > 0) {
        logger.info('Cleaned up expired Telegram challenges', { deletedCount });
      }
      
      return deletedCount;
    } finally {
      releaseDatabaseConnection(db);
    }
  }
}

// Global Telegram auth service instance - lazy loaded
let _telegramAuthService: TelegramAuthService | null = null;

export const getTelegramAuthService = (): TelegramAuthService => {
  if (!_telegramAuthService) {
    _telegramAuthService = new TelegramAuthService();
  }
  return _telegramAuthService;
};
