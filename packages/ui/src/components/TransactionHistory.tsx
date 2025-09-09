import { RemittanceTransaction } from '@polkadot-auth/core';
import React from 'react';

interface TransactionHistoryProps {
  transactions: RemittanceTransaction[];
  onRefresh: () => void;
}

export const TransactionHistory: React.FC<TransactionHistoryProps> = ({
  transactions,
  onRefresh,
}) => {
  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#10b981';
      case 'processing':
        return '#f59e0b';
      case 'pending':
        return '#6b7280';
      case 'failed':
        return '#ef4444';
      case 'expired':
        return '#6b7280';
      default:
        return '#6b7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return '✅';
      case 'processing':
        return '⏳';
      case 'pending':
        return '⏸️';
      case 'failed':
        return '❌';
      case 'expired':
        return '⏰';
      default:
        return '❓';
    }
  };

  return (
    <div className='transaction-history'>
      <div className='history-header'>
        <h2>Transaction History</h2>
        <button onClick={onRefresh} className='refresh-button'>
          🔄 Refresh
        </button>
      </div>

      {transactions.length === 0 ? (
        <div className='empty-state'>
          <div className='empty-icon'>📤</div>
          <h3>No transactions yet</h3>
          <p>Your remittance transactions will appear here</p>
        </div>
      ) : (
        <div className='transactions-list'>
          {transactions.map(transaction => (
            <div key={transaction.id} className='transaction-item'>
              <div className='transaction-header'>
                <div className='transaction-info'>
                  <div className='transaction-id'>{transaction.id.substring(0, 8)}...</div>
                  <div className='transaction-date'>{formatDate(transaction.createdAt)}</div>
                </div>
                <div
                  className='transaction-status'
                  style={{ color: getStatusColor(transaction.status) }}
                >
                  <span className='status-icon'>{getStatusIcon(transaction.status)}</span>
                  <span className='status-text'>
                    {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                  </span>
                </div>
              </div>

              <div className='transaction-details'>
                <div className='amount-section'>
                  <div className='amount-sent'>
                    <span className='amount-label'>Sent:</span>
                    <span className='amount-value'>
                      {formatAmount(transaction.amount, transaction.currency)}
                    </span>
                  </div>
                  <div className='amount-received'>
                    <span className='amount-label'>Recipient gets:</span>
                    <span className='amount-value'>
                      {formatAmount(
                        transaction.amount * (transaction.exchangeRate || 1),
                        transaction.targetCurrency
                      )}
                    </span>
                  </div>
                </div>

                <div className='transaction-meta'>
                  <div className='meta-item'>
                    <span className='meta-label'>Recipient:</span>
                    <span className='meta-value'>{transaction.recipientContact}</span>
                  </div>
                  <div className='meta-item'>
                    <span className='meta-label'>Exchange Rate:</span>
                    <span className='meta-value'>
                      1 USD = {transaction.exchangeRate?.toFixed(2) || 'N/A'}{' '}
                      {transaction.targetCurrency}
                    </span>
                  </div>
                  {transaction.fees && (
                    <div className='meta-item'>
                      <span className='meta-label'>Fees:</span>
                      <span className='meta-value'>
                        {formatAmount(transaction.fees.total, 'USD')}
                      </span>
                    </div>
                  )}
                </div>

                {transaction.status === 'processing' && (
                  <div className='claim-info'>
                    <div className='claim-link'>
                      <span className='claim-label'>Claim Link:</span>
                      <span className='claim-value'>{transaction.claimLink}</span>
                    </div>
                    <div className='expires-at'>
                      <span className='expires-label'>Expires:</span>
                      <span className='expires-value'>{formatDate(transaction.expiresAt)}</span>
                    </div>
                  </div>
                )}

                {transaction.onChainTxHash && (
                  <div className='blockchain-info'>
                    <span className='blockchain-label'>Transaction Hash:</span>
                    <span className='blockchain-value'>
                      {transaction.onChainTxHash.substring(0, 16)}...
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
