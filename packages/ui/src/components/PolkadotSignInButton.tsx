import { useState } from 'react';
import { usePolkadotAuth } from '../hooks/usePolkadotAuth';
import { PolkadotSignInButtonProps } from '../types';

export function PolkadotSignInButton({
  onSignIn,
  onError,
  className = '',
  children,
  disabled = false,
}: PolkadotSignInButtonProps) {
  const { isConnected, address, session, connect, isLoading, error } = usePolkadotAuth();
  const [isConnecting, setIsConnecting] = useState(false);

  const handleClick = async () => {
    if (isConnected) {
      return;
    }

    setIsConnecting(true);
    try {
      // For now, we'll use a mock provider
      await connect('polkadot-js');

      if (address && session && onSignIn) {
        onSignIn(address, session);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect wallet';
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setIsConnecting(false);
    }
  };

  if (isConnected) {
    return (
      <div className={`polkadot-auth-connected ${className}`}>
        <span className='polkadot-auth-address'>
          Connected: {address?.slice(0, 8)}...{address?.slice(-8)}
        </span>
      </div>
    );
  }

  return (
    <button
      className={`polkadot-auth-signin-button ${className}`}
      onClick={handleClick}
      disabled={disabled || isLoading || isConnecting}
      type='button'
    >
      {isLoading || isConnecting ? (
        <span>Connecting...</span>
      ) : (
        children || 'Connect Polkadot Wallet'
      )}
    </button>
  );
}
