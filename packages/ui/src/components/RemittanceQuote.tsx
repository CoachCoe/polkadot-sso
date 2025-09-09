import React from 'react';

interface RemittanceQuoteProps {
  quote: {
    amount: number;
    currency: string;
    targetCurrency: string;
    exchangeRate: number;
    recipientAmount: number;
    fees: {
      platform: number;
      network: number;
      exchange: number;
      total: number;
    };
    totalCost: number;
    expiresAt: Date;
  };
  onClose: () => void;
  onConfirm: () => void;
}

export const RemittanceQuote: React.FC<RemittanceQuoteProps> = ({ quote, onClose, onConfirm }) => {
  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const formatTimeRemaining = (expiresAt: Date) => {
    const now = new Date();
    const diff = expiresAt.getTime() - now.getTime();
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);

    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const getCurrencySymbol = (currency: string) => {
    switch (currency) {
      case 'USD':
        return '$';
      case 'ARS':
        return '$';
      case 'BRL':
        return 'R$';
      default:
        return '$';
    }
  };

  return (
    <div className='remittance-quote'>
      <div className='quote-header'>
        <h3>Transaction Quote</h3>
        <button onClick={onClose} className='close-button'>
          ✕
        </button>
      </div>

      <div className='quote-content'>
        <div className='amount-breakdown'>
          <div className='amount-row'>
            <span className='label'>You send:</span>
            <span className='value'>{formatAmount(quote.amount, quote.currency)}</span>
          </div>

          <div className='amount-row'>
            <span className='label'>Recipient receives:</span>
            <span className='value highlight'>
              {formatAmount(quote.recipientAmount, quote.targetCurrency)}
            </span>
          </div>

          <div className='amount-row'>
            <span className='label'>Exchange rate:</span>
            <span className='value'>
              1 {quote.currency} = {quote.exchangeRate.toFixed(2)} {quote.targetCurrency}
            </span>
          </div>
        </div>

        <div className='fees-breakdown'>
          <h4>Fee Breakdown</h4>
          <div className='fee-row'>
            <span className='label'>Platform fee:</span>
            <span className='value'>{formatAmount(quote.fees.platform, quote.currency)}</span>
          </div>
          <div className='fee-row'>
            <span className='label'>Network fee:</span>
            <span className='value'>{formatAmount(quote.fees.network, quote.currency)}</span>
          </div>
          <div className='fee-row'>
            <span className='label'>Exchange fee:</span>
            <span className='value'>{formatAmount(quote.fees.exchange, quote.currency)}</span>
          </div>
          <div className='fee-row total'>
            <span className='label'>Total fees:</span>
            <span className='value'>{formatAmount(quote.fees.total, quote.currency)}</span>
          </div>
        </div>

        <div className='total-cost'>
          <div className='total-row'>
            <span className='label'>Total cost:</span>
            <span className='value'>{formatAmount(quote.totalCost, quote.currency)}</span>
          </div>
        </div>

        <div className='quote-expiry'>
          <div className='expiry-info'>
            <span className='expiry-label'>Quote expires in:</span>
            <span className='expiry-value'>{formatTimeRemaining(quote.expiresAt)}</span>
          </div>
        </div>
      </div>

      <div className='quote-actions'>
        <button onClick={onClose} className='cancel-button'>
          Cancel
        </button>
        <button onClick={onConfirm} className='confirm-button'>
          Confirm Transaction
        </button>
      </div>
    </div>
  );
};
