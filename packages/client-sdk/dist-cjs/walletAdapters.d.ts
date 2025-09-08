import { PolkadotWalletAdapter, WalletSigner } from './types';
import { NovaQrAuthService, NovaQrAuthData } from './novaQrAuth';
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
export declare class NovaWalletAdapter implements PolkadotWalletAdapter {
    name: string;
    private qrAuthService?;
    isAvailable(): boolean;
    /**
     * Set up QR authentication service
     */
    setQrAuthService(qrAuthService: NovaQrAuthService): void;
    /**
     * Connect using QR code authentication (mobile)
     */
    connectWithQr(challengeId: string, message: string, address: string): Promise<{
        qrData: NovaQrAuthData;
        waitForCompletion: () => Promise<void>;
    }>;
    /**
     * Connect using browser extension (if available)
     */
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
        injectedWeb3?: {
            [key: string]: any;
        };
        talismanEth?: any;
        SubWallet?: any;
    }
}
//# sourceMappingURL=walletAdapters.d.ts.map