/**
 * Google OAuth 2.0 Authentication Service
 * Implements PKCE (Proof Key for Code Exchange) for enhanced security
 */

import { OAuth2Client } from 'google-auth-library';
import { createLogger } from '../utils/logger.js';
import { getValidatedEnv } from '../utils/envValidation.js';
import { getDatabaseConnection, releaseDatabaseConnection } from '../config/db.js';
import { generateSecureRandom, generateSecureUUID, createHash, randomBytes } from '../utils/crypto.js';
import { 
  GoogleOAuthConfig, 
  GoogleChallenge, 
  GoogleUserInfo, 
  GoogleTokenResponse, 
  GoogleIdToken, 
  GoogleSession,
  GoogleVerificationRequest,
  GoogleVerificationResponse
} from '../types/google.js';
import { AuthenticationError, ValidationError } from '../utils/errors.js';

const logger = createLogger('google-auth-service');

export class GoogleAuthService {
  private oauth2Client: OAuth2Client;
  private config: GoogleOAuthConfig;

  constructor() {
    const env = getValidatedEnv();
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
      throw new Error('Google OAuth configuration is missing');
    }

    this.config = {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      redirectUri: env.GOOGLE_REDIRECT_URI || `http://localhost:${env.PORT}/api/auth/google/callback`,
      scopes: env.GOOGLE_SCOPES,
      authTimeout: env.GOOGLE_AUTH_TIMEOUT,
    };

    this.oauth2Client = new OAuth2Client(
      this.config.clientId,
      this.config.clientSecret,
      this.config.redirectUri
    );


