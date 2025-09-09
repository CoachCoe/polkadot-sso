import { SIWEAuthService } from './auth/siwe';
import { DEFAULT_CHAINS } from './chains';
import { getProviderById } from './providers';
import {
  AuthResult,
  ChainConfig,
  Challenge,
  PolkadotAuthConfig,
  PolkadotAuthInstance,
  Session,
  SIWEMessage,
  SIWESignature,
  WalletProvider,
} from './types';
import { randomBytes, randomUUID } from './utils/crypto';

export function createPolkadotAuth(config: PolkadotAuthConfig = {}): PolkadotAuthInstance {
  const finalConfig: PolkadotAuthConfig = {
    defaultChain: 'polkadot',
    chains: DEFAULT_CHAINS,
    providers: ['polkadot-js', 'talisman', 'subwallet', 'nova'],
    session: {
      strategy: 'jwt',
      maxAge: 7 * 24 * 60 * 60,
    },
    database: {
      type: 'sqlite',
    },
    security: {
      enableNonce: true,
      enableDomainBinding: true,
      enableRequestTracking: true,
      challengeExpiration: 5 * 60, // 5 minutes
    },
    ...config,
  };

  const siweAuth = new SIWEAuthService(finalConfig.defaultChain);

  const enabledProviders: WalletProvider[] = [];

  if (finalConfig.providers) {
    for (const providerId of finalConfig.providers) {
      const provider = getProviderById(providerId);
      if (provider) {
        enabledProviders.push(provider);
      }
    }
  }

  if (finalConfig.customProviders) {
    enabledProviders.push(...finalConfig.customProviders);
  }

  const availableChains = finalConfig.chains || DEFAULT_CHAINS;

  return {
    config: finalConfig,

    async createChallenge(clientId: string, userAddress?: string): Promise<Challenge> {
      const chainId = finalConfig.defaultChain;
      return siweAuth.createChallenge(clientId, userAddress, chainId);
    },

    async verifySignature(signature: SIWESignature, challenge: Challenge): Promise<AuthResult> {
      return siweAuth.verifySIWESignature(signature, challenge);
    },

    async createSession(
      address: string,
      clientId: string,
      parsedMessage: SIWEMessage
    ): Promise<Session> {
      const sessionId = randomUUID();
      const accessToken = Array.from(randomBytes(32))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      const refreshToken = Array.from(randomBytes(32))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      const fingerprint = Array.from(randomBytes(16))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      const now = Date.now();
      const accessTokenExpiresAt = now + 15 * 60 * 1000; // 15 minutes
      const refreshTokenExpiresAt = now + 7 * 24 * 60 * 60 * 1000; // 7 days

      const session: Session = {
        id: sessionId,
        address,
        clientId,
        accessToken,
        refreshToken,
        accessTokenId: randomUUID(),
        refreshTokenId: randomUUID(),
        fingerprint,
        accessTokenExpiresAt,
        refreshTokenExpiresAt,
        createdAt: now,
        lastUsedAt: now,
        isActive: true,
      };

      return session;
    },

    async getSession(accessToken: string): Promise<Session | null> {
      return null;
    },

    async refreshSession(refreshToken: string): Promise<Session | null> {
      return null;
    },

    async invalidateSession(sessionId: string): Promise<void> {},

    getProviders(): WalletProvider[] {
      return enabledProviders;
    },

    getChains(): ChainConfig[] {
      return availableChains;
    },
  };
}

export * from './types';

export {
  createCustomProvider,
  DEFAULT_PROVIDERS,
  getAvailableProviders,
  getProviderById,
  novaWalletProvider,
  polkadotJsProvider,
  subWalletProvider,
  talismanProvider,
} from './providers';

export {
  DEFAULT_CHAINS,
  getAllRpcUrls,
  getChainById,
  getDefaultChain,
  getMainnetChains,
  getSecureChainConfig,
  getTestnetChains,
  validateChainConfig,
} from './chains';

export { SIWEAuthService } from './auth/siwe';

export { AuthService, authService } from './services/authService';
export { ErrorService } from './services/errorService';
export { createPapiClient, PapiClientService } from './services/papiClient';
export { WalletProviderService, walletProviderService } from './services/walletProviderService';

// Remittance services
export { ComplianceService } from './services/complianceService';
export {
  createExchangeRateService,
  DEFAULT_EXCHANGE_RATE_CONFIG,
  ExchangeRateService,
} from './services/exchangeRateService';
export type { ExchangeRateConfig, ExchangeRateProvider } from './services/exchangeRateService';
export { RemittanceAuthService } from './services/remittanceAuthService';
export { RemittanceService } from './services/remittanceService';

// Configuration
export {
  ProductionConfigManager,
  configManager,
  getConfig,
  validateConfig,
} from './config/productionConfig';
export type {
  ProductionConfig,
  SecurityConfig,
  DatabaseConfig,
  RemittanceConfig,
  ChainConfig,
  LoggingConfig,
} from './config/productionConfig';

export default createPolkadotAuth;
