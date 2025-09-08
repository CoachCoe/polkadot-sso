import { Session, WalletProviderService, AuthService } from '@polkadot-auth/core';
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

  // Initialize real wallet and auth services
  const walletService = new WalletProviderService();
  const authService = new AuthService({
    challengeExpiration: 300, // 5 minutes
    sessionExpiration: 86400, // 24 hours
    enableNonce: true,
    enableDomainBinding: true,
    allowedDomains: [],
  });

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const connect = useCallback(
    async (providerId: string) => {
      setIsLoading(true);
      setError(null);

      try {
        // Connect to real wallet using the wallet service
        const connection = await walletService.connectWallet(providerId);

        if (connection.accounts.length === 0) {
          throw new Error('No accounts found in wallet');
        }

        // Use the first account
        const account = connection.accounts[0];
        const realAddress = account.address;

        // Generate a challenge for authentication
        const challenge = await authService.createChallenge('trex-demo-dapp', realAddress);

        // Sign the challenge message
        const signature = await connection.signMessage(challenge.message);

        // Verify the signature and create a real session
        const authResult = await authService.verifySignature(
          {
            message: challenge.message,
            signature: signature,
            address: realAddress,
            nonce: challenge.nonce,
          },
          challenge
        );

        if (!authResult.success) {
          throw new Error('Authentication failed');
        }

        // Create a real session
        const realSession: Session = {
          id: challenge.id,
          address: realAddress,
          clientId: 'trex-demo-dapp',
          accessToken: 'real-access-token', // This would come from the SSO server
          refreshToken: 'real-refresh-token', // This would come from the SSO server
          accessTokenId: challenge.id,
          refreshTokenId: challenge.id,
          fingerprint: challenge.nonce,
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
    },
    [walletService, authService]
  );

  const disconnect = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Disconnect from the wallet service
      if (session?.accessTokenId) {
        await walletService.disconnectWallet('polkadot-js'); // Default wallet type
      }

      setAddress(null);
      setSession(null);
      setIsConnected(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect wallet');
    } finally {
      setIsLoading(false);
    }
  }, [session, walletService]);

  const signMessage = useCallback(
    async (message: string): Promise<string> => {
      if (!isConnected || !address) {
        throw new Error('Wallet not connected');
      }

      setIsLoading(true);
      setError(null);

      try {
        // Use the real wallet service to sign the message
        const connection = await walletService.connectWallet('polkadot-js'); // Default wallet type
        const account = connection.accounts.find(acc => acc.address === address);

        if (!account) {
          throw new Error('Account not found');
        }

        const signature = await connection.signMessage(message);
        return signature;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to sign message';
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [isConnected, address, walletService]
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
