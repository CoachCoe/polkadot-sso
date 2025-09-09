"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RemittanceQuote = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const RemittanceQuote = ({ quote, onClose, onConfirm }) => {
    const formatAmount = (amount, currency) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency
        }).format(amount);
    };
    const formatTimeRemaining = (expiresAt) => {
        const now = new Date();
        const diff = expiresAt.getTime() - now.getTime();
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        if (minutes > 0) {
            return `${minutes}m ${seconds}s`;
        }
        else {
            return `${seconds}s`;
        }
    };
    const getCurrencySymbol = (currency) => {
        switch (currency) {
            case 'USD': return '$';
            case 'ARS': return '$';
            case 'BRL': return 'R$';
            default: return '$';
        }
    };
    return ((0, jsx_runtime_1.jsxs)("div", { className: "remittance-quote", children: [(0, jsx_runtime_1.jsxs)("div", { className: "quote-header", children: [(0, jsx_runtime_1.jsx)("h3", { children: "Transaction Quote" }), (0, jsx_runtime_1.jsx)("button", { onClick: onClose, className: "close-button", children: "\u2715" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "quote-content", children: [(0, jsx_runtime_1.jsxs)("div", { className: "amount-breakdown", children: [(0, jsx_runtime_1.jsxs)("div", { className: "amount-row", children: [(0, jsx_runtime_1.jsx)("span", { className: "label", children: "You send:" }), (0, jsx_runtime_1.jsx)("span", { className: "value", children: formatAmount(quote.amount, quote.currency) })] }), (0, jsx_runtime_1.jsxs)("div", { className: "amount-row", children: [(0, jsx_runtime_1.jsx)("span", { className: "label", children: "Recipient receives:" }), (0, jsx_runtime_1.jsx)("span", { className: "value highlight", children: formatAmount(quote.recipientAmount, quote.targetCurrency) })] }), (0, jsx_runtime_1.jsxs)("div", { className: "amount-row", children: [(0, jsx_runtime_1.jsx)("span", { className: "label", children: "Exchange rate:" }), (0, jsx_runtime_1.jsxs)("span", { className: "value", children: ["1 ", quote.currency, " = ", quote.exchangeRate.toFixed(2), " ", quote.targetCurrency] })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "fees-breakdown", children: [(0, jsx_runtime_1.jsx)("h4", { children: "Fee Breakdown" }), (0, jsx_runtime_1.jsxs)("div", { className: "fee-row", children: [(0, jsx_runtime_1.jsx)("span", { className: "label", children: "Platform fee:" }), (0, jsx_runtime_1.jsx)("span", { className: "value", children: formatAmount(quote.fees.platform, quote.currency) })] }), (0, jsx_runtime_1.jsxs)("div", { className: "fee-row", children: [(0, jsx_runtime_1.jsx)("span", { className: "label", children: "Network fee:" }), (0, jsx_runtime_1.jsx)("span", { className: "value", children: formatAmount(quote.fees.network, quote.currency) })] }), (0, jsx_runtime_1.jsxs)("div", { className: "fee-row", children: [(0, jsx_runtime_1.jsx)("span", { className: "label", children: "Exchange fee:" }), (0, jsx_runtime_1.jsx)("span", { className: "value", children: formatAmount(quote.fees.exchange, quote.currency) })] }), (0, jsx_runtime_1.jsxs)("div", { className: "fee-row total", children: [(0, jsx_runtime_1.jsx)("span", { className: "label", children: "Total fees:" }), (0, jsx_runtime_1.jsx)("span", { className: "value", children: formatAmount(quote.fees.total, quote.currency) })] })] }), (0, jsx_runtime_1.jsx)("div", { className: "total-cost", children: (0, jsx_runtime_1.jsxs)("div", { className: "total-row", children: [(0, jsx_runtime_1.jsx)("span", { className: "label", children: "Total cost:" }), (0, jsx_runtime_1.jsx)("span", { className: "value", children: formatAmount(quote.totalCost, quote.currency) })] }) }), (0, jsx_runtime_1.jsx)("div", { className: "quote-expiry", children: (0, jsx_runtime_1.jsxs)("div", { className: "expiry-info", children: [(0, jsx_runtime_1.jsx)("span", { className: "expiry-label", children: "Quote expires in:" }), (0, jsx_runtime_1.jsx)("span", { className: "expiry-value", children: formatTimeRemaining(quote.expiresAt) })] }) })] }), (0, jsx_runtime_1.jsxs)("div", { className: "quote-actions", children: [(0, jsx_runtime_1.jsx)("button", { onClick: onClose, className: "cancel-button", children: "Cancel" }), (0, jsx_runtime_1.jsx)("button", { onClick: onConfirm, className: "confirm-button", children: "Confirm Transaction" })] })] }));
};
exports.RemittanceQuote = RemittanceQuote;
//# sourceMappingURL=RemittanceQuote.js.map