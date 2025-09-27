import React, { useState, useEffect } from 'react';

interface TalismanMobileConnectProps {
  address: string;
  clientId: string;
  onSuccess?: (token: string, user: any) => void;
  onError?: (error: string) => void;
  className?: string;
  disabled?: boolean;
}

export const TalismanMobileConnect: React.FC<TalismanMobileConnectProps> = ({
  address,
  clientId,
  onSuccess,
  onError,
  className = '',
  disabled = false,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<string>('');
  const [challengeId, setChallengeId] = useState<string>('');
  const [pollingToken, setPollingToken] = useState<string>('');

  const handleTalismanMobileConnect = async () => {
    if (disabled || isLoading) return;

    setIsLoading(true);

    try {
      // Generate Talisman Mobile challenge
      const response = await fetch(
        `/api/auth/mobile/challenge?provider=talisman-mobile&address=${address}&client_id=${clientId}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to generate Talisman Mobile challenge');
      }

      const { 
        deep_link_url, 
        qr_code_data, 
        polling_token, 
        challenge_id 
      } = await response.json();

      setQrCodeData(qr_code_data);
      setChallengeId(challenge_id);
      setPollingToken(polling_token);
      setIsLoading(false);
      setIsPolling(true);

      // Try to open Talisman Mobile app
      try {
        window.location.href = deep_link_url;
      } catch (error) {
        console.warn('Failed to open deep link:', error);
      }

      // Start polling for completion
      startPolling(challenge_id, polling_token);

    } catch (error) {
      setIsLoading(false);
      if (onError) {
        onError(error instanceof Error ? error.message : 'Connection failed');
      }
    }
  };

  const startPolling = (challengeId: string, pollingToken: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(
          `/api/auth/mobile/poll/${pollingToken}?challenge_id=${challengeId}`
        );
        
        if (!response.ok) {
          throw new Error('Failed to poll challenge status');
        }

        const result = await response.json();

        if (result.status === 'completed') {
          clearInterval(pollInterval);
          setIsPolling(false);
          
          if (onSuccess) {
            onSuccess(result.access_token, result.user);
          }
        } else if (result.status === 'expired') {
          clearInterval(pollInterval);
          setIsPolling(false);
          
          if (onError) {
            onError('Challenge has expired');
          }
        } else if (result.status === 'not_found') {
          clearInterval(pollInterval);
          setIsPolling(false);
          
          if (onError) {
            onError('Challenge not found');
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 2000);

    // Timeout after 5 minutes
    setTimeout(() => {
      clearInterval(pollInterval);
      setIsPolling(false);
      if (onError) {
        onError('Authentication timeout');
      }
    }, 300000);
  };

  const loadQRCode = async () => {
    if (!challengeId) return;

    try {
      const response = await fetch(`/api/auth/mobile/qr/${challengeId}`);
      if (response.ok) {
        const svg = await response.text();
        setQrCodeData(svg);
      }
    } catch (error) {
      console.error('Failed to load QR code:', error);
    }
  };

  useEffect(() => {
    if (challengeId) {
      loadQRCode();
    }
  }, [challengeId]);

  return (
    <div className={`talisman-mobile-connect ${className}`} style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '1rem',
    }}>
      <button
        onClick={handleTalismanMobileConnect}
        disabled={disabled || isLoading || isPolling}
        className="talisman-mobile-button"
        style={{
          background: '#6366f1',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          padding: '12px 24px',
          fontSize: '16px',
          fontWeight: '500',
          cursor: disabled || isLoading || isPolling ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          transition: 'all 0.2s ease',
          opacity: disabled || isLoading || isPolling ? 0.6 : 1,
        }}
      >
        {isLoading ? (
          <>
            <div className="spinner" style={{
              width: '20px',
              height: '20px',
              border: '2px solid #ffffff',
              borderTop: '2px solid transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }} />
            Connecting...
          </>
        ) : isPolling ? (
          <>
            <div className="spinner" style={{
              width: '20px',
              height: '20px',
              border: '2px solid #ffffff',
              borderTop: '2px solid transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }} />
            Waiting for authentication...
          </>
        ) : (
          <>
            <div className="talisman-icon" style={{
              width: '20px',
              height: '20px',
              background: 'white',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              fontWeight: 'bold',
              color: '#6366f1',
            }}>
              T
            </div>
            Connect with Talisman Mobile
          </>
        )}
      </button>

      {qrCodeData && (
        <div className="qr-code-section" style={{
          background: '#f8f9fa',
          border: '1px solid #e9ecef',
          borderRadius: '12px',
          padding: '20px',
          textAlign: 'center',
          maxWidth: '300px',
        }}>
          <h3 style={{
            color: '#333',
            marginBottom: '15px',
            fontSize: '18px',
            fontWeight: '600',
          }}>
            📱 Scan QR Code
          </h3>
          <div 
            className="qr-code"
            style={{
              width: '200px',
              height: '200px',
              margin: '0 auto 15px',
              background: 'white',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #e9ecef',
            }}
            dangerouslySetInnerHTML={{ __html: qrCodeData }}
          />
          <p style={{
            color: '#666',
            fontSize: '14px',
            lineHeight: '1.5',
            margin: 0,
          }}>
            Scan this QR code with your Talisman Mobile app to authenticate
          </p>
        </div>
      )}

      {isPolling && (
        <div className="polling-status" style={{
          background: '#f0f9ff',
          border: '1px solid #bae6fd',
          borderRadius: '8px',
          padding: '15px',
          textAlign: 'center',
        }}>
          <h4 style={{
            color: '#0369a1',
            marginBottom: '8px',
            fontSize: '14px',
            fontWeight: '600',
          }}>
            🔄 Checking authentication status...
          </h4>
          <p style={{
            color: '#0284c7',
            fontSize: '13px',
            margin: 0,
          }}>
            Please complete the authentication in your Talisman Mobile app.
          </p>
        </div>
      )}
      
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .talisman-mobile-button:hover:not(.disabled) {
          background: #4f46e5;
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(99, 102, 241, 0.3);
        }
        
        .talisman-mobile-button:active:not(.disabled) {
          transform: translateY(0);
        }
      `}</style>
    </div>
  );
};

export default TalismanMobileConnect;
