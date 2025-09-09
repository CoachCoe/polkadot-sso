"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateConfig = exports.getConfig = exports.configManager = exports.ProductionConfigManager = exports.RemittanceService = exports.RemittanceAuthService = exports.ExchangeRateService = exports.DEFAULT_EXCHANGE_RATE_CONFIG = exports.createExchangeRateService = exports.ComplianceService = exports.walletProviderService = exports.WalletProviderService = exports.PapiClientService = exports.createPapiClient = exports.ErrorService = exports.authService = exports.AuthService = exports.SIWEAuthService = exports.validateChainConfig = exports.getTestnetChains = exports.getSecureChainConfig = exports.getMainnetChains = exports.getDefaultChain = exports.getChainById = exports.getAllRpcUrls = exports.DEFAULT_CHAINS = exports.talismanProvider = exports.subWalletProvider = exports.polkadotJsProvider = exports.novaWalletProvider = exports.getProviderById = exports.getAvailableProviders = exports.DEFAULT_PROVIDERS = exports.createCustomProvider = void 0;
exports.createPolkadotAuth = createPolkadotAuth;
const siwe_1 = require("./auth/siwe");
const chains_1 = require("./chains");
const providers_1 = require("./providers");
const crypto_1 = require("./utils/crypto");
function createPolkadotAuth(config = {}) {
    const finalConfig = {
        defaultChain: 'polkadot',
        chains: chains_1.DEFAULT_CHAINS,
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
    const siweAuth = new siwe_1.SIWEAuthService(finalConfig.defaultChain);
    const enabledProviders = [];
    if (finalConfig.providers) {
        for (const providerId of finalConfig.providers) {
            const provider = (0, providers_1.getProviderById)(providerId);
            if (provider) {
                enabledProviders.push(provider);
            }
        }
    }
    if (finalConfig.customProviders) {
        enabledProviders.push(...finalConfig.customProviders);
    }
    const availableChains = finalConfig.chains || chains_1.DEFAULT_CHAINS;
    return {
        config: finalConfig,
        async createChallenge(clientId, userAddress) {
            const chainId = finalConfig.defaultChain;
            return siweAuth.createChallenge(clientId, userAddress, chainId);
        },
        async verifySignature(signature, challenge) {
            return siweAuth.verifySIWESignature(signature, challenge);
        },
        async createSession(address, clientId, parsedMessage) {
            const sessionId = (0, crypto_1.randomUUID)();
            const accessToken = Array.from((0, crypto_1.randomBytes)(32))
                .map(b => b.toString(16).padStart(2, '0'))
                .join('');
            const refreshToken = Array.from((0, crypto_1.randomBytes)(32))
                .map(b => b.toString(16).padStart(2, '0'))
                .join('');
            const fingerprint = Array.from((0, crypto_1.randomBytes)(16))
                .map(b => b.toString(16).padStart(2, '0'))
                .join('');
            const now = Date.now();
            const accessTokenExpiresAt = now + 15 * 60 * 1000; // 15 minutes
            const refreshTokenExpiresAt = now + 7 * 24 * 60 * 60 * 1000; // 7 days
            const session = {
                id: sessionId,
                address,
                clientId,
                accessToken,
                refreshToken,
                accessTokenId: (0, crypto_1.randomUUID)(),
                refreshTokenId: (0, crypto_1.randomUUID)(),
                fingerprint,
                accessTokenExpiresAt,
                refreshTokenExpiresAt,
                createdAt: now,
                lastUsedAt: now,
                isActive: true,
            };
            return session;
        },
        async getSession(accessToken) {
            return null;
        },
        async refreshSession(refreshToken) {
            return null;
        },
        async invalidateSession(sessionId) { },
        getProviders() {
            return enabledProviders;
        },
        getChains() {
            return availableChains;
        },
    };
}
__exportStar(require("./types"), exports);
var providers_2 = require("./providers");
Object.defineProperty(exports, "createCustomProvider", { enumerable: true, get: function () { return providers_2.createCustomProvider; } });
Object.defineProperty(exports, "DEFAULT_PROVIDERS", { enumerable: true, get: function () { return providers_2.DEFAULT_PROVIDERS; } });
Object.defineProperty(exports, "getAvailableProviders", { enumerable: true, get: function () { return providers_2.getAvailableProviders; } });
Object.defineProperty(exports, "getProviderById", { enumerable: true, get: function () { return providers_2.getProviderById; } });
Object.defineProperty(exports, "novaWalletProvider", { enumerable: true, get: function () { return providers_2.novaWalletProvider; } });
Object.defineProperty(exports, "polkadotJsProvider", { enumerable: true, get: function () { return providers_2.polkadotJsProvider; } });
Object.defineProperty(exports, "subWalletProvider", { enumerable: true, get: function () { return providers_2.subWalletProvider; } });
Object.defineProperty(exports, "talismanProvider", { enumerable: true, get: function () { return providers_2.talismanProvider; } });
var chains_2 = require("./chains");
Object.defineProperty(exports, "DEFAULT_CHAINS", { enumerable: true, get: function () { return chains_2.DEFAULT_CHAINS; } });
Object.defineProperty(exports, "getAllRpcUrls", { enumerable: true, get: function () { return chains_2.getAllRpcUrls; } });
Object.defineProperty(exports, "getChainById", { enumerable: true, get: function () { return chains_2.getChainById; } });
Object.defineProperty(exports, "getDefaultChain", { enumerable: true, get: function () { return chains_2.getDefaultChain; } });
Object.defineProperty(exports, "getMainnetChains", { enumerable: true, get: function () { return chains_2.getMainnetChains; } });
Object.defineProperty(exports, "getSecureChainConfig", { enumerable: true, get: function () { return chains_2.getSecureChainConfig; } });
Object.defineProperty(exports, "getTestnetChains", { enumerable: true, get: function () { return chains_2.getTestnetChains; } });
Object.defineProperty(exports, "validateChainConfig", { enumerable: true, get: function () { return chains_2.validateChainConfig; } });
var siwe_2 = require("./auth/siwe");
Object.defineProperty(exports, "SIWEAuthService", { enumerable: true, get: function () { return siwe_2.SIWEAuthService; } });
var authService_1 = require("./services/authService");
Object.defineProperty(exports, "AuthService", { enumerable: true, get: function () { return authService_1.AuthService; } });
Object.defineProperty(exports, "authService", { enumerable: true, get: function () { return authService_1.authService; } });
var errorService_1 = require("./services/errorService");
Object.defineProperty(exports, "ErrorService", { enumerable: true, get: function () { return errorService_1.ErrorService; } });
var papiClient_1 = require("./services/papiClient");
Object.defineProperty(exports, "createPapiClient", { enumerable: true, get: function () { return papiClient_1.createPapiClient; } });
Object.defineProperty(exports, "PapiClientService", { enumerable: true, get: function () { return papiClient_1.PapiClientService; } });
var walletProviderService_1 = require("./services/walletProviderService");
Object.defineProperty(exports, "WalletProviderService", { enumerable: true, get: function () { return walletProviderService_1.WalletProviderService; } });
Object.defineProperty(exports, "walletProviderService", { enumerable: true, get: function () { return walletProviderService_1.walletProviderService; } });
// Remittance services
var complianceService_1 = require("./services/complianceService");
Object.defineProperty(exports, "ComplianceService", { enumerable: true, get: function () { return complianceService_1.ComplianceService; } });
var exchangeRateService_1 = require("./services/exchangeRateService");
Object.defineProperty(exports, "createExchangeRateService", { enumerable: true, get: function () { return exchangeRateService_1.createExchangeRateService; } });
Object.defineProperty(exports, "DEFAULT_EXCHANGE_RATE_CONFIG", { enumerable: true, get: function () { return exchangeRateService_1.DEFAULT_EXCHANGE_RATE_CONFIG; } });
Object.defineProperty(exports, "ExchangeRateService", { enumerable: true, get: function () { return exchangeRateService_1.ExchangeRateService; } });
var remittanceAuthService_1 = require("./services/remittanceAuthService");
Object.defineProperty(exports, "RemittanceAuthService", { enumerable: true, get: function () { return remittanceAuthService_1.RemittanceAuthService; } });
var remittanceService_1 = require("./services/remittanceService");
Object.defineProperty(exports, "RemittanceService", { enumerable: true, get: function () { return remittanceService_1.RemittanceService; } });
// Configuration
var productionConfig_1 = require("./config/productionConfig");
Object.defineProperty(exports, "ProductionConfigManager", { enumerable: true, get: function () { return productionConfig_1.ProductionConfigManager; } });
Object.defineProperty(exports, "configManager", { enumerable: true, get: function () { return productionConfig_1.configManager; } });
Object.defineProperty(exports, "getConfig", { enumerable: true, get: function () { return productionConfig_1.getConfig; } });
Object.defineProperty(exports, "validateConfig", { enumerable: true, get: function () { return productionConfig_1.validateConfig; } });
exports.default = createPolkadotAuth;
//# sourceMappingURL=index.js.map