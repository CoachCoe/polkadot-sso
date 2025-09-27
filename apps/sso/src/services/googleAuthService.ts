import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('google-auth-service');

export interface GoogleAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

export interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  picture?: string;
  verified_email: boolean;
}

export interface GoogleAuthChallenge {
  challengeId: string;
  authUrl: string;
  state: string;
  nonce: string;
  expiresAt: number;
}

export interface GoogleAuthResponse {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  user: GoogleUserInfo;
}

export class GoogleAuthService {
  private oauth2Client: OAuth2Client;
  private jwtSecret: string;

  constructor(config: GoogleAuthConfig, jwtSecret: string) {
    this.oauth2Client = new OAuth2Client(
      config.clientId,
      config.clientSecret,
      config.redirectUri
    );
    this.jwtSecret = jwtSecret;
  }

  /**
   * Generate a Google OAuth2 challenge
   */
  generateChallenge(): GoogleAuthChallenge {
    const challengeId = crypto.randomUUID();
    const state = crypto.randomBytes(32).toString('hex');
    const nonce = crypto.randomBytes(16).toString('hex');
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['openid', 'email', 'profile'],
      state: `${challengeId}:${state}:${nonce}`,
      prompt: 'consent',
    });

    logger.info('Google OAuth2 challenge generated', {
      challengeId,
      state: state.substring(0, 8) + '...',
      nonce: nonce.substring(0, 8) + '...',
      expiresAt,
    });

    return {
      challengeId,
      authUrl,
      state,
      nonce,
      expiresAt,
    };
  }

  /**
   * Exchange authorization code for tokens and user info
   */
  async exchangeCodeForTokens(
    code: string,
    state: string,
    challengeId: string
  ): Promise<GoogleAuthResponse> {
    try {
      // Verify state parameter
      const [expectedChallengeId, expectedState, nonce] = state.split(':');
      if (expectedChallengeId !== challengeId) {
        throw new Error('Invalid challenge ID in state parameter');
      }

      // Exchange code for tokens
      const { tokens } = await this.oauth2Client.getToken(code);
      
      if (!tokens.access_token) {
        throw new Error('No access token received from Google');
      }

      // Get user info from Google
      this.oauth2Client.setCredentials(tokens);
      const ticket = await this.oauth2Client.verifyIdToken({
        idToken: tokens.id_token!,
        audience: this.oauth2Client._clientId,
      });

      const payload = ticket.getPayload();
      if (!payload) {
        throw new Error('Invalid ID token payload');
      }

      const userInfo: GoogleUserInfo = {
        id: payload.sub,
        email: payload.email!,
        name: payload.name!,
        picture: payload.picture,
        verified_email: payload.email_verified || false,
      };

      logger.info('Google OAuth2 tokens exchanged successfully', {
        challengeId,
        userId: userInfo.id,
        email: userInfo.email,
        verified: userInfo.verified_email,
      });

      return {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || undefined,
        expiresIn: tokens.expiry_date ? Math.floor((tokens.expiry_date - Date.now()) / 1000) : 3600,
        user: userInfo,
      };
    } catch (error) {
      logger.error('Failed to exchange Google OAuth2 code for tokens', {
        challengeId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Generate JWT token for authenticated Google user
   */
  generateJWT(userInfo: GoogleUserInfo, nonce: string): string {
    const payload = {
      sub: userInfo.id,
      authType: 'google',
      provider: 'google',
      email: userInfo.email,
      name: userInfo.name,
      picture: userInfo.picture,
      verified: userInfo.verified_email,
      nonce,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
    };

    const token = jwt.sign(payload, this.jwtSecret, {
      algorithm: 'HS256',
    });

    logger.info('JWT token generated for Google user', {
      userId: userInfo.id,
      email: userInfo.email,
      exp: payload.exp,
    });

    return token;
  }

  /**
   * Verify Google JWT token
   */
  verifyJWT(token: string): any {
    try {
      const decoded = jwt.verify(token, this.jwtSecret, {
        algorithms: ['HS256'],
      });

      logger.info('JWT token verified for Google user', {
        userId: (decoded as any).sub,
        authType: (decoded as any).authType,
      });

      return decoded;
    } catch (error) {
      logger.error('Failed to verify JWT token', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Validate Google OAuth2 configuration
   */
  static validateConfig(config: Partial<GoogleAuthConfig>): GoogleAuthConfig {
    if (!config.clientId) {
      throw new Error('Google OAuth2 client ID is required');
    }
    if (!config.clientSecret) {
      throw new Error('Google OAuth2 client secret is required');
    }
    if (!config.redirectUri) {
      throw new Error('Google OAuth2 redirect URI is required');
    }

    return {
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      redirectUri: config.redirectUri,
      scopes: config.scopes || ['openid', 'email', 'profile'],
    };
  }
}
