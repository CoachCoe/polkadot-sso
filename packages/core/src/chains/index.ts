import { ChainConfig } from '../types';

export const DEFAULT_CHAINS: ChainConfig[] = [
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

export function getChainById(id: string): ChainConfig | undefined {
  return DEFAULT_CHAINS.find(chain => chain.id === id);
}

export function getDefaultChain(): ChainConfig {
  return DEFAULT_CHAINS[0]; // Polkadot
}

export function getTestnetChains(): ChainConfig[] {
  return DEFAULT_CHAINS.filter(chain => chain.isTestnet);
}

export function getMainnetChains(): ChainConfig[] {
  return DEFAULT_CHAINS.filter(chain => !chain.isTestnet);
}
