import { ChainConfig } from '../types';

// Security-focused chain configuration with multiple RPC endpoints for redundancy
export const DEFAULT_CHAINS: ChainConfig[] = [
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

// Security-focused utility functions
export function validateChainConfig(chain: ChainConfig): boolean {
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
    if (
      chain.security.minConfirmationBlocks < 0 ||
      chain.security.maxRetries < 0 ||
      chain.security.timeout < 1000
    ) {
      return false;
    }
  }

  return true;
}

export function getSecureChainConfig(chainId: string): ChainConfig | null {
  const chain = getChainById(chainId);
  if (!chain || !validateChainConfig(chain)) {
    return null;
  }
  return chain;
}

export function getAllRpcUrls(chain: ChainConfig): string[] {
  const urls = [chain.rpcUrl];
  if (chain.backupRpcUrls) {
    urls.push(...chain.backupRpcUrls);
  }
  return urls;
}
