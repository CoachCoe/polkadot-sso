"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_CHAINS = void 0;
exports.getChainById = getChainById;
exports.getDefaultChain = getDefaultChain;
exports.getTestnetChains = getTestnetChains;
exports.getMainnetChains = getMainnetChains;
exports.validateChainConfig = validateChainConfig;
exports.getSecureChainConfig = getSecureChainConfig;
exports.getAllRpcUrls = getAllRpcUrls;
// Security-focused chain configuration with multiple RPC endpoints for redundancy
exports.DEFAULT_CHAINS = [
    {
        id: 'polkadot',
        name: 'Polkadot',
        rpcUrl: 'wss://rpc.polkadot.io',
        ss58Format: 0,
        decimals: 10,
        symbol: 'DOT',
        isTestnet: false,
        // Security: Multiple RPC endpoints for redundancy and failover
        backupRpcUrls: [
            'wss://polkadot.api.onfinality.io/public-ws',
            'wss://polkadot-rpc.dwellir.com',
            'wss://rpc-polkadot.luckyfriday.io',
        ],
        // Security: Chain-specific security settings
        security: {
            minConfirmationBlocks: 1,
            maxRetries: 3,
            timeout: 30000,
            enableStrictValidation: true,
        },
    },
    {
        id: 'kusama',
        name: 'Kusama',
        rpcUrl: 'wss://kusama-rpc.polkadot.io',
        ss58Format: 2,
        decimals: 12,
        symbol: 'KSM',
        isTestnet: false,
        backupRpcUrls: [
            'wss://kusama.api.onfinality.io/public-ws',
            'wss://kusama-rpc.dwellir.com',
            'wss://rpc-kusama.luckyfriday.io',
        ],
        security: {
            minConfirmationBlocks: 1,
            maxRetries: 3,
            timeout: 30000,
            enableStrictValidation: true,
        },
    },
    {
        id: 'westend',
        name: 'Westend',
        rpcUrl: 'wss://westend-rpc.polkadot.io',
        ss58Format: 42,
        decimals: 12,
        symbol: 'WND',
        isTestnet: true,
        backupRpcUrls: ['wss://westend.api.onfinality.io/public-ws', 'wss://westend-rpc.dwellir.com'],
        security: {
            minConfirmationBlocks: 1,
            maxRetries: 3,
            timeout: 30000,
            enableStrictValidation: false, // More lenient for testnets
        },
    },
    {
        id: 'rococo',
        name: 'Rococo',
        rpcUrl: 'wss://rococo-rpc.polkadot.io',
        ss58Format: 42,
        decimals: 12,
        symbol: 'ROC',
        isTestnet: true,
        backupRpcUrls: ['wss://rococo.api.onfinality.io/public-ws'],
        security: {
            minConfirmationBlocks: 1,
            maxRetries: 3,
            timeout: 30000,
            enableStrictValidation: false, // More lenient for testnets
        },
    },
];
function getChainById(id) {
    return exports.DEFAULT_CHAINS.find(chain => chain.id === id);
}
function getDefaultChain() {
    return exports.DEFAULT_CHAINS[0]; // Polkadot
}
function getTestnetChains() {
    return exports.DEFAULT_CHAINS.filter(chain => chain.isTestnet);
}
function getMainnetChains() {
    return exports.DEFAULT_CHAINS.filter(chain => !chain.isTestnet);
}
// Security-focused utility functions
function validateChainConfig(chain) {
    // Security: Validate RPC URL format
    if (!chain.rpcUrl || !chain.rpcUrl.startsWith('wss://')) {
        return false;
    }
    // Security: Validate backup RPC URLs if provided
    if (chain.backupRpcUrls) {
        for (const url of chain.backupRpcUrls) {
            if (!url.startsWith('wss://')) {
                return false;
            }
        }
    }
    // Security: Validate security configuration
    if (chain.security) {
        if (chain.security.minConfirmationBlocks < 0 ||
            chain.security.maxRetries < 0 ||
            chain.security.timeout < 1000) {
            return false;
        }
    }
    return true;
}
function getSecureChainConfig(chainId) {
    const chain = getChainById(chainId);
    if (!chain || !validateChainConfig(chain)) {
        return null;
    }
    return chain;
}
function getAllRpcUrls(chain) {
    const urls = [chain.rpcUrl];
    if (chain.backupRpcUrls) {
        urls.push(...chain.backupRpcUrls);
    }
    return urls;
}
//# sourceMappingURL=index.js.map