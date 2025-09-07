import { PolkadotAuthConfig, UserSession } from '../types';
export interface UsePolkadotAuthReturn {
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
    session: UserSession | null;
    availableWallets: string[];
    connect: (walletName?: string) => Promise<void>;
    disconnect: () => void;
    clearError: () => void;
    refreshSession: () => Promise<void>;
}
export declare function usePolkadotAuth(config: PolkadotAuthConfig): UsePolkadotAuthReturn;
//# sourceMappingURL=usePolkadotAuth.d.ts.map