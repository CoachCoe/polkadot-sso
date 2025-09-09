"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustodyLevelIndicator = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const CustodyLevelIndicator = ({ currentLevel, onUpgrade, }) => {
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
    const currentLevelInfo = custodyLevels[currentLevel];
    const nextLevel = currentLevel < 3 ? currentLevel + 1 : null;
    const nextLevelInfo = nextLevel ? custodyLevels[nextLevel] : null;
    return ((0, jsx_runtime_1.jsxs)("div", { className: 'custody-level-indicator', children: [(0, jsx_runtime_1.jsxs)("div", { className: 'current-level', children: [(0, jsx_runtime_1.jsxs)("div", { className: 'level-header', children: [(0, jsx_runtime_1.jsx)("span", { className: 'level-icon', children: currentLevelInfo.icon }), (0, jsx_runtime_1.jsxs)("div", { className: 'level-info', children: [(0, jsx_runtime_1.jsxs)("h3", { children: ["Level ", currentLevel, ": ", currentLevelInfo.name] }), (0, jsx_runtime_1.jsx)("p", { children: currentLevelInfo.description })] })] }), currentLevelInfo.limits && ((0, jsx_runtime_1.jsxs)("div", { className: 'limits', children: [(0, jsx_runtime_1.jsx)("h4", { children: "Transaction Limits" }), (0, jsx_runtime_1.jsxs)("div", { className: 'limit-item', children: [(0, jsx_runtime_1.jsx)("span", { children: "Daily:" }), (0, jsx_runtime_1.jsxs)("span", { children: ["$", currentLevelInfo.limits.daily.toLocaleString()] })] }), (0, jsx_runtime_1.jsxs)("div", { className: 'limit-item', children: [(0, jsx_runtime_1.jsx)("span", { children: "Monthly:" }), (0, jsx_runtime_1.jsxs)("span", { children: ["$", currentLevelInfo.limits.monthly.toLocaleString()] })] }), (0, jsx_runtime_1.jsxs)("div", { className: 'limit-item', children: [(0, jsx_runtime_1.jsx)("span", { children: "Per Transaction:" }), (0, jsx_runtime_1.jsxs)("span", { children: ["$", currentLevelInfo.limits.perTransaction.toLocaleString()] })] })] })), currentLevelInfo.limits === null && ((0, jsx_runtime_1.jsxs)("div", { className: 'unlimited', children: [(0, jsx_runtime_1.jsx)("h4", { children: "Unlimited Transactions" }), (0, jsx_runtime_1.jsx)("p", { children: "Full self-custody with no transaction limits" })] }))] }), nextLevelInfo && ((0, jsx_runtime_1.jsxs)("div", { className: 'upgrade-section', children: [(0, jsx_runtime_1.jsxs)("div", { className: 'upgrade-info', children: [(0, jsx_runtime_1.jsxs)("h4", { children: ["Upgrade to Level ", nextLevel, ": ", nextLevelInfo.name] }), (0, jsx_runtime_1.jsx)("p", { children: nextLevelInfo.description }), nextLevelInfo.limits && ((0, jsx_runtime_1.jsxs)("div", { className: 'new-limits', children: [(0, jsx_runtime_1.jsx)("h5", { children: "New Limits:" }), (0, jsx_runtime_1.jsxs)("div", { className: 'limit-item', children: [(0, jsx_runtime_1.jsx)("span", { children: "Daily:" }), (0, jsx_runtime_1.jsxs)("span", { children: ["$", nextLevelInfo.limits.daily.toLocaleString()] })] }), (0, jsx_runtime_1.jsxs)("div", { className: 'limit-item', children: [(0, jsx_runtime_1.jsx)("span", { children: "Monthly:" }), (0, jsx_runtime_1.jsxs)("span", { children: ["$", nextLevelInfo.limits.monthly.toLocaleString()] })] }), (0, jsx_runtime_1.jsxs)("div", { className: 'limit-item', children: [(0, jsx_runtime_1.jsx)("span", { children: "Per Transaction:" }), (0, jsx_runtime_1.jsxs)("span", { children: ["$", nextLevelInfo.limits.perTransaction.toLocaleString()] })] })] })), nextLevelInfo.limits === null && ((0, jsx_runtime_1.jsxs)("div", { className: 'unlimited', children: [(0, jsx_runtime_1.jsx)("h5", { children: "Unlimited Transactions" }), (0, jsx_runtime_1.jsx)("p", { children: "No transaction limits with full self-custody" })] }))] }), (0, jsx_runtime_1.jsxs)("button", { className: 'upgrade-button', onClick: () => nextLevel && onUpgrade(nextLevel), style: { backgroundColor: nextLevelInfo.color }, children: ["Upgrade to Level ", nextLevel] })] })), (0, jsx_runtime_1.jsx)("style", { children: `
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
      ` })] }));
};
exports.CustodyLevelIndicator = CustodyLevelIndicator;
//# sourceMappingURL=CustodyLevelIndicator.js.map