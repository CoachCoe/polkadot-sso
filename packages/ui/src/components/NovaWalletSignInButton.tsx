import React, { useState } from 'react';
import {
  NovaWalletAdapter,
  NovaQrAuthService,
  createNovaQrAuthService,
  NovaQrAuthData,
} from '@polkadot-auth/client-sdk';
import { NovaQrAuth } from './NovaQrAuth';

interface NovaWalletSignInButtonProps {
  onSuccess: (address: string, session: any) => void;
  onError: (error: Error) => void;
  baseUrl: string;
  className?: string;
  children?: React.ReactNode;
}

export function NovaWalletSignInButton({
  onSuccess,
  onError,
  baseUrl,
  className = '',
  children,
}: NovaWalletSignInButtonProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [showQrAuth, setShowQrAuth] = useState(false);
  const [qrData, setQrData] = useState<NovaQrAuthData | null>(null);
  const [waitForCompletion, setWaitForCompletion] = useState<(() => Promise<void>) | null>(null);

  const handleConnect = async () => {
    setIsConnecting(true);

    try {
      const adapter = new NovaWalletAdapter();

      // Try browser extension first
      try {
        const signer = await adapter.connect();
        const address = signer.getAddress();

        // For now, create a mock session - in real implementation, this would come from SSO server
        const session = {
          id: `session_${Date.now()}`,
          address,
          clientId: 'nova-wallet-dapp',
          accessToken: 'mock-access-token',
          refreshToken: 'mock-refresh-token',
          accessTokenId: `token_${Date.now()}`,
          refreshTokenId: `refresh_${Date.now()}`,
          fingerprint: `fingerprint_${Date.now()}`,
          accessTokenExpiresAt: Date.now() + 15 * 60 * 1000,
          refreshTokenExpiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
          createdAt: Date.now(),
          lastUsedAt: Date.now(),
          isActive: true,
          walletType: 'nova-wallet',
        };

        onSuccess(address, session);
        return;
      } catch (extensionError) {
        // Extension not available, fall back to QR code
        console.log('Extension not available, using QR code authentication');
      }

      // Set up QR authentication
      const qrAuthService = createNovaQrAuthService({ baseUrl });
      adapter.setQrAuthService(qrAuthService);

      // Generate challenge (in real implementation, this would come from SSO server)
      const challengeId = `challenge_${Date.now()}`;
      const message = `Sign this message to authenticate with Nova Wallet\n\nChallenge ID: ${challengeId}\nTimestamp: ${new Date().toISOString()}`;
      const address = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'; // Mock address

      const { qrData: qrAuthData, waitForCompletion: waitFn } = await adapter.connectWithQr(
        challengeId,
        message,
        address
      );

      setQrData(qrAuthData);
      setWaitForCompletion(() => waitFn);
      setShowQrAuth(true);
    } catch (error) {
      onError(error instanceof Error ? error : new Error('Failed to connect to Nova Wallet'));
    } finally {
      setIsConnecting(false);
    }
  };

  const handleQrSuccess = () => {
    setShowQrAuth(false);
    setQrData(null);
    setWaitForCompletion(null);

    // In real implementation, this would come from the SSO server after QR authentication
    const mockAddress = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
    const mockSession = {
      id: `session_${Date.now()}`,
      address: mockAddress,
      clientId: 'nova-wallet-dapp',
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
      accessTokenId: `token_${Date.now()}`,
      refreshTokenId: `refresh_${Date.now()}`,
      fingerprint: `fingerprint_${Date.now()}`,
      accessTokenExpiresAt: Date.now() + 15 * 60 * 1000,
      refreshTokenExpiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      createdAt: Date.now(),
      lastUsedAt: Date.now(),
      isActive: true,
      walletType: 'nova-wallet',
    };

    onSuccess(mockAddress, mockSession);
  };

  const handleQrError = (error: Error) => {
    setShowQrAuth(false);
    setQrData(null);
    setWaitForCompletion(null);
    onError(error);
  };

  const handleQrCancel = () => {
    setShowQrAuth(false);
    setQrData(null);
    setWaitForCompletion(null);
  };

  if (showQrAuth && qrData && waitForCompletion) {
    return (
      <NovaQrAuth
        qrData={qrData}
        onSuccess={handleQrSuccess}
        onError={handleQrError}
        onCancel={handleQrCancel}
        waitForCompletion={waitForCompletion}
        className={className}
      />
    );
  }

  return (
    <button
      onClick={handleConnect}
      disabled={isConnecting}
      className={`nova-wallet-signin-btn ${className}`}
    >
      {isConnecting ? (
        <>
          <span className='nova-wallet-signin-btn__spinner'></span>
          Connecting...
        </>
      ) : (
        <>
          <span className='nova-wallet-signin-btn__icon'>🟠</span>
          {children || 'Connect Nova Wallet'}
        </>
      )}

      <style>{`
        .nova-wallet-signin-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px 24px;
          background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .nova-wallet-signin-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
        }

        .nova-wallet-signin-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .nova-wallet-signin-btn__icon {
          font-size: 16px;
        }

        .nova-wallet-signin-btn__spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top: 2px solid white;
          border-radius: 50%;
          animation: nova-wallet-spin 1s linear infinite;
        }

        @keyframes nova-wallet-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </button>
  );
}
