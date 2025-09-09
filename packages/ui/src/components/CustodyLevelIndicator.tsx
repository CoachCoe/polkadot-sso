import React from 'react';

interface CustodyLevelIndicatorProps {
  currentLevel: number;
  onUpgrade: (targetLevel: number) => void;
}

export const CustodyLevelIndicator: React.FC<CustodyLevelIndicatorProps> = ({
  currentLevel,
  onUpgrade,
}) => {
  const custodyLevels = {
    0: {
      name: 'Basic',
      description: 'SMS/Email authentication with platform custody',
      limits: { daily: 500, monthly: 2000, perTransaction: 500 },
      color: '#f59e0b',
      icon: '🔒',
    },
    1: {
      name: 'Enhanced',
      description: '2FA and shared custody',
      limits: { daily: 2000, monthly: 10000, perTransaction: 2000 },
      color: '#3b82f6',
      icon: '🔐',
    },
    2: {
      name: 'Wallet Assisted',
      description: '2-of-3 multisig with wallet integration',
      limits: { daily: 10000, monthly: 50000, perTransaction: 10000 },
      color: '#8b5cf6',
      icon: '🔑',
    },
    3: {
      name: 'Self Custody',
      description: 'Full wallet control with no limits',
      limits: null,
      color: '#10b981',
      icon: '🛡️',
    },
  };

  const currentLevelInfo = custodyLevels[currentLevel as keyof typeof custodyLevels];
  const nextLevel = currentLevel < 3 ? currentLevel + 1 : null;
  const nextLevelInfo = nextLevel ? custodyLevels[nextLevel as keyof typeof custodyLevels] : null;

  return (
    <div className='custody-level-indicator'>
      <div className='current-level'>
        <div className='level-header'>
          <span className='level-icon'>{currentLevelInfo.icon}</span>
          <div className='level-info'>
            <h3>
              Level {currentLevel}: {currentLevelInfo.name}
            </h3>
            <p>{currentLevelInfo.description}</p>
          </div>
        </div>

        {currentLevelInfo.limits && (
          <div className='limits'>
            <h4>Transaction Limits</h4>
            <div className='limit-item'>
              <span>Daily:</span>
              <span>${currentLevelInfo.limits.daily.toLocaleString()}</span>
            </div>
            <div className='limit-item'>
              <span>Monthly:</span>
              <span>${currentLevelInfo.limits.monthly.toLocaleString()}</span>
            </div>
            <div className='limit-item'>
              <span>Per Transaction:</span>
              <span>${currentLevelInfo.limits.perTransaction.toLocaleString()}</span>
            </div>
          </div>
        )}

        {currentLevelInfo.limits === null && (
          <div className='unlimited'>
            <h4>Unlimited Transactions</h4>
            <p>Full self-custody with no transaction limits</p>
          </div>
        )}
      </div>

      {nextLevelInfo && (
        <div className='upgrade-section'>
          <div className='upgrade-info'>
            <h4>
              Upgrade to Level {nextLevel}: {nextLevelInfo.name}
            </h4>
            <p>{nextLevelInfo.description}</p>

            {nextLevelInfo.limits && (
              <div className='new-limits'>
                <h5>New Limits:</h5>
                <div className='limit-item'>
                  <span>Daily:</span>
                  <span>${nextLevelInfo.limits.daily.toLocaleString()}</span>
                </div>
                <div className='limit-item'>
                  <span>Monthly:</span>
                  <span>${nextLevelInfo.limits.monthly.toLocaleString()}</span>
                </div>
                <div className='limit-item'>
                  <span>Per Transaction:</span>
                  <span>${nextLevelInfo.limits.perTransaction.toLocaleString()}</span>
                </div>
              </div>
            )}

            {nextLevelInfo.limits === null && (
              <div className='unlimited'>
                <h5>Unlimited Transactions</h5>
                <p>No transaction limits with full self-custody</p>
              </div>
            )}
          </div>

          <button
            className='upgrade-button'
            onClick={() => nextLevel && onUpgrade(nextLevel)}
            style={{ backgroundColor: nextLevelInfo.color }}
          >
            Upgrade to Level {nextLevel}
          </button>
        </div>
      )}

      <style>{`
        .custody-level-indicator {
          background: #1f2937;
          border-radius: 12px;
          padding: 24px;
          margin-bottom: 24px;
          border: 1px solid #374151;
        }

        .current-level {
          margin-bottom: 24px;
        }

        .level-header {
          display: flex;
          align-items: center;
          margin-bottom: 16px;
        }

        .level-icon {
          font-size: 32px;
          margin-right: 16px;
        }

        .level-info h3 {
          margin: 0 0 4px 0;
          color: #f9fafb;
          font-size: 18px;
          font-weight: 600;
        }

        .level-info p {
          margin: 0;
          color: #9ca3af;
          font-size: 14px;
        }

        .limits {
          background: #111827;
          border-radius: 8px;
          padding: 16px;
        }

        .limits h4 {
          margin: 0 0 12px 0;
          color: #f9fafb;
          font-size: 16px;
          font-weight: 600;
        }

        .limit-item {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          color: #d1d5db;
          font-size: 14px;
        }

        .limit-item:last-child {
          margin-bottom: 0;
        }

        .unlimited {
          background: #111827;
          border-radius: 8px;
          padding: 16px;
          text-align: center;
        }

        .unlimited h4,
        .unlimited h5 {
          margin: 0 0 8px 0;
          color: #10b981;
          font-size: 16px;
          font-weight: 600;
        }

        .unlimited p {
          margin: 0;
          color: #9ca3af;
          font-size: 14px;
        }

        .upgrade-section {
          border-top: 1px solid #374151;
          padding-top: 24px;
        }

        .upgrade-info h4 {
          margin: 0 0 8px 0;
          color: #f9fafb;
          font-size: 16px;
          font-weight: 600;
        }

        .upgrade-info p {
          margin: 0 0 16px 0;
          color: #9ca3af;
          font-size: 14px;
        }

        .new-limits {
          background: #111827;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 16px;
        }

        .new-limits h5 {
          margin: 0 0 12px 0;
          color: #f9fafb;
          font-size: 14px;
          font-weight: 600;
        }

        .upgrade-button {
          width: 100%;
          padding: 12px 24px;
          border: none;
          border-radius: 8px;
          color: white;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .upgrade-button:hover {
          opacity: 0.9;
          transform: translateY(-1px);
        }

        .upgrade-button:active {
          transform: translateY(0);
        }
      `}</style>
    </div>
  );
};
