import { createLogger } from '../utils/logger.js';
import { PapiService, PapiConfig } from './papiService.js';

const logger = createLogger('signature-verification-service');

export interface SignatureVerificationResult {
  isValid: boolean;
  address: string;
  chain: string;
  method: 'papi' | 'polkadot-js' | 'fallback';
  error?: string;
}

export interface SignatureVerificationConfig {
  papi: PapiConfig;
  fallbackToPolkadotJs: boolean;
  preferredMethod: 'papi' | 'polkadot-js';
}

export class SignatureVerificationService {
  private papiService: PapiService | null = null;
  private config: SignatureVerificationConfig;
  private isInitialized = false;

  constructor(config: SignatureVerificationConfig) {
    this.config = config;
  }

  /**
   * Initialize the signature verification service
   */
  async initialize(): Promise<void> {
    try {
      // Initialize PAPI service
      this.papiService = new PapiService(this.config.papi);
      await this.papiService.initialize();

      this.isInitialized = true;

      logger.info('Signature verification service initialized', {
        preferredMethod: this.config.preferredMethod,
        fallbackToPolkadotJs: this.config.fallbackToPolkadotJs,
        papiAvailable: !!this.papiService,
      });
    } catch (error) {
      logger.error('Failed to initialize signature verification service', {
        error: error instanceof Error ? error.message : String(error),
      });

      if (this.config.fallbackToPolkadotJs) {
        logger.warn('Falling back to Polkadot.js signature verification');
        this.isInitialized = true;
      } else {
        throw error;
      }
    }
  }

  /**
   * Verify signature using the preferred method with fallback
   */
  async verifySignature(
    message: string,
    signature: string,
    address: string,
    chain: string = 'polkadot'
  ): Promise<SignatureVerificationResult> {
    if (!this.isInitialized) {
      throw new Error('Signature verification service not initialized');
    }

    // Try PAPI first if it's the preferred method
    if (this.config.preferredMethod === 'papi' && this.papiService) {
      try {
        const result = await this.papiService.verifySignature(message, signature, address, chain);
        
        if (result.isValid) {
          logger.info('PAPI signature verification successful', {
            address,
            chain,
            method: 'papi',
          });

          return {
            isValid: true,
            address,
            chain,
            method: 'papi',
          };
        } else {
          logger.warn('PAPI signature verification failed', {
            address,
            chain,
            error: result.error,
          });

          // Fall back to Polkadot.js if configured
          if (this.config.fallbackToPolkadotJs) {
            return await this.verifyWithPolkadotJs(message, signature, address, chain);
          }

          return {
            isValid: false,
            address,
            chain,
            method: 'papi',
            error: result.error,
          };
        }
      } catch (error) {
        logger.error('PAPI signature verification error', {
          address,
          chain,
          error: error instanceof Error ? error.message : String(error),
        });

        // Fall back to Polkadot.js if configured
        if (this.config.fallbackToPolkadotJs) {
          return await this.verifyWithPolkadotJs(message, signature, address, chain);
        }

        return {
          isValid: false,
          address,
          chain,
          method: 'papi',
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }

    // Try Polkadot.js first if it's the preferred method
    if (this.config.preferredMethod === 'polkadot-js') {
      return await this.verifyWithPolkadotJs(message, signature, address, chain);
    }

    // Default to PAPI if available
    if (this.papiService) {
      try {
        const result = await this.papiService.verifySignature(message, signature, address, chain);
        return {
          isValid: result.isValid,
          address,
          chain,
          method: 'papi',
          error: result.error,
        };
      } catch (error) {
        if (this.config.fallbackToPolkadotJs) {
          return await this.verifyWithPolkadotJs(message, signature, address, chain);
        }
        throw error;
      }
    }

    // Fallback to Polkadot.js
    return await this.verifyWithPolkadotJs(message, signature, address, chain);
  }

  /**
   * Verify signature using Polkadot.js (fallback method)
   */
  private async verifyWithPolkadotJs(
    message: string,
    signature: string,
    address: string,
    chain: string
  ): Promise<SignatureVerificationResult> {
    try {
      // Import Polkadot.js dynamically to avoid bundling issues
      const { Keyring } = await import('@polkadot/keyring');
      const { cryptoWaitReady } = await import('@polkadot/util-crypto');

      await cryptoWaitReady();

      const keyring = new Keyring({ type: 'sr25519' });
      const keyringPair = keyring.addFromAddress(address);

      const isValid = keyringPair.verify(message, signature, keyringPair.publicKey);

      logger.info('Polkadot.js signature verification completed', {
        address,
        chain,
        isValid,
        method: 'polkadot-js',
      });

      return {
        isValid,
        address,
        chain,
        method: 'polkadot-js',
      };
    } catch (error) {
      logger.error('Polkadot.js signature verification failed', {
        address,
        chain,
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        isValid: false,
        address,
        chain,
        method: 'polkadot-js',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get service status
   */
  getStatus(): {
    isInitialized: boolean;
    papiAvailable: boolean;
    preferredMethod: string;
    fallbackEnabled: boolean;
  } {
    return {
      isInitialized: this.isInitialized,
      papiAvailable: !!this.papiService,
      preferredMethod: this.config.preferredMethod,
      fallbackEnabled: this.config.fallbackToPolkadotJs,
    };
  }

  /**
   * Disconnect from all services
   */
  async disconnect(): Promise<void> {
    if (this.papiService) {
      await this.papiService.disconnect();
    }
    this.isInitialized = false;
  }
}