    logger.info('Google OAuth service initialized', {
      clientId: this.config.clientId.substring(0, 10) + '...',
      redirectUri: this.config.redirectUri,
      scopes: this.config.scopes,
      authTimeout: this.config.authTimeout,
    });
  }

  async generateChallenge(clientId: string, requestId?: string): Promise<GoogleChallenge> {
    const db = await getDatabaseConnection();
    try {
      const codeVerifier = this.generateCodeVerifier();
      const codeChallenge = await this.generateCodeChallenge(codeVerifier);
      const state = generateSecureRandom(32);
      const nonce = generateSecureUUID();

      const challengeId = generateSecureUUID();
      const now = Date.now();
      const expiresAt = now + (this.config.authTimeout * 1000);

      const challenge: GoogleChallenge = {
        id: challengeId,
        client_id: clientId,
        code_verifier: codeVerifier,
        code_challenge: codeChallenge,
        state,
        nonce,
        created_at: now,
        expires_at: expiresAt,
        used: false,
      };

      await db.run(
        `INSERT INTO google_challenges (
          challenge_id, client_id, state, code_verifier, code_challenge, nonce, 
          created_at, expires_at, used
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          challenge.id,
          challenge.client_id,
          challenge.state,
          challenge.code_verifier,
          challenge.code_challenge,
          challenge.nonce,
          challenge.created_at,
          challenge.expires_at,
          challenge.used,
        ]
      );

      logger.info('Google OAuth challenge generated', {
        challengeId: challenge.id,
        clientId: challenge.client_id,
        expiresAt: new Date(challenge.expires_at).toISOString(),
        requestId,
      });

      return challenge;
    } catch (error) {
      logger.error('Failed to generate Google OAuth challenge', {
        error: error instanceof Error ? error.message : String(error),
        clientId,
        requestId,
      });
      throw new AuthenticationError('Failed to generate OAuth challenge', undefined, requestId);
    } finally {
      releaseDatabaseConnection(db);
    }
  }

  getAuthorizationUrl(challenge: GoogleChallenge): string {
    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: this.config.scopes,
      state: challenge.state,
      nonce: challenge.nonce,
      code_challenge: challenge.code_challenge,
      code_challenge_method: 'S256' as any,
      prompt: 'consent', // Force consent screen to get refresh token
    });

    logger.info('Google OAuth authorization URL generated', {
      challengeId: challenge.id,
      state: challenge.state.substring(0, 8) + '...',
    });

    return authUrl;
  }

  async verifyCallback(
    request: GoogleVerificationRequest,
    requestId?: string
  ): Promise<GoogleVerificationResponse> {
    try {
      const challenge = await this.getChallenge(request.state, requestId);
      
      if (challenge.used) {
        throw new AuthenticationError('Challenge has already been used', undefined, requestId);
      }

      if (Date.now() > challenge.expires_at) {
        throw new AuthenticationError('Challenge has expired', undefined, requestId);
      }

      if (challenge.client_id !== request.client_id) {
        throw new AuthenticationError('Client ID mismatch', undefined, requestId);
      }

      const { tokens } = await this.oauth2Client.getToken({
        code: request.code,
        codeVerifier: challenge.code_verifier,
      });

      if (!tokens.access_token) {
        throw new AuthenticationError('No access token received from Google', undefined, requestId);
      }

      const ticket = await this.oauth2Client.verifyIdToken({
        idToken: tokens.id_token!,
        audience: this.config.clientId,
      });

      const payload = ticket.getPayload() as GoogleIdToken;
      if (!payload) {
        throw new AuthenticationError('Invalid ID token payload', undefined, requestId);
      }

      if (payload.nonce !== challenge.nonce) {
        throw new AuthenticationError('Nonce mismatch', undefined, requestId);
      }

      const userInfo: GoogleUserInfo = {
        id: payload.sub,
        email: payload.email,
        verified_email: payload.email_verified,
        name: payload.name,
        given_name: payload.given_name,
        family_name: payload.family_name,
        picture: payload.picture,
        locale: payload.locale,
        hd: payload.hd,
      };

      const session = await this.createSession(userInfo, tokens as GoogleTokenResponse, challenge.client_id, requestId);

      await this.markChallengeAsUsed(challenge.id);

      logger.info('Google OAuth verification successful', {
        googleId: userInfo.id,
        email: userInfo.email,
        clientId: challenge.client_id,
        requestId,
      });

      return {
        success: true,
        session,
        redirect_url: this.getRedirectUrl(challenge.client_id, session.id),
      };
    } catch (error) {
      logger.error('Google OAuth verification failed', {
        error: error instanceof Error ? error.message : String(error),
        requestId,
      });

      if (error instanceof AuthenticationError) {
        throw error;
      }

      throw new AuthenticationError('OAuth verification failed', undefined, requestId);
    }
  }

  private async getChallenge(state: string, requestId?: string): Promise<GoogleChallenge> {
    const db = await getDatabaseConnection();
    try {
      const row = await db.get(
        'SELECT * FROM google_challenges WHERE state = ? AND used = 0',
        [state]
      );

      if (!row) {
        throw new AuthenticationError('Invalid or expired challenge', undefined, requestId);
      }

      return {
        id: row.challenge_id,
        client_id: row.client_id,
        code_verifier: row.code_verifier,
        code_challenge: row.code_challenge,
        state: row.state,
        nonce: row.nonce,
        created_at: row.created_at,
        expires_at: row.expires_at,
        used: Boolean(row.used),
      };
    } finally {
      releaseDatabaseConnection(db);
    }
  }

  private async createSession(
    userInfo: GoogleUserInfo,
    tokens: GoogleTokenResponse,
    clientId: string,
    requestId?: string
  ): Promise<GoogleSession> {
    const sessionId = generateSecureUUID();
    const accessTokenId = generateSecureUUID();
    const refreshTokenId = tokens.refresh_token ? generateSecureUUID() : undefined;
    const fingerprint = this.generateFingerprint(userInfo.id, clientId);

    const now = Date.now();
    const accessTokenExpiresAt = now + (tokens.expires_in * 1000);
    const refreshTokenExpiresAt = tokens.refresh_token 
      ? now + (7 * 24 * 60 * 60 * 1000) // 7 days
      : undefined;

    const session: GoogleSession = {
      id: sessionId,
      google_id: userInfo.id,
      email: userInfo.email,
      name: userInfo.name,
      picture: userInfo.picture,
      client_id: clientId,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      access_token_id: accessTokenId,
      refresh_token_id: refreshTokenId,
      fingerprint,
      access_token_expires_at: accessTokenExpiresAt,
      refresh_token_expires_at: refreshTokenExpiresAt,
      created_at: now,
      last_used_at: now,
      is_active: true,
    };

    const db = await getDatabaseConnection();
    try {
      await db.run(
        `INSERT INTO google_sessions (
          id, google_id, email, name, picture, client_id, access_token, refresh_token,
          access_token_id, refresh_token_id, fingerprint, access_token_expires_at,
          refresh_token_expires_at, created_at, last_used_at, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          session.id,
          session.google_id,
          session.email,
          session.name,
          session.picture,
          session.client_id,
          session.access_token,
          session.refresh_token,
          session.access_token_id,
          session.refresh_token_id,
          session.fingerprint,
          session.access_token_expires_at,
          session.refresh_token_expires_at,
          session.created_at,
          session.last_used_at,
          session.is_active,
        ]
      );
    } finally {
      releaseDatabaseConnection(db);
    }

    logger.info('Google OAuth session created', {
      sessionId: session.id,
      googleId: session.google_id,
      email: session.email,
      clientId: session.client_id,
      requestId,
    });

    return session;
  }

  private async markChallengeAsUsed(challengeId: string): Promise<void> {
    const db = await getDatabaseConnection();
    try {
      await db.run(
        'UPDATE google_challenges SET used = 1 WHERE challenge_id = ?',
        [challengeId]
      );
    } finally {
      releaseDatabaseConnection(db);
    }
  }

  private generateCodeVerifier(): string {
    return generateSecureRandom(128); // 128 characters for high entropy
  }

  private async generateCodeChallenge(verifier: string): Promise<string> {
    const hash = createHash('sha256');
    hash.update(verifier);
    return hash.digest('base64url');
  }

  private generateFingerprint(googleId: string, clientId: string): string {
    const data = `${googleId}:${clientId}:${Date.now()}`;
    const hash = createHash('sha256');
    hash.update(data);
    return hash.digest('hex');
  }

  private getRedirectUrl(clientId: string, sessionId: string): string {
    return `/api/auth/success?session_id=${sessionId}&client_id=${clientId}`;
  }

  async cleanupExpiredChallenges(): Promise<number> {
    const db = await getDatabaseConnection();
    try {
      const now = Date.now();
      const result = await db.run(
        'DELETE FROM google_challenges WHERE expires_at < ?',
        [now]
      );

      if (result.changes && result.changes > 0) {
        logger.info('Cleaned up expired Google OAuth challenges', {
          count: result.changes,
        });
      }

      return result.changes || 0;
    } finally {
      releaseDatabaseConnection(db);
    }
  }

  async getSession(sessionId: string): Promise<GoogleSession | null> {
    const db = await getDatabaseConnection();
    try {
      const row = await db.get(
        'SELECT * FROM google_sessions WHERE id = ? AND is_active = 1',
        [sessionId]
      );

      if (!row) {
        return null;
      }

      return {
        id: row.id,
        google_id: row.google_id,
        email: row.email,
        name: row.name,
        picture: row.picture,
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
    } finally {
      releaseDatabaseConnection(db);
    }
  }

  async refreshAccessToken(sessionId: string): Promise<GoogleSession | null> {
    const session = await this.getSession(sessionId);
    if (!session || !session.refresh_token) {
      return null;
    }

    try {
      this.oauth2Client.setCredentials({
        refresh_token: session.refresh_token,
      });

      const { credentials } = await this.oauth2Client.refreshAccessToken();
      
      if (!credentials.access_token) {
        throw new Error('No access token received from refresh');
      }

      const now = Date.now();
      const accessTokenExpiresAt = now + ((credentials.expiry_date || 0) - now);

      const db = await getDatabaseConnection();
      try {
        await db.run(
          `UPDATE google_sessions SET 
            access_token = ?, 
            access_token_expires_at = ?, 
            last_used_at = ?
          WHERE id = ?`,
          [credentials.access_token, accessTokenExpiresAt, now, sessionId]
        );
      } finally {
        releaseDatabaseConnection(db);
      }

      return await this.getSession(sessionId);
    } catch (error) {
      logger.error('Failed to refresh Google access token', {
        error: error instanceof Error ? error.message : String(error),
        sessionId,
      });
      return null;
    }
  }
}

let _googleAuthService: GoogleAuthService | null = null;

export const getGoogleAuthService = (): GoogleAuthService => {
  if (!_googleAuthService) {
    _googleAuthService = new GoogleAuthService();
  }
  return _googleAuthService;
};
