import { PolkadotAuthConfig, PolkadotAuthInstance } from './types';
export declare function createPolkadotAuth(config?: PolkadotAuthConfig): PolkadotAuthInstance;
export * from './types';
export { createCustomProvider, DEFAULT_PROVIDERS, getAvailableProviders, getProviderById, novaWalletProvider, polkadotJsProvider, subWalletProvider, talismanProvider } from './providers';
export { DEFAULT_CHAINS, getAllRpcUrls, getChainById, getDefaultChain, getMainnetChains, getSecureChainConfig, getTestnetChains, validateChainConfig } from './chains';
export { SIWEAuthService } from './auth/siwe';
export { AuthService, authService } from './services/authService';
export { ErrorService } from './services/errorService';
export { createPapiClient, PapiClientService } from './services/papiClient';
export { WalletProviderService, walletProviderService } from './services/walletProviderService';
export { ComplianceService } from './services/complianceService';
export { createExchangeRateService, DEFAULT_EXCHANGE_RATE_CONFIG, ExchangeRateService } from './services/exchangeRateService';
export type { ExchangeRateConfig, ExchangeRateProvider } from './services/exchangeRateService';
export { RemittanceAuthService } from './services/remittanceAuthService';
export { RemittanceService } from './services/remittanceService';
export { ProductionConfigManager, configManager, getConfig, validateConfig } from './config/productionConfig';
export type { ProductionConfig, SecurityConfig, DatabaseConfig, RemittanceConfig, ChainConfig, LoggingConfig } from './config/productionConfig';
export default createPolkadotAuth;
//# sourceMappingURL=index.d.ts.map