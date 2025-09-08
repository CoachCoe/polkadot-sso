import { createPolkadotAuth, WalletProviderService, AuthService } from '@polkadot-auth/core';
import { useEffect, useState } from 'react';
import { PolkadotAuthContext } from '../context/PolkadotAuthContext';
import { PolkadotAuthContextType, PolkadotAuthProviderProps } from '../types';

export function PolkadotAuthProvider({ children, config = {} }: PolkadotAuthProviderProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [session, setSession] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize the auth instance
  const auth = createPolkadotAuth({
    defaultChain: config.defaultChain || 'polkadot',
    providers: config.providers || ['polkadot-js', 'talisman'],
  });

  const providers = auth.getProviders();
  const chains = auth.getChains();

  // Initialize real wallet and auth services
  const walletService = new WalletProviderService();
  const authService = new AuthService({
    challengeExpiration: 300, // 5 minutes
    sessionExpiration: 86400, // 24 hours
    enableNonce: true,
    enableDomainBinding: true,
    allowedDomains: [],
  });

  const connect = async (providerId: string) => {
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
      const realSession = {
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
        accountName: account.name || 'Unnamed Account',
        walletType: account.type || providerId,
      };

      setAddress(realAddress);
      setSession(realSession);
      setIsConnected(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect wallet');
    } finally {
      setIsLoading(false);
    }
  };

  const disconnect = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Disconnect from the wallet service
      if (session?.walletType) {
        await walletService.disconnectWallet(session.walletType);
      }

      setAddress(null);
      setSession(null);
      setIsConnected(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect wallet');
    } finally {
      setIsLoading(false);
    }
  };

  const signMessage = async (message: string): Promise<string> => {
    if (!isConnected || !address || !session?.walletType) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    setError(null);

    try {
      // Use the real wallet service to sign the message
      const connection = await walletService.connectWallet(session.walletType);
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
  };

  const clearError = () => {
    setError(null);
  };

  const contextValue: PolkadotAuthContextType = {
    isConnected,
    address,
    session,
    providers,
    chains,
    connect,
    disconnect,
    signMessage,
    isLoading,
    error,
    clearError,
  };

  // Auto-connect if enabled
  useEffect(() => {
    if (config.autoConnect && !isConnected && !isLoading) {
      connect('polkadot-js');
    }
  }, [config.autoConnect, isConnected, isLoading]);

  return (
    <PolkadotAuthContext.Provider value={contextValue}>{children}</PolkadotAuthContext.Provider>
  );
}
