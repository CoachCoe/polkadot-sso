"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RemittanceDashboard = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const usePolkadotAuth_1 = require("../hooks/usePolkadotAuth");
const CustodyLevelIndicator_1 = require("./CustodyLevelIndicator");
const RemittanceQuote_1 = require("./RemittanceQuote");
const SendMoneyForm_1 = require("./SendMoneyForm");
const TransactionHistory_1 = require("./TransactionHistory");
const RemittanceDashboard = ({ baseUrl = 'http://localhost:3000', onTransactionCreated, onError, }) => {
    const { session, isLoading, error } = (0, usePolkadotAuth_1.usePolkadotAuth)();
    const isAuthenticated = !!session;
    const [transactions, setTransactions] = (0, react_1.useState)([]);
    const [quote, setQuote] = (0, react_1.useState)(null);
    const [showQuote, setShowQuote] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
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
        }
        catch (error) {
            console.error('Failed to load transaction history:', error);
            onError?.(error);
        }
    };
    const handleSendMoney = async (recipient, amount, targetCurrency) => {
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
        }
        catch (error) {
            console.error('Failed to send remittance:', error);
            onError?.(error);
        }
    };
    const handleGetQuote = async (amount, targetCurrency) => {
        try {
            const response = await fetch(`${baseUrl}/api/remittance/quote?amount=${amount}&targetCurrency=${targetCurrency}`, {
                headers: {
                    Authorization: `Bearer ${session?.accessToken}`,
                    'Content-Type': 'application/json',
                },
            });
            if (!response.ok) {
                throw new Error('Failed to get quote');
            }
            const data = await response.json();
            setQuote(data.quote);
            setShowQuote(true);
        }
        catch (error) {
            console.error('Failed to get quote:', error);
            onError?.(error);
        }
    };
    const handleUpgradeCustody = async (targetLevel) => {
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
        }
        catch (error) {
            console.error('Failed to upgrade custody level:', error);
            onError?.(error);
        }
    };
    if (isLoading) {
        return ((0, jsx_runtime_1.jsx)("div", { className: 'remittance-dashboard loading', children: (0, jsx_runtime_1.jsx)("div", { className: 'loading-spinner', children: "Loading..." }) }));
    }
    if (!isAuthenticated) {
        return ((0, jsx_runtime_1.jsx)("div", { className: 'remittance-dashboard not-authenticated', children: (0, jsx_runtime_1.jsxs)("div", { className: 'auth-required', children: [(0, jsx_runtime_1.jsx)("h2", { children: "Authentication Required" }), (0, jsx_runtime_1.jsx)("p", { children: "Please connect your wallet to access remittance services." })] }) }));
    }
    if (error) {
        return ((0, jsx_runtime_1.jsx)("div", { className: 'remittance-dashboard error', children: (0, jsx_runtime_1.jsxs)("div", { className: 'error-message', children: [(0, jsx_runtime_1.jsx)("h2", { children: "Error" }), (0, jsx_runtime_1.jsx)("p", { children: error })] }) }));
    }
    return ((0, jsx_runtime_1.jsxs)("div", { className: 'remittance-dashboard', children: [(0, jsx_runtime_1.jsxs)("div", { className: 'dashboard-header', children: [(0, jsx_runtime_1.jsx)("h1", { children: "Polkadot Remittance" }), (0, jsx_runtime_1.jsx)("p", { children: "Send money globally with progressive custody" })] }), (0, jsx_runtime_1.jsxs)("div", { className: 'dashboard-content', children: [(0, jsx_runtime_1.jsxs)("div", { className: 'left-panel', children: [(0, jsx_runtime_1.jsx)(CustodyLevelIndicator_1.CustodyLevelIndicator, { currentLevel: session?.custodyLevel || 0, onUpgrade: handleUpgradeCustody }), (0, jsx_runtime_1.jsx)(SendMoneyForm_1.SendMoneyForm, { onSend: handleSendMoney, onGetQuote: handleGetQuote, limits: session?.limits, custodyLevel: session?.custodyLevel || 0 })] }), (0, jsx_runtime_1.jsxs)("div", { className: 'right-panel', children: [showQuote && quote && ((0, jsx_runtime_1.jsx)(RemittanceQuote_1.RemittanceQuote, { quote: quote, onClose: () => setShowQuote(false), onConfirm: () => {
                                    setShowQuote(false);
                                    // Handle quote confirmation
                                } })), (0, jsx_runtime_1.jsx)(TransactionHistory_1.TransactionHistory, { transactions: transactions, onRefresh: loadTransactionHistory })] })] })] }));
};
exports.RemittanceDashboard = RemittanceDashboard;
//# sourceMappingURL=RemittanceDashboard.js.map