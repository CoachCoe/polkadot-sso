import { RemittanceTransaction } from '@polkadot-auth/core';
import React, { useEffect, useState } from 'react';
import { usePolkadotAuth } from '../hooks/usePolkadotAuth';
import { CustodyLevelIndicator } from './CustodyLevelIndicator';
import { RemittanceQuote } from './RemittanceQuote';
import { SendMoneyForm } from './SendMoneyForm';
import { TransactionHistory } from './TransactionHistory';

interface RemittanceDashboardProps {
  baseUrl?: string;
  onTransactionCreated?: (transaction: RemittanceTransaction) => void;
  onError?: (error: Error) => void;
}

export const RemittanceDashboard: React.FC<RemittanceDashboardProps> = ({
  baseUrl = 'http://localhost:3000',
  onTransactionCreated,
  onError,
}) => {
  const { session, isLoading, error } = usePolkadotAuth();
  const isAuthenticated = !!session;
  const [transactions, setTransactions] = useState<RemittanceTransaction[]>([]);
  const [quote, setQuote] = useState<any>(null);
  const [showQuote, setShowQuote] = useState(false);

  useEffect(() => {
    if (isAuthenticated && session) {
      loadTransactionHistory();
    }
  }, [isAuthenticated, session]);

  const loadTransactionHistory = async () => {
    try {
      const response = await fetch(`${baseUrl}/api/remittance/history`, {
        headers: {
          Authorization: `Bearer ${session?.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load transaction history');
      }

      const data = await response.json();
      setTransactions(data.transactions || []);
    } catch (error) {
      console.error('Failed to load transaction history:', error);
      onError?.(error as Error);
    }
  };

  const handleSendMoney = async (recipient: string, amount: number, targetCurrency: string) => {
    try {
      const response = await fetch(`${baseUrl}/api/remittance/send`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session?.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipient,
          amount,
          targetCurrency,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send money');
      }

      const data = await response.json();
      const newTransaction = data.transaction;

      setTransactions(prev => [newTransaction, ...prev]);
      onTransactionCreated?.(newTransaction);

      // Show success message
      console.log('Remittance sent successfully!');
    } catch (error) {
      console.error('Failed to send remittance:', error);
      onError?.(error as Error);
    }
  };

  const handleGetQuote = async (amount: number, targetCurrency: string) => {
    try {
      const response = await fetch(
        `${baseUrl}/api/remittance/quote?amount=${amount}&targetCurrency=${targetCurrency}`,
        {
          headers: {
            Authorization: `Bearer ${session?.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to get quote');
      }

      const data = await response.json();
      setQuote(data.quote);
      setShowQuote(true);
    } catch (error) {
      console.error('Failed to get quote:', error);
      onError?.(error as Error);
    }
  };

  const handleUpgradeCustody = async (targetLevel: number) => {
    try {
      const response = await fetch(`${baseUrl}/api/remittance/upgrade-custody`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session?.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetLevel,
          additionalAuth: {}, // This would be populated based on the target level
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upgrade custody level');
      }

      const data = await response.json();
      console.log('Custody level upgraded successfully!', data);

      // Reload the page to update session
      window.location.reload();
    } catch (error) {
      console.error('Failed to upgrade custody level:', error);
      onError?.(error as Error);
    }
  };

  if (isLoading) {
    return (
      <div className='remittance-dashboard loading'>
        <div className='loading-spinner'>Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className='remittance-dashboard not-authenticated'>
        <div className='auth-required'>
          <h2>Authentication Required</h2>
          <p>Please connect your wallet to access remittance services.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='remittance-dashboard error'>
        <div className='error-message'>
          <h2>Error</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className='remittance-dashboard'>
      <div className='dashboard-header'>
        <h1>Polkadot Remittance</h1>
        <p>Send money globally with progressive custody</p>
      </div>

      <div className='dashboard-content'>
        <div className='left-panel'>
          <CustodyLevelIndicator
            currentLevel={(session as any)?.custodyLevel || 0}
            onUpgrade={handleUpgradeCustody}
          />

          <SendMoneyForm
            onSend={handleSendMoney}
            onGetQuote={handleGetQuote}
            limits={(session as any)?.limits}
            custodyLevel={(session as any)?.custodyLevel || 0}
          />
        </div>

        <div className='right-panel'>
          {showQuote && quote && (
            <RemittanceQuote
              quote={quote}
              onClose={() => setShowQuote(false)}
              onConfirm={() => {
                setShowQuote(false);
                // Handle quote confirmation
              }}
            />
          )}

          <TransactionHistory transactions={transactions} onRefresh={loadTransactionHistory} />
        </div>
      </div>
    </div>
  );
};
