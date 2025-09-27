import React, { useState } from 'react';
import GoogleSignInButton from './GoogleSignInButton';
import TalismanMobileConnect from './TalismanMobileConnect';

interface WalletSelectorProps {
  clientId: string;
  onSuccess?: (token: string, user: any, provider: string) => void;
  onError?: (error: string) => void;
  className?: string;
  disabled?: boolean;
  showGoogle?: boolean;
  showTalismanMobile?: boolean;
  showPolkadotJs?: boolean;
}

export const WalletSelector: React.FC<WalletSelectorProps> = ({
  clientId,
  onSuccess,
  onError,
  className = '',
  disabled = false,
  showGoogle = true,
  showTalismanMobile = true,
  showPolkadotJs = true,
}) => {
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [address, setAddress] = useState<string>('');

  const handleProviderSelect = (provider: string) => {
    setSelectedProvider(provider);
  };

  const handleSuccess = (token: string, user: any, provider: string) => {
    if (onSuccess) {
      onSuccess(token, user, provider);
    }
  };

  const handleError = (error: string) => {
    if (onError) {
      onError(error);
    }
  };

  const handlePolkadotJsConnect = async () => {
    try {
      // Redirect to Polkadot.js challenge page
      window.location.href = `/api/auth/challenge?client_id=${clientId}&wallet=polkadot-js`;
    } catch (error) {
      handleError(error instanceof Error ? error.message : 'Polkadot.js connection failed');
    }
  };

  return (
    <div className={`wallet-selector ${className}`} style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
      maxWidth: '400px',
      margin: '0 auto',
    }}>
      <h2 style={{
        textAlign: 'center',
        color: '#333',
        marginBottom: '1rem',
        fontSize: '24px',
        fontWeight: '600',
      }}>
        Choose Authentication Method
      </h2>

      {showPolkadotJs && (
        <div className="provider-option" style={{
          background: '#f8f9fa',
          border: '1px solid #e9ecef',
          borderRadius: '12px',
          padding: '20px',
          textAlign: 'center',
        }}>
          <div className="provider-icon" style={{
            width: '60px',
            height: '60px',
            background: 'linear-gradient(135deg, #e6007a, #ff6b35)',
            borderRadius: '50%',
            margin: '0 auto 15px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            color: 'white',
            fontWeight: 'bold',
          }}>
            P
          </div>
          <h3 style={{
            color: '#333',
            marginBottom: '10px',
            fontSize: '18px',
            fontWeight: '600',
          }}>
            🔌 Polkadot.js Extension
          </h3>
          <p style={{
            color: '#666',
            fontSize: '14px',
            marginBottom: '15px',
            lineHeight: '1.5',
          }}>
            Connect using your Polkadot.js browser extension
          </p>
          <button
            onClick={handlePolkadotJsConnect}
            disabled={disabled}
            style={{
              background: '#e6007a',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 24px',
              fontSize: '16px',
              fontWeight: '500',
              cursor: disabled ? 'not-allowed' : 'pointer',
              opacity: disabled ? 0.6 : 1,
              transition: 'all 0.2s ease',
            }}
          >
            Connect with Polkadot.js
          </button>
        </div>
      )}

      {showGoogle && (
        <div className="provider-option" style={{
          background: '#f8f9fa',
          border: '1px solid #e9ecef',
          borderRadius: '12px',
          padding: '20px',
          textAlign: 'center',
        }}>
          <div className="provider-icon" style={{
            width: '60px',
            height: '60px',
            background: 'linear-gradient(135deg, #4285f4, #34a853)',
            borderRadius: '50%',
            margin: '0 auto 15px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            color: 'white',
            fontWeight: 'bold',
          }}>
            G
          </div>
          <h3 style={{
            color: '#333',
            marginBottom: '10px',
            fontSize: '18px',
            fontWeight: '600',
          }}>
            🔍 Google OAuth2
          </h3>
          <p style={{
            color: '#666',
            fontSize: '14px',
            marginBottom: '15px',
            lineHeight: '1.5',
          }}>
            Sign in with your Google account
          </p>
          <GoogleSignInButton
            clientId={clientId}
            onSuccess={(token, user) => handleSuccess(token, user, 'google')}
            onError={handleError}
            disabled={disabled}
          />
        </div>
      )}

      {showTalismanMobile && (
        <div className="provider-option" style={{
          background: '#f8f9fa',
          border: '1px solid #e9ecef',
          borderRadius: '12px',
          padding: '20px',
          textAlign: 'center',
        }}>
          <div className="provider-icon" style={{
            width: '60px',
            height: '60px',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            borderRadius: '50%',
            margin: '0 auto 15px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            color: 'white',
            fontWeight: 'bold',
          }}>
            T
          </div>
          <h3 style={{
            color: '#333',
            marginBottom: '10px',
            fontSize: '18px',
            fontWeight: '600',
          }}>
            📱 Talisman Mobile
          </h3>
          <p style={{
            color: '#666',
            fontSize: '14px',
            marginBottom: '15px',
            lineHeight: '1.5',
          }}>
            Connect using your Talisman Mobile wallet
          </p>
          <div style={{ marginBottom: '15px' }}>
            <input
              type="text"
              placeholder="Enter your Polkadot address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #e9ecef',
                borderRadius: '6px',
                fontSize: '14px',
                marginBottom: '10px',
              }}
            />
          </div>
          <TalismanMobileConnect
            address={address}
            clientId={clientId}
            onSuccess={(token, user) => handleSuccess(token, user, 'talisman-mobile')}
            onError={handleError}
            disabled={disabled || !address}
          />
        </div>
      )}

      <div className="provider-info" style={{
        background: '#e3f2fd',
        border: '1px solid #bbdefb',
        borderRadius: '8px',
        padding: '15px',
        textAlign: 'center',
      }}>
        <h4 style={{
          color: '#1976d2',
          marginBottom: '8px',
          fontSize: '14px',
          fontWeight: '600',
        }}>
          🔐 Secure Authentication
        </h4>
        <p style={{
          color: '#1565c0',
          fontSize: '12px',
          margin: 0,
          lineHeight: '1.4',
        }}>
          All authentication methods use industry-standard security practices including JWT tokens, 
          rate limiting, and cryptographic verification.
        </p>
      </div>
    </div>
  );
};

export default WalletSelector;
