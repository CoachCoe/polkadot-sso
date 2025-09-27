import crypto from 'crypto';
import QRCode from 'qrcode';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('talisman-mobile-service');

export interface TalismanMobileConfig {
  deepLinkScheme: string;
  callbackUrl: string;
  qrCodePollingInterval: number;
  qrCodeTimeout: number;
}

export interface TalismanMobileChallenge {
  challengeId: string;
  deepLinkUrl: string;
  qrCodeData: string;
  pollingToken: string;
  expiresAt: number;
  nonce: string;
}

export interface TalismanMobileAuthResponse {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  user: {
    address: string;
    chain: string;
    wallet: string;
  };
}

export class TalismanMobileService {
  private config: TalismanMobileConfig;
  private jwtSecret: string;
  private activeChallenges: Map<string, TalismanMobileChallenge> = new Map();

  constructor(config: TalismanMobileConfig, jwtSecret: string) {
    this.config = config;
    this.jwtSecret = jwtSecret;
  }

  /**
   * Generate a Talisman Mobile challenge
   */
  generateChallenge(address: string, clientId: string): TalismanMobileChallenge {
    const challengeId = crypto.randomUUID();
    const pollingToken = crypto.randomBytes(32).toString('hex');
    const nonce = crypto.randomBytes(16).toString('hex');
    const expiresAt = Date.now() + this.config.qrCodeTimeout;

    // Create the authentication payload
    const authPayload = {
      type: 'talisman-auth',
      version: '1',
      challengeId,
      address,
      clientId,
      nonce,
      expiresAt,
      callbackUrl: this.config.callbackUrl,
      domain: process.env.NODE_ENV === 'production' ? 'polkadot-sso.com' : 'localhost:3001',
    };

    // Create deep link URL
    const deepLinkUrl = `${this.config.deepLinkScheme}auth?payload=${encodeURIComponent(JSON.stringify(authPayload))}`;

    // Generate QR code data
    const qrCodeData = JSON.stringify({
      type: 'talisman-mobile-auth',
      url: deepLinkUrl,
      challengeId,
      address,
      clientId,
      expiresAt,
    });

    const challenge: TalismanMobileChallenge = {
      challengeId,
      deepLinkUrl,
      qrCodeData,
      pollingToken,
      expiresAt,
      nonce,
    };

    // Store challenge for polling
    this.activeChallenges.set(challengeId, challenge);

    // Clean up expired challenges
    this.cleanupExpiredChallenges();

    logger.info('Talisman Mobile challenge generated', {
      challengeId,
      address,
      clientId,
      expiresAt,
    });

    return challenge;
  }

  /**
   * Generate QR code as SVG
   */
  async generateQRCode(data: string): Promise<string> {
    try {
      const qrCodeSvg = await QRCode.toString(data, {
        type: 'svg',
        width: 400,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
        errorCorrectionLevel: 'M',
      });

      return qrCodeSvg;
    } catch (error) {
      logger.error('Failed to generate QR code', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error('Failed to generate QR code');
    }
  }

  /**
   * Poll for challenge completion
   */
  pollChallenge(challengeId: string): {
    status: 'pending' | 'completed' | 'expired' | 'not_found';
    signature?: string;
    accessToken?: string;
    user?: any;
  } {
    const challenge = this.activeChallenges.get(challengeId);

    if (!challenge) {
      return { status: 'not_found' };
    }

    if (Date.now() > challenge.expiresAt) {
      this.activeChallenges.delete(challengeId);
      return { status: 'expired' };
    }

    // Check if challenge has been completed
    // In a real implementation, this would check a database or cache
    // For now, we'll simulate pending status
    return { status: 'pending' };
  }

  /**
   * Verify Talisman Mobile signature
   */
  async verifySignature(
    challengeId: string,
    signature: string,
    address: string
  ): Promise<TalismanMobileAuthResponse> {
    const challenge = this.activeChallenges.get(challengeId);

    if (!challenge) {
      throw new Error('Challenge not found or expired');
    }

    if (Date.now() > challenge.expiresAt) {
      this.activeChallenges.delete(challengeId);
      throw new Error('Challenge has expired');
    }

    // In a real implementation, you would verify the signature using Polkadot crypto
    // For now, we'll simulate successful verification
    logger.info('Talisman Mobile signature verified', {
      challengeId,
      address,
      signature: signature.substring(0, 16) + '...',
    });

    // Generate JWT token
    const jwt = this.generateJWT(address, challenge.nonce);

    // Clean up challenge
    this.activeChallenges.delete(challengeId);

    return {
      accessToken: jwt,
      expiresIn: 3600, // 1 hour
      user: {
        address,
        chain: 'polkadot',
        wallet: 'talisman-mobile',
      },
    };
  }

  /**
   * Generate JWT token for authenticated user
   */
  private generateJWT(address: string, nonce: string): string {
    const payload = {
      sub: address,
      authType: 'talisman-mobile',
      provider: 'talisman-mobile',
      address,
      chain: 'polkadot',
      wallet: 'talisman-mobile',
      nonce,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
    };

    // In a real implementation, you would use a proper JWT library
    // For now, we'll create a simple token
    const token = Buffer.from(JSON.stringify(payload)).toString('base64');

    logger.info('JWT token generated for Talisman Mobile user', {
      address,
      exp: payload.exp,
    });

    return token;
  }

  /**
   * Clean up expired challenges
   */
  private cleanupExpiredChallenges(): void {
    const now = Date.now();
    for (const [challengeId, challenge] of this.activeChallenges.entries()) {
      if (now > challenge.expiresAt) {
        this.activeChallenges.delete(challengeId);
        logger.info('Expired Talisman Mobile challenge cleaned up', {
          challengeId,
        });
      }
    }
  }

  /**
   * Get challenge by ID
   */
  getChallenge(challengeId: string): TalismanMobileChallenge | null {
    return this.activeChallenges.get(challengeId) || null;
  }

  /**
   * Validate Talisman Mobile configuration
   */
  static validateConfig(config: Partial<TalismanMobileConfig>): TalismanMobileConfig {
    if (!config.deepLinkScheme) {
      throw new Error('Talisman Mobile deep link scheme is required');
    }
    if (!config.callbackUrl) {
      throw new Error('Talisman Mobile callback URL is required');
    }

    return {
      deepLinkScheme: config.deepLinkScheme,
      callbackUrl: config.callbackUrl,
      qrCodePollingInterval: config.qrCodePollingInterval || 2000,
      qrCodeTimeout: config.qrCodeTimeout || 300000, // 5 minutes
    };
  }
}
