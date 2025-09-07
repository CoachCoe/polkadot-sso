import { ChainConfig } from '../types';
export declare const DEFAULT_CHAINS: ChainConfig[];
export declare function getChainById(id: string): ChainConfig | undefined;
export declare function getDefaultChain(): ChainConfig;
export declare function getTestnetChains(): ChainConfig[];
export declare function getMainnetChains(): ChainConfig[];
export declare function validateChainConfig(chain: ChainConfig): boolean;
export declare function getSecureChainConfig(chainId: string): ChainConfig | null;
export declare function getAllRpcUrls(chain: ChainConfig): string[];
//# sourceMappingURL=index.d.ts.map