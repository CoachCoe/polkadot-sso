import { Session } from '@polkadot-auth/core';
import { useCallback, useContext, useState } from 'react';
import { PolkadotAuthContext } from '../context/PolkadotAuthContext';
import { UsePolkadotAuthReturn } from '../types';

export function usePolkadotAuth(): UsePolkadotAuthReturn {
  const context = useContext(PolkadotAuthContext);

  if (!context) {
    throw new Error('usePolkadotAuth must be used within a PolkadotAuthProvider');
  }

  return context;
}

export function usePolkadotAuthState() {
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const connect = useCallback(async (providerId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // Use real wallet connection instead of mock data
      const { web3Enable, web3Accounts } = await import('@polkadot/extension-dapp');
      
      const extensions = await web3Enable('T-REX Demo dApp');
      if (extensions.length === 0) {
        throw new Error('No Polkadot.js Extension found');
      }

      const accounts = await web3Accounts();
      if (accounts.length === 0) {
        throw new Error('No accounts found');
      }

      // If multiple accounts, let the user choose (for now, use the first one)
      // TODO: Implement account selection UI
      const account = accounts[0];
      const realAddress = account.address;
      
      console.log('Available accounts:', accounts.map(acc => ({ 
        address: acc.address, 
        name: acc.meta.name 
      })));
      const realSession: Session = {
        id: Math.random().toString(36).substr(2, 9),
        address: realAddress,
        accountName: account.meta.name || `Account ${realAddress.slice(0, 6)}...${realAddress.slice(-4)}`,
        clientId: 'real-client',
        accessToken: 'real-access-token',
        refreshToken: 'real-refresh-token',
        accessTokenId: 'real-access-token-id',
        refreshTokenId: 'real-refresh-token-id',
        fingerprint: 'real-fingerprint',
        accessTokenExpiresAt: Date.now() + 15 * 60 * 1000,
        refreshTokenExpiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
        createdAt: Date.now(),
        lastUsedAt: Date.now(),
        isActive: true,
      };

      setAddress(realAddress);
      setSession(realSession);
      setIsConnected(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect wallet');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      setAddress(null);
      setSession(null);
      setIsConnected(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect wallet');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signMessage = useCallback(
    async (message: string): Promise<string> => {
      if (!isConnected || !address) {
        throw new Error('Wallet not connected');
      }

      setIsLoading(true);
      setError(null);

      try {
        // This would be implemented based on the actual wallet provider
        // For now, we'll simulate a signature
        const mockSignature = `0x${Math.random().toString(16).substr(2, 64)}`;
        return mockSignature;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to sign message';
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [isConnected, address]
  );

  return {
    isConnected,
    address,
    session,
    providers: [], // Would be populated from context
    chains: [], // Would be populated from context
    connect,
    disconnect,
    signMessage,
    isLoading,
    error,
    clearError,
  };
}
