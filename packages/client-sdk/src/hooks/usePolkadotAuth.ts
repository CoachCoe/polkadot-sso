import { useCallback, useEffect, useState } from 'react';
import { createPolkadotAuthClient } from '../PolkadotAuthClient';
import { PolkadotAuthConfig, UserSession } from '../types';
import { getAvailableWallets, getWalletAdapter } from '../walletAdapters';

export interface UsePolkadotAuthReturn {
  // State
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  session: UserSession | null;
  availableWallets: string[];

  // Actions
  connect: (walletName?: string) => Promise<void>;
  disconnect: () => void;
  clearError: () => void;
  refreshSession: () => Promise<void>;
}

export function usePolkadotAuth(config: PolkadotAuthConfig): UsePolkadotAuthReturn {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<UserSession | null>(null);
  const [availableWallets, setAvailableWallets] = useState<string[]>([]);
  const [authClient] = useState(() => createPolkadotAuthClient(config));

  // Initialize available wallets
  useEffect(() => {
    const wallets = getAvailableWallets().map(w => w.name);
    setAvailableWallets(wallets);
  }, []);

  // Check for existing session on mount
  useEffect(() => {
    const existingSession = authClient.getSession();
    if (existingSession && authClient.isAuthenticated()) {
      setSession(existingSession);
      setIsAuthenticated(true);
    }
  }, [authClient]);

  const connect = useCallback(
    async (walletName?: string) => {
      setIsLoading(true);
      setError(null);

      try {
        // Get available wallets
        const wallets = getAvailableWallets();
        if (wallets.length === 0) {
          throw new Error('No Polkadot wallets available. Please install a wallet extension.');
        }

        // Select wallet
        const selectedWallet = walletName ? getWalletAdapter(walletName) : wallets[0]; // Use first available wallet

        if (!selectedWallet) {
          throw new Error(`Wallet "${walletName}" not available`);
        }

        // Connect to wallet
        const signer = await selectedWallet.connect();
        const address = signer.getAddress();

        // Authenticate with SSO
        const userSession = await authClient.authenticate(address, signer);

        setSession(userSession);
        setIsAuthenticated(true);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Authentication failed';
        setError(errorMessage);
        console.error('Authentication error:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [authClient]
  );

  const disconnect = useCallback(() => {
    authClient.logout();
    setSession(null);
    setIsAuthenticated(false);
    setError(null);
  }, [authClient]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const refreshSession = useCallback(async () => {
    if (!session?.tokens?.refreshToken) {
      return;
    }

    setIsLoading(true);
    try {
      const newTokens = await authClient.refreshTokens(session.tokens.refreshToken);
      const updatedSession = {
        ...session,
        tokens: newTokens,
        lastUsedAt: Date.now(),
      };
      setSession(updatedSession);
    } catch (err) {
      console.error('Token refresh failed:', err);
      // If refresh fails, logout the user
      disconnect();
    } finally {
      setIsLoading(false);
    }
  }, [session, authClient, disconnect]);

  return {
    isAuthenticated,
    isLoading,
    error,
    session,
    availableWallets,
    connect,
    disconnect,
    clearError,
    refreshSession,
  };
}
