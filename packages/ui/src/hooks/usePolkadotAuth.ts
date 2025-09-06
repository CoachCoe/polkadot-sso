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
      // This would be implemented based on the actual wallet provider
      // For now, we'll simulate a connection
      const mockAddress = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
      const mockSession: Session = {
        id: 'mock-session-id',
        address: mockAddress,
        clientId: 'mock-client',
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        accessTokenId: 'mock-access-token-id',
        refreshTokenId: 'mock-refresh-token-id',
        fingerprint: 'mock-fingerprint',
        accessTokenExpiresAt: Date.now() + 15 * 60 * 1000,
        refreshTokenExpiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
        createdAt: Date.now(),
        lastUsedAt: Date.now(),
        isActive: true,
      };

      setAddress(mockAddress);
      setSession(mockSession);
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
