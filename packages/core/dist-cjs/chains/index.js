"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_CHAINS = void 0;
exports.getChainById = getChainById;
exports.getDefaultChain = getDefaultChain;
exports.getTestnetChains = getTestnetChains;
exports.getMainnetChains = getMainnetChains;
exports.DEFAULT_CHAINS = [
    {
        id: 'polkadot',
        name: 'Polkadot',
        rpcUrl: 'wss://rpc.polkadot.io',
        ss58Format: 0,
        decimals: 10,
        symbol: 'DOT',
        isTestnet: false,
    },
    {
        id: 'kusama',
        name: 'Kusama',
        rpcUrl: 'wss://kusama-rpc.polkadot.io',
        ss58Format: 2,
        decimals: 12,
        symbol: 'KSM',
        isTestnet: false,
    },
    {
        id: 'westend',
        name: 'Westend',
        rpcUrl: 'wss://westend-rpc.polkadot.io',
        ss58Format: 42,
        decimals: 12,
        symbol: 'WND',
        isTestnet: true,
    },
    {
        id: 'rococo',
        name: 'Rococo',
        rpcUrl: 'wss://rococo-rpc.polkadot.io',
        ss58Format: 42,
        decimals: 12,
        symbol: 'ROC',
        isTestnet: true,
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
//# sourceMappingURL=index.js.map