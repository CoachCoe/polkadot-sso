import { Session } from '@polkadot-auth/core';
import { UsePolkadotAuthReturn } from '../types';
export declare function usePolkadotAuth(): UsePolkadotAuthReturn;
export declare function usePolkadotAuthState(): {
    isConnected: boolean;
    address: string | null;
    session: Session | null;
    providers: never[];
    chains: never[];
    connect: (providerId: string) => Promise<void>;
    disconnect: () => Promise<void>;
    signMessage: (message: string) => Promise<string>;
    isLoading: boolean;
    error: string | null;
    clearError: () => void;
};
//# sourceMappingURL=usePolkadotAuth.d.ts.map