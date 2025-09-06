import { WalletProvider } from '../types';
declare global {
    interface Window {
        injectedWeb3?: {
            [key: string]: any;
        };
    }
}
export declare const polkadotJsProvider: WalletProvider;
export declare const talismanProvider: WalletProvider;
export declare const subWalletProvider: WalletProvider;
export declare const novaWalletProvider: WalletProvider;
export declare const DEFAULT_PROVIDERS: WalletProvider[];
export declare function getProviderById(id: string): WalletProvider | undefined;
export declare function getAvailableProviders(): Promise<WalletProvider[]>;
export declare function createCustomProvider(config: Partial<WalletProvider>): WalletProvider;
//# sourceMappingURL=index.d.ts.map