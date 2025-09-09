import { TransactionLimits } from '@polkadot-auth/core';
import React, { useState } from 'react';

interface SendMoneyFormProps {
  onSend: (recipient: string, amount: number, targetCurrency: string) => void;
  onGetQuote: (amount: number, targetCurrency: string) => void;
  limits?: TransactionLimits | null;
  custodyLevel: number;
}

export const SendMoneyForm: React.FC<SendMoneyFormProps> = ({
  onSend,
  onGetQuote,
  limits,
  custodyLevel,
}) => {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [targetCurrency, setTargetCurrency] = useState<'ARS' | 'BRL' | 'USD'>('ARS');
  const [isLoading, setIsLoading] = useState(false);
  const [showQuote, setShowQuote] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    if (limits && amountNum > limits.perTransaction) {
      alert(`Amount exceeds per-transaction limit of $${limits.perTransaction.toLocaleString()}`);
      return;
    }

    if (!recipient.trim()) {
      alert('Please enter recipient contact information');
      return;
    }

    setIsLoading(true);
    try {
      await onSend(recipient.trim(), amountNum, targetCurrency);
      setRecipient('');
      setAmount('');
    } catch (error) {
      console.error('Send money error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetQuote = async () => {
    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    if (limits && amountNum > limits.perTransaction) {
      alert(`Amount exceeds per-transaction limit of $${limits.perTransaction.toLocaleString()}`);
      return;
    }

    try {
      await onGetQuote(amountNum, targetCurrency);
      setShowQuote(true);
    } catch (error) {
      console.error('Get quote error:', error);
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

  const getCurrencyName = (currency: string) => {
    switch (currency) {
      case 'USD':
        return 'US Dollar';
      case 'ARS':
        return 'Argentine Peso';
      case 'BRL':
        return 'Brazilian Real';
      default:
        return 'US Dollar';
    }
  };

  return (
    <div className='send-money-form'>
      <div className='form-header'>
        <h2>Send Money</h2>
        <p>Send money globally with progressive custody</p>
      </div>

      <form onSubmit={handleSubmit} className='form'>
        <div className='form-group'>
          <label htmlFor='recipient'>Recipient Contact</label>
          <input
            type='text'
            id='recipient'
            value={recipient}
            onChange={e => setRecipient(e.target.value)}
            placeholder='Enter phone number or email'
            required
            className='form-input'
          />
          <small className='form-help'>Enter the recipient's phone number or email address</small>
        </div>

        <div className='form-group'>
          <label htmlFor='amount'>Amount (USD)</label>
          <div className='amount-input-group'>
            <span className='currency-symbol'>$</span>
            <input
              type='number'
              id='amount'
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder='0.00'
              min='0.01'
              step='0.01'
              required
              className='form-input amount-input'
            />
          </div>
          {limits && (
            <small className='form-help'>
              Maximum per transaction: ${limits.perTransaction.toLocaleString()}
            </small>
          )}
        </div>

        <div className='form-group'>
          <label htmlFor='targetCurrency'>Target Currency</label>
          <select
            id='targetCurrency'
            value={targetCurrency}
            onChange={e => setTargetCurrency(e.target.value as 'ARS' | 'BRL' | 'USD')}
            className='form-select'
          >
            <option value='ARS'>Argentine Peso (ARS)</option>
            <option value='BRL'>Brazilian Real (BRL)</option>
            <option value='USD'>US Dollar (USD)</option>
          </select>
          <small className='form-help'>Currency the recipient will receive</small>
        </div>

        <div className='form-actions'>
          <button
            type='button'
            onClick={handleGetQuote}
            className='quote-button'
            disabled={!amount || !recipient}
          >
            Get Quote
          </button>

          <button
            type='submit'
            className='send-button'
            disabled={isLoading || !amount || !recipient}
          >
            {isLoading ? 'Sending...' : 'Send Money'}
          </button>
        </div>
      </form>

      {limits && (
        <div className='limits-info'>
          <h4>Your Transaction Limits</h4>
          <div className='limit-item'>
            <span>Daily:</span>
            <span>${limits.daily.toLocaleString()}</span>
          </div>
          <div className='limit-item'>
            <span>Monthly:</span>
            <span>${limits.monthly.toLocaleString()}</span>
          </div>
          <div className='limit-item'>
            <span>Per Transaction:</span>
            <span>${limits.perTransaction.toLocaleString()}</span>
          </div>
        </div>
      )}

      <style>{`
        .send-money-form {
          background: #1f2937;
          border-radius: 12px;
          padding: 24px;
          border: 1px solid #374151;
        }

        .form-header {
          margin-bottom: 24px;
        }

        .form-header h2 {
          margin: 0 0 8px 0;
          color: #f9fafb;
          font-size: 24px;
          font-weight: 600;
        }

        .form-header p {
          margin: 0;
          color: #9ca3af;
          font-size: 14px;
        }

        .form {
          margin-bottom: 24px;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          margin-bottom: 8px;
          color: #f9fafb;
          font-size: 14px;
          font-weight: 500;
        }

        .form-input,
        .form-select {
          width: 100%;
          padding: 12px 16px;
          border: 1px solid #374151;
          border-radius: 8px;
          background: #111827;
          color: #f9fafb;
          font-size: 16px;
          transition: border-color 0.2s ease;
        }

        .form-input:focus,
        .form-select:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .amount-input-group {
          position: relative;
          display: flex;
          align-items: center;
        }

        .currency-symbol {
          position: absolute;
          left: 16px;
          color: #9ca3af;
          font-size: 16px;
          font-weight: 500;
          z-index: 1;
        }

        .amount-input {
          padding-left: 32px;
        }

        .form-help {
          display: block;
          margin-top: 4px;
          color: #6b7280;
          font-size: 12px;
        }

        .form-actions {
          display: flex;
          gap: 12px;
        }

        .quote-button,
        .send-button {
          flex: 1;
          padding: 12px 24px;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .quote-button {
          background: #374151;
          color: #f9fafb;
        }

        .quote-button:hover:not(:disabled) {
          background: #4b5563;
        }

        .send-button {
          background: #3b82f6;
          color: white;
        }

        .send-button:hover:not(:disabled) {
          background: #2563eb;
        }

        .quote-button:disabled,
        .send-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .limits-info {
          background: #111827;
          border-radius: 8px;
          padding: 16px;
          border: 1px solid #374151;
        }

        .limits-info h4 {
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
      `}</style>
    </div>
  );
};
