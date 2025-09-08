import QRCode from 'qrcode';
import { ErrorService } from '@polkadot-auth/core';

export interface NovaQrAuthData {
  challengeId: string;
  message: string;
  address: string;
  deepLink: string;
  qrCodeDataUrl: string;
  expiresAt: number;
}

export interface NovaQrAuthConfig {
  baseUrl: string;
  timeout?: number; // in milliseconds, default 5 minutes
  pollInterval?: number; // in milliseconds, default 2 seconds
}

export class NovaQrAuthService {
  private config: NovaQrAuthConfig;
  private activeAuth: Map<string, NovaQrAuthData> = new Map();

  constructor(config: NovaQrAuthConfig) {
    this.config = {
      timeout: 5 * 60 * 1000, // 5 minutes
      pollInterval: 2000, // 2 seconds
      ...config,
    };
  }

  /**
   * Generate QR code for Nova Wallet mobile authentication
   */
  async generateQrAuth(
    challengeId: string,
    message: string,
    address: string
  ): Promise<NovaQrAuthData> {
    try {
      // Create deep link for Nova Wallet
      const deepLink = this.createNovaDeepLink(challengeId, message, address);
      
      // Generate QR code as data URL
      const qrCodeDataUrl = await QRCode.toDataURL(deepLink, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
        errorCorrectionLevel: 'M',
      });

      const authData: NovaQrAuthData = {
        challengeId,
        message,
        address,
        deepLink,
        qrCodeDataUrl,
        expiresAt: Date.now() + this.config.timeout!,
      };

      // Store active auth for polling
      this.activeAuth.set(challengeId, authData);

      // Auto-cleanup expired auths
      this.cleanupExpiredAuths();

      return authData;
    } catch (error) {
      throw ErrorService.createError(
        'QR_GENERATION_FAILED',
        'Failed to generate QR code for Nova Wallet authentication',
        error
      );
    }
  }

  /**
   * Poll for authentication completion
   */
  async pollForCompletion(challengeId: string): Promise<boolean> {
    const authData = this.activeAuth.get(challengeId);
    if (!authData) {
      throw ErrorService.createError(
        'AUTH_NOT_FOUND',
        'Authentication session not found'
      );
    }

    if (Date.now() > authData.expiresAt) {
      this.activeAuth.delete(challengeId);
      throw ErrorService.createError(
        'AUTH_EXPIRED',
        'Authentication session has expired'
      );
    }

    try {
      // Poll the SSO server for completion
      const response = await fetch(
        `${this.config.baseUrl}/auth/qr-status?challenge_id=${challengeId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return result.completed === true;
    } catch (error) {
      // Don't throw on network errors, just return false
      console.warn('Polling error:', error);
      return false;
    }
  }

  /**
   * Wait for authentication completion with polling
   */
  async waitForCompletion(challengeId: string): Promise<void> {
    const authData = this.activeAuth.get(challengeId);
    if (!authData) {
      throw ErrorService.createError(
        'AUTH_NOT_FOUND',
        'Authentication session not found'
      );
    }

    const startTime = Date.now();
    const timeout = this.config.timeout!;

    return new Promise((resolve, reject) => {
      const poll = async () => {
        try {
          // Check if expired
          if (Date.now() > authData.expiresAt) {
            this.activeAuth.delete(challengeId);
            reject(
              ErrorService.createError(
                'AUTH_EXPIRED',
                'Authentication session has expired'
              )
            );
            return;
          }

          // Check if completed
          const completed = await this.pollForCompletion(challengeId);
          if (completed) {
            this.activeAuth.delete(challengeId);
            resolve();
            return;
          }

          // Check timeout
          if (Date.now() - startTime > timeout) {
            this.activeAuth.delete(challengeId);
            reject(
              ErrorService.createError(
                'AUTH_TIMEOUT',
                'Authentication timed out'
              )
            );
            return;
          }

          // Continue polling
          setTimeout(poll, this.config.pollInterval);
        } catch (error) {
          reject(error);
        }
      };

      poll();
    });
  }

  /**
   * Create Nova Wallet deep link
   */
  private createNovaDeepLink(
    challengeId: string,
    message: string,
    address: string
  ): string {
    // Nova Wallet deep link format
    // This is a custom protocol that Nova Wallet should support
    const params = new URLSearchParams({
      action: 'sign_message',
      challenge_id: challengeId,
      message: message,
      address: address,
      callback: `${this.config.baseUrl}/auth/qr-callback`,
    });

    return `nova://auth?${params.toString()}`;
  }

  /**
   * Clean up expired authentication sessions
   */
  private cleanupExpiredAuths(): void {
    const now = Date.now();
    for (const [challengeId, authData] of this.activeAuth.entries()) {
      if (now > authData.expiresAt) {
        this.activeAuth.delete(challengeId);
      }
    }
  }

  /**
   * Get active authentication data
   */
  getAuthData(challengeId: string): NovaQrAuthData | undefined {
    return this.activeAuth.get(challengeId);
  }

  /**
   * Cancel authentication session
   */
  cancelAuth(challengeId: string): void {
    this.activeAuth.delete(challengeId);
  }

  /**
   * Get all active authentication sessions
   */
  getActiveAuths(): NovaQrAuthData[] {
    return Array.from(this.activeAuth.values());
  }
}

/**
 * Create a new Nova QR authentication service
 */
export function createNovaQrAuthService(config: NovaQrAuthConfig): NovaQrAuthService {
  return new NovaQrAuthService(config);
}
