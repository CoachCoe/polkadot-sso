"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionHistory = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const TransactionHistory = ({ transactions, onRefresh, }) => {
    const formatDate = (date) => {
        const d = new Date(date);
        return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
    };
    const formatAmount = (amount, currency) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
        }).format(amount);
    };
    const getStatusColor = (status) => {
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
    const getStatusIcon = (status) => {
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
    return ((0, jsx_runtime_1.jsxs)("div", { className: 'transaction-history', children: [(0, jsx_runtime_1.jsxs)("div", { className: 'history-header', children: [(0, jsx_runtime_1.jsx)("h2", { children: "Transaction History" }), (0, jsx_runtime_1.jsx)("button", { onClick: onRefresh, className: 'refresh-button', children: "\uD83D\uDD04 Refresh" })] }), transactions.length === 0 ? ((0, jsx_runtime_1.jsxs)("div", { className: 'empty-state', children: [(0, jsx_runtime_1.jsx)("div", { className: 'empty-icon', children: "\uD83D\uDCE4" }), (0, jsx_runtime_1.jsx)("h3", { children: "No transactions yet" }), (0, jsx_runtime_1.jsx)("p", { children: "Your remittance transactions will appear here" })] })) : ((0, jsx_runtime_1.jsx)("div", { className: 'transactions-list', children: transactions.map(transaction => ((0, jsx_runtime_1.jsxs)("div", { className: 'transaction-item', children: [(0, jsx_runtime_1.jsxs)("div", { className: 'transaction-header', children: [(0, jsx_runtime_1.jsxs)("div", { className: 'transaction-info', children: [(0, jsx_runtime_1.jsxs)("div", { className: 'transaction-id', children: [transaction.id.substring(0, 8), "..."] }), (0, jsx_runtime_1.jsx)("div", { className: 'transaction-date', children: formatDate(transaction.createdAt) })] }), (0, jsx_runtime_1.jsxs)("div", { className: 'transaction-status', style: { color: getStatusColor(transaction.status) }, children: [(0, jsx_runtime_1.jsx)("span", { className: 'status-icon', children: getStatusIcon(transaction.status) }), (0, jsx_runtime_1.jsx)("span", { className: 'status-text', children: transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1) })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: 'transaction-details', children: [(0, jsx_runtime_1.jsxs)("div", { className: 'amount-section', children: [(0, jsx_runtime_1.jsxs)("div", { className: 'amount-sent', children: [(0, jsx_runtime_1.jsx)("span", { className: 'amount-label', children: "Sent:" }), (0, jsx_runtime_1.jsx)("span", { className: 'amount-value', children: formatAmount(transaction.amount, transaction.currency) })] }), (0, jsx_runtime_1.jsxs)("div", { className: 'amount-received', children: [(0, jsx_runtime_1.jsx)("span", { className: 'amount-label', children: "Recipient gets:" }), (0, jsx_runtime_1.jsx)("span", { className: 'amount-value', children: formatAmount(transaction.amount * (transaction.exchangeRate || 1), transaction.targetCurrency) })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: 'transaction-meta', children: [(0, jsx_runtime_1.jsxs)("div", { className: 'meta-item', children: [(0, jsx_runtime_1.jsx)("span", { className: 'meta-label', children: "Recipient:" }), (0, jsx_runtime_1.jsx)("span", { className: 'meta-value', children: transaction.recipientContact })] }), (0, jsx_runtime_1.jsxs)("div", { className: 'meta-item', children: [(0, jsx_runtime_1.jsx)("span", { className: 'meta-label', children: "Exchange Rate:" }), (0, jsx_runtime_1.jsxs)("span", { className: 'meta-value', children: ["1 USD = ", transaction.exchangeRate?.toFixed(2) || 'N/A', ' ', transaction.targetCurrency] })] }), transaction.fees && ((0, jsx_runtime_1.jsxs)("div", { className: 'meta-item', children: [(0, jsx_runtime_1.jsx)("span", { className: 'meta-label', children: "Fees:" }), (0, jsx_runtime_1.jsx)("span", { className: 'meta-value', children: formatAmount(transaction.fees.total, 'USD') })] }))] }), transaction.status === 'processing' && ((0, jsx_runtime_1.jsxs)("div", { className: 'claim-info', children: [(0, jsx_runtime_1.jsxs)("div", { className: 'claim-link', children: [(0, jsx_runtime_1.jsx)("span", { className: 'claim-label', children: "Claim Link:" }), (0, jsx_runtime_1.jsx)("span", { className: 'claim-value', children: transaction.claimLink })] }), (0, jsx_runtime_1.jsxs)("div", { className: 'expires-at', children: [(0, jsx_runtime_1.jsx)("span", { className: 'expires-label', children: "Expires:" }), (0, jsx_runtime_1.jsx)("span", { className: 'expires-value', children: formatDate(transaction.expiresAt) })] })] })), transaction.onChainTxHash && ((0, jsx_runtime_1.jsxs)("div", { className: 'blockchain-info', children: [(0, jsx_runtime_1.jsx)("span", { className: 'blockchain-label', children: "Transaction Hash:" }), (0, jsx_runtime_1.jsxs)("span", { className: 'blockchain-value', children: [transaction.onChainTxHash.substring(0, 16), "..."] })] }))] })] }, transaction.id))) }))] }));
};
exports.TransactionHistory = TransactionHistory;
//# sourceMappingURL=TransactionHistory.js.map