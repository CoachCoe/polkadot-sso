import { PolkadotAuthConfig, PolkadotAuthInstance } from './types';
export declare function createPolkadotAuth(config?: PolkadotAuthConfig): PolkadotAuthInstance;
export * from './types';
export { createCustomProvider, DEFAULT_PROVIDERS, getAvailableProviders, getProviderById, novaWalletProvider, polkadotJsProvider, subWalletProvider, talismanProvider, } from './providers';
export { DEFAULT_CHAINS, getChainById, getDefaultChain, getMainnetChains, getTestnetChains, } from './chains';
export { SIWEAuthService } from './auth/siwe';
export { createPapiClient, PapiClientService } from './services/papiClient';
export { WalletProviderService, walletProviderService } from './services/walletProviderService';
export { AuthService, authService } from './services/authService';
export { ErrorService } from './services/errorService';
export default createPolkadotAuth;
//# sourceMappingURL=index.d.ts.map