import { WalletSigner, PolkadotWalletAdapter } from './types';
export declare class PolkadotJsAdapter implements PolkadotWalletAdapter {
    name: string;
    isAvailable(): boolean;
    connect(): Promise<WalletSigner>;
}
export declare class TalismanAdapter implements PolkadotWalletAdapter {
    name: string;
    isAvailable(): boolean;
    connect(): Promise<WalletSigner>;
}
export declare class SubWalletAdapter implements PolkadotWalletAdapter {
    name: string;
    isAvailable(): boolean;
    connect(): Promise<WalletSigner>;
}
export declare const defaultWalletAdapters: PolkadotWalletAdapter[];
export declare function getAvailableWallets(): PolkadotWalletAdapter[];
export declare function getWalletAdapter(name: string): PolkadotWalletAdapter | null;
declare global {
    interface Window {
        polkadotExtensionDapp: {
            web3Enable: (appName: string) => Promise<any[]>;
            web3Accounts: () => Promise<any[]>;
            web3FromAddress: (address: string) => Promise<any>;
        };
        talismanEth?: any;
        SubWallet?: any;
    }
}
//# sourceMappingURL=walletAdapters.d.ts.map