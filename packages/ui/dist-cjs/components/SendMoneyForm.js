"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SendMoneyForm = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const SendMoneyForm = ({ onSend, onGetQuote, limits, custodyLevel, }) => {
    const [recipient, setRecipient] = (0, react_1.useState)('');
    const [amount, setAmount] = (0, react_1.useState)('');
    const [targetCurrency, setTargetCurrency] = (0, react_1.useState)('ARS');
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    const [showQuote, setShowQuote] = (0, react_1.useState)(false);
    const handleSubmit = async (e) => {
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
        }
        catch (error) {
            console.error('Send money error:', error);
        }
        finally {
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
        }
        catch (error) {
            console.error('Get quote error:', error);
        }
    };
    const getCurrencySymbol = (currency) => {
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
    const getCurrencyName = (currency) => {
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
    return ((0, jsx_runtime_1.jsxs)("div", { className: 'send-money-form', children: [(0, jsx_runtime_1.jsxs)("div", { className: 'form-header', children: [(0, jsx_runtime_1.jsx)("h2", { children: "Send Money" }), (0, jsx_runtime_1.jsx)("p", { children: "Send money globally with progressive custody" })] }), (0, jsx_runtime_1.jsxs)("form", { onSubmit: handleSubmit, className: 'form', children: [(0, jsx_runtime_1.jsxs)("div", { className: 'form-group', children: [(0, jsx_runtime_1.jsx)("label", { htmlFor: 'recipient', children: "Recipient Contact" }), (0, jsx_runtime_1.jsx)("input", { type: 'text', id: 'recipient', value: recipient, onChange: e => setRecipient(e.target.value), placeholder: 'Enter phone number or email', required: true, className: 'form-input' }), (0, jsx_runtime_1.jsx)("small", { className: 'form-help', children: "Enter the recipient's phone number or email address" })] }), (0, jsx_runtime_1.jsxs)("div", { className: 'form-group', children: [(0, jsx_runtime_1.jsx)("label", { htmlFor: 'amount', children: "Amount (USD)" }), (0, jsx_runtime_1.jsxs)("div", { className: 'amount-input-group', children: [(0, jsx_runtime_1.jsx)("span", { className: 'currency-symbol', children: "$" }), (0, jsx_runtime_1.jsx)("input", { type: 'number', id: 'amount', value: amount, onChange: e => setAmount(e.target.value), placeholder: '0.00', min: '0.01', step: '0.01', required: true, className: 'form-input amount-input' })] }), limits && ((0, jsx_runtime_1.jsxs)("small", { className: 'form-help', children: ["Maximum per transaction: $", limits.perTransaction.toLocaleString()] }))] }), (0, jsx_runtime_1.jsxs)("div", { className: 'form-group', children: [(0, jsx_runtime_1.jsx)("label", { htmlFor: 'targetCurrency', children: "Target Currency" }), (0, jsx_runtime_1.jsxs)("select", { id: 'targetCurrency', value: targetCurrency, onChange: e => setTargetCurrency(e.target.value), className: 'form-select', children: [(0, jsx_runtime_1.jsx)("option", { value: 'ARS', children: "Argentine Peso (ARS)" }), (0, jsx_runtime_1.jsx)("option", { value: 'BRL', children: "Brazilian Real (BRL)" }), (0, jsx_runtime_1.jsx)("option", { value: 'USD', children: "US Dollar (USD)" })] }), (0, jsx_runtime_1.jsx)("small", { className: 'form-help', children: "Currency the recipient will receive" })] }), (0, jsx_runtime_1.jsxs)("div", { className: 'form-actions', children: [(0, jsx_runtime_1.jsx)("button", { type: 'button', onClick: handleGetQuote, className: 'quote-button', disabled: !amount || !recipient, children: "Get Quote" }), (0, jsx_runtime_1.jsx)("button", { type: 'submit', className: 'send-button', disabled: isLoading || !amount || !recipient, children: isLoading ? 'Sending...' : 'Send Money' })] })] }), limits && ((0, jsx_runtime_1.jsxs)("div", { className: 'limits-info', children: [(0, jsx_runtime_1.jsx)("h4", { children: "Your Transaction Limits" }), (0, jsx_runtime_1.jsxs)("div", { className: 'limit-item', children: [(0, jsx_runtime_1.jsx)("span", { children: "Daily:" }), (0, jsx_runtime_1.jsxs)("span", { children: ["$", limits.daily.toLocaleString()] })] }), (0, jsx_runtime_1.jsxs)("div", { className: 'limit-item', children: [(0, jsx_runtime_1.jsx)("span", { children: "Monthly:" }), (0, jsx_runtime_1.jsxs)("span", { children: ["$", limits.monthly.toLocaleString()] })] }), (0, jsx_runtime_1.jsxs)("div", { className: 'limit-item', children: [(0, jsx_runtime_1.jsx)("span", { children: "Per Transaction:" }), (0, jsx_runtime_1.jsxs)("span", { children: ["$", limits.perTransaction.toLocaleString()] })] })] })), (0, jsx_runtime_1.jsx)("style", { children: `
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
      ` })] }));
};
exports.SendMoneyForm = SendMoneyForm;
//# sourceMappingURL=SendMoneyForm.js.map