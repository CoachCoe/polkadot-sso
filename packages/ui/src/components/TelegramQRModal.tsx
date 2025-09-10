import { TelegramQRData } from '@polkadot-auth/telegram';
import React, { useEffect, useState } from 'react';

interface TelegramQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  qrData: TelegramQRData | null;
  onAuthSuccess?: (address: string, session: any) => void;
  onAuthError?: (error: string) => void;
}

export const TelegramQRModal: React.FC<TelegramQRModalProps> = ({
  isOpen,
  onClose,
  qrData,
  onAuthSuccess,
  onAuthError,
}) => {
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes in seconds
  const [status, setStatus] = useState<'waiting' | 'success' | 'error' | 'expired'>('waiting');

  useEffect(() => {
    if (!isOpen || !qrData) return;

    setTimeLeft(300);
    setStatus('waiting');

    // Countdown timer
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setStatus('expired');
          onAuthError?.('Authentication expired');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Poll for authentication status
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/auth/telegram/status/${qrData.challengeId}`);
        const data = await response.json();

        if (data.success) {
          const challenge = data.challenge;

          if (challenge.status === 'completed') {
            setStatus('success');
            onAuthSuccess?.(challenge.walletAddress, {
              id: qrData.challengeId,
              address: challenge.walletAddress,
              userId: challenge.userId,
            });
            clearInterval(pollInterval);
            clearInterval(timer);
          } else if (challenge.status === 'failed') {
            setStatus('error');
            onAuthError?.('Authentication failed');
            clearInterval(pollInterval);
            clearInterval(timer);
          }
        }
      } catch (err) {
        console.error('Failed to check authentication status:', err);
      }
    }, 1000);

    return () => {
      clearInterval(timer);
      clearInterval(pollInterval);
    };
  }, [isOpen, qrData, onAuthSuccess, onAuthError]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusMessage = () => {
    switch (status) {
      case 'waiting':
        return 'Waiting for authentication...';
      case 'success':
        return 'Authentication successful!';
      case 'error':
        return 'Authentication failed';
      case 'expired':
        return 'Authentication expired';
      default:
        return 'Waiting for authentication...';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'waiting':
        return '#0088cc';
      case 'success':
        return '#10b981';
      case 'error':
        return '#ef4444';
      case 'expired':
        return '#f59e0b';
      default:
        return '#0088cc';
    }
  };

  if (!isOpen || !qrData) return null;

  return (
    <div className='telegram-qr-modal-overlay'>
      <div className='telegram-qr-modal'>
        <div className='telegram-qr-modal-header'>
          <h3>📱 Sign in with Telegram</h3>
          <button onClick={onClose} className='telegram-qr-modal-close'>
            ×
          </button>
        </div>

        <div className='telegram-qr-modal-body'>
          <div className='telegram-qr-container'>
            <img src={qrData.qrCode} alt='Telegram QR Code' className='telegram-qr-code' />
          </div>

          <div className='telegram-qr-status'>
            <div
              className='telegram-qr-status-indicator'
              style={{ backgroundColor: getStatusColor() }}
            />
            <span className='telegram-qr-status-text'>{getStatusMessage()}</span>
          </div>

          {status === 'waiting' && (
            <div className='telegram-qr-timer'>
              <span className='telegram-qr-timer-label'>Time remaining:</span>
              <span className='telegram-qr-timer-value'>{formatTime(timeLeft)}</span>
            </div>
          )}

          <div className='telegram-qr-instructions'>
            <h4>How to authenticate:</h4>
            <ol>
              <li>Open Telegram on your phone</li>
              <li>Scan the QR code above</li>
              <li>Follow the instructions in the bot</li>
              <li>Wait for confirmation</li>
            </ol>
          </div>

          <div className='telegram-qr-deep-link'>
            <p>Or click this link to open in Telegram:</p>
            <a
              href={qrData.deepLink}
              target='_blank'
              rel='noopener noreferrer'
              className='telegram-qr-deep-link-button'
            >
              Open in Telegram
            </a>
          </div>
        </div>

        <div className='telegram-qr-modal-footer'>
          <button onClick={onClose} className='telegram-qr-modal-cancel'>
            Cancel
          </button>
        </div>
      </div>

      <style>{`
        .telegram-qr-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .telegram-qr-modal {
          background: white;
          border-radius: 16px;
          max-width: 500px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        }

        .telegram-qr-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 24px 24px 0 24px;
          border-bottom: 1px solid #e5e7eb;
          margin-bottom: 24px;
        }

        .telegram-qr-modal-header h3 {
          margin: 0;
          color: #111827;
          font-size: 1.5rem;
          font-weight: 600;
        }

        .telegram-qr-modal-close {
          background: none;
          border: none;
          font-size: 28px;
          cursor: pointer;
          color: #6b7280;
          padding: 0;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          transition: all 0.2s;
        }

        .telegram-qr-modal-close:hover {
          background: #f3f4f6;
          color: #374151;
        }

        .telegram-qr-modal-body {
          padding: 0 24px;
        }

        .telegram-qr-container {
          text-align: center;
          margin-bottom: 24px;
        }

        .telegram-qr-code {
          max-width: 250px;
          height: auto;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }

        .telegram-qr-status {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-bottom: 16px;
          padding: 12px;
          background: #f9fafb;
          border-radius: 8px;
        }

        .telegram-qr-status-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        .telegram-qr-status-text {
          font-weight: 500;
          color: #374151;
        }

        .telegram-qr-timer {
          text-align: center;
          margin-bottom: 24px;
          padding: 12px;
          background: #fef3c7;
          border-radius: 8px;
          border: 1px solid #f59e0b;
        }

        .telegram-qr-timer-label {
          display: block;
          font-size: 0.875rem;
          color: #92400e;
          margin-bottom: 4px;
        }

        .telegram-qr-timer-value {
          font-size: 1.5rem;
          font-weight: 600;
          color: #92400e;
          font-family: monospace;
        }

        .telegram-qr-instructions {
          margin-bottom: 24px;
        }

        .telegram-qr-instructions h4 {
          margin: 0 0 12px 0;
          color: #111827;
          font-size: 1.125rem;
          font-weight: 600;
        }

        .telegram-qr-instructions ol {
          margin: 0;
          padding-left: 20px;
          color: #4b5563;
        }

        .telegram-qr-instructions li {
          margin-bottom: 8px;
          line-height: 1.5;
        }

        .telegram-qr-deep-link {
          text-align: center;
          margin-bottom: 24px;
        }

        .telegram-qr-deep-link p {
          margin: 0 0 12px 0;
          color: #6b7280;
          font-size: 0.875rem;
        }

        .telegram-qr-deep-link-button {
          display: inline-block;
          background: #0088cc;
          color: white;
          padding: 12px 24px;
          border-radius: 8px;
          text-decoration: none;
          font-weight: 500;
          transition: all 0.2s;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
        }

        .telegram-qr-deep-link-button:hover {
          background: #006699;
          transform: translateY(-1px);
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }

        .telegram-qr-modal-footer {
          padding: 24px;
          border-top: 1px solid #e5e7eb;
          display: flex;
          justify-content: center;
        }

        .telegram-qr-modal-cancel {
          background: #f3f4f6;
          color: #374151;
          border: 1px solid #d1d5db;
          padding: 10px 20px;
          border-radius: 6px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .telegram-qr-modal-cancel:hover {
          background: #e5e7eb;
          border-color: #9ca3af;
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  );
};
