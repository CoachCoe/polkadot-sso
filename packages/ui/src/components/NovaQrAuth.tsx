import React, { useState, useEffect } from 'react';
import { NovaQrAuthData, NovaQrAuthService } from '@polkadot-auth/client-sdk';

interface NovaQrAuthProps {
  qrData: NovaQrAuthData;
  onSuccess: () => void;
  onError: (error: Error) => void;
  onCancel: () => void;
  waitForCompletion: () => Promise<void>;
  className?: string;
}

export function NovaQrAuth({
  qrData,
  onSuccess,
  onError,
  onCancel,
  waitForCompletion,
  className = '',
}: NovaQrAuthProps) {
  const [isWaiting, setIsWaiting] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Calculate time remaining
    const updateTimeRemaining = () => {
      const remaining = Math.max(0, Math.floor((qrData.expiresAt - Date.now()) / 1000));
      setTimeRemaining(remaining);

      if (remaining === 0) {
        setError('QR code has expired. Please try again.');
        setIsWaiting(false);
      }
    };

    updateTimeRemaining();
    const interval = setInterval(updateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [qrData.expiresAt]);

  const handleStartWaiting = async () => {
    setIsWaiting(true);
    setError(null);

    try {
      await waitForCompletion();
      onSuccess();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Authentication failed';
      setError(errorMessage);
      onError(err instanceof Error ? err : new Error(errorMessage));
    } finally {
      setIsWaiting(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`nova-qr-auth ${className}`}>
      <div className='nova-qr-auth__container'>
        {/* Header */}
        <div className='nova-qr-auth__header'>
          <div className='nova-qr-auth__logo'>
            <span className='nova-qr-auth__logo-icon'>🟠</span>
            <span className='nova-qr-auth__logo-text'>Nova Wallet</span>
          </div>
          <h3 className='nova-qr-auth__title'>Scan QR Code</h3>
          <p className='nova-qr-auth__subtitle'>
            Open Nova Wallet on your mobile device and scan this QR code to authenticate
          </p>
        </div>

        {/* QR Code */}
        <div className='nova-qr-auth__qr-container'>
          <img
            src={qrData.qrCodeDataUrl}
            alt='Nova Wallet QR Code'
            className='nova-qr-auth__qr-code'
          />
          <div className='nova-qr-auth__qr-overlay'>
            <div className='nova-qr-auth__qr-icon'>📱</div>
          </div>
        </div>

        {/* Timer */}
        <div className='nova-qr-auth__timer'>
          <div className='nova-qr-auth__timer-icon'>⏱️</div>
          <span className='nova-qr-auth__timer-text'>Expires in {formatTime(timeRemaining)}</span>
        </div>

        {/* Instructions */}
        <div className='nova-qr-auth__instructions'>
          <h4>How to authenticate:</h4>
          <ol>
            <li>Open Nova Wallet on your mobile device</li>
            <li>Tap the "Scan" button in the app</li>
            <li>Point your camera at this QR code</li>
            <li>Review and approve the authentication request</li>
          </ol>
        </div>

        {/* Error Message */}
        {error && (
          <div className='nova-qr-auth__error'>
            <div className='nova-qr-auth__error-icon'>❌</div>
            <span className='nova-qr-auth__error-text'>{error}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className='nova-qr-auth__actions'>
          {!isWaiting ? (
            <>
              <button
                onClick={handleStartWaiting}
                disabled={timeRemaining === 0}
                className='nova-qr-auth__btn nova-qr-auth__btn--primary'
              >
                <span className='nova-qr-auth__btn-icon'>🔍</span>
                Start Waiting for Authentication
              </button>
              <button onClick={onCancel} className='nova-qr-auth__btn nova-qr-auth__btn--secondary'>
                Cancel
              </button>
            </>
          ) : (
            <div className='nova-qr-auth__waiting'>
              <div className='nova-qr-auth__spinner'></div>
              <span className='nova-qr-auth__waiting-text'>Waiting for authentication...</span>
            </div>
          )}
        </div>

        {/* Deep Link Fallback */}
        <div className='nova-qr-auth__fallback'>
          <p className='nova-qr-auth__fallback-text'>
            Having trouble scanning?
            <a
              href={qrData.deepLink}
              className='nova-qr-auth__fallback-link'
              target='_blank'
              rel='noopener noreferrer'
            >
              Open in Nova Wallet
            </a>
          </p>
        </div>
      </div>

      <style>{`
        .nova-qr-auth {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .nova-qr-auth__container {
          max-width: 400px;
          margin: 0 auto;
          padding: 24px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
          text-align: center;
        }

        .nova-qr-auth__header {
          margin-bottom: 24px;
        }

        .nova-qr-auth__logo {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-bottom: 16px;
        }

        .nova-qr-auth__logo-icon {
          font-size: 24px;
        }

        .nova-qr-auth__logo-text {
          font-size: 18px;
          font-weight: 600;
          color: #333;
        }

        .nova-qr-auth__title {
          font-size: 20px;
          font-weight: 600;
          color: #333;
          margin: 0 0 8px 0;
        }

        .nova-qr-auth__subtitle {
          font-size: 14px;
          color: #666;
          margin: 0;
          line-height: 1.4;
        }

        .nova-qr-auth__qr-container {
          position: relative;
          display: inline-block;
          margin-bottom: 16px;
        }

        .nova-qr-auth__qr-code {
          width: 200px;
          height: 200px;
          border-radius: 8px;
          border: 2px solid #e5e7eb;
        }

        .nova-qr-auth__qr-overlay {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: rgba(255, 255, 255, 0.9);
          border-radius: 50%;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .nova-qr-auth__qr-icon {
          font-size: 20px;
        }

        .nova-qr-auth__timer {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-bottom: 20px;
          padding: 8px 16px;
          background: #f3f4f6;
          border-radius: 20px;
          font-size: 14px;
          color: #374151;
        }

        .nova-qr-auth__timer-icon {
          font-size: 16px;
        }

        .nova-qr-auth__instructions {
          text-align: left;
          margin-bottom: 20px;
          padding: 16px;
          background: #f9fafb;
          border-radius: 8px;
          border-left: 4px solid #3b82f6;
        }

        .nova-qr-auth__instructions h4 {
          margin: 0 0 12px 0;
          font-size: 14px;
          font-weight: 600;
          color: #374151;
        }

        .nova-qr-auth__instructions ol {
          margin: 0;
          padding-left: 20px;
          font-size: 13px;
          color: #6b7280;
          line-height: 1.5;
        }

        .nova-qr-auth__instructions li {
          margin-bottom: 4px;
        }

        .nova-qr-auth__error {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-bottom: 16px;
          padding: 12px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 8px;
          color: #dc2626;
          font-size: 14px;
        }

        .nova-qr-auth__error-icon {
          font-size: 16px;
        }

        .nova-qr-auth__actions {
          margin-bottom: 16px;
        }

        .nova-qr-auth__btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px 24px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          margin: 0 4px;
        }

        .nova-qr-auth__btn--primary {
          background: #3b82f6;
          color: white;
        }

        .nova-qr-auth__btn--primary:hover:not(:disabled) {
          background: #2563eb;
        }

        .nova-qr-auth__btn--primary:disabled {
          background: #9ca3af;
          cursor: not-allowed;
        }

        .nova-qr-auth__btn--secondary {
          background: #f3f4f6;
          color: #374151;
          border: 1px solid #d1d5db;
        }

        .nova-qr-auth__btn--secondary:hover {
          background: #e5e7eb;
        }

        .nova-qr-auth__btn-icon {
          font-size: 16px;
        }

        .nova-qr-auth__waiting {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 12px 24px;
          background: #f0f9ff;
          border: 1px solid #bae6fd;
          border-radius: 8px;
          color: #0369a1;
        }

        .nova-qr-auth__spinner {
          width: 20px;
          height: 20px;
          border: 2px solid #e0f2fe;
          border-top: 2px solid #0369a1;
          border-radius: 50%;
          animation: nova-qr-spin 1s linear infinite;
        }

        @keyframes nova-qr-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .nova-qr-auth__waiting-text {
          font-size: 14px;
          font-weight: 500;
        }

        .nova-qr-auth__fallback {
          padding-top: 16px;
          border-top: 1px solid #e5e7eb;
        }

        .nova-qr-auth__fallback-text {
          font-size: 12px;
          color: #6b7280;
          margin: 0;
        }

        .nova-qr-auth__fallback-link {
          color: #3b82f6;
          text-decoration: none;
          font-weight: 500;
          margin-left: 4px;
        }

        .nova-qr-auth__fallback-link:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}
