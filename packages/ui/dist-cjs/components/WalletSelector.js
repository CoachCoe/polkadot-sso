"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletSelector = WalletSelector;
const jsx_runtime_1 = require("react/jsx-runtime");
function WalletSelector({ providers, onSelect, className = '', disabled = false, }) {
    const handleSelect = (providerId) => {
        if (!disabled) {
            onSelect(providerId);
        }
    };
    return ((0, jsx_runtime_1.jsxs)("div", { className: `polkadot-auth-wallet-selector ${className}`, children: [(0, jsx_runtime_1.jsx)("h3", { children: "Select Wallet" }), (0, jsx_runtime_1.jsx)("div", { className: 'polkadot-auth-wallet-list', children: providers.map(provider => ((0, jsx_runtime_1.jsx)("button", { className: `polkadot-auth-wallet-option ${disabled ? 'disabled' : ''}`, onClick: () => handleSelect(provider.id), disabled: disabled, type: 'button', children: (0, jsx_runtime_1.jsxs)("div", { className: 'polkadot-auth-wallet-info', children: [(0, jsx_runtime_1.jsx)("span", { className: 'polkadot-auth-wallet-name', children: provider.name }), provider.description && ((0, jsx_runtime_1.jsx)("span", { className: 'polkadot-auth-wallet-description', children: provider.description }))] }) }, provider.id))) })] }));
}
//# sourceMappingURL=WalletSelector.js.map