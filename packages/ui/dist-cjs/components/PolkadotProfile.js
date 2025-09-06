"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolkadotProfile = PolkadotProfile;
const jsx_runtime_1 = require("react/jsx-runtime");
function PolkadotProfile({ address, session, onDisconnect, className = '', showBalance = false, showChain = false, }) {
    const formatAddress = (addr) => {
        return `${addr.slice(0, 8)}...${addr.slice(-8)}`;
    };
    const handleDisconnect = () => {
        if (onDisconnect) {
            onDisconnect();
        }
    };
    return ((0, jsx_runtime_1.jsxs)("div", { className: `polkadot-auth-profile ${className}`, children: [(0, jsx_runtime_1.jsxs)("div", { className: 'polkadot-auth-profile-header', children: [(0, jsx_runtime_1.jsx)("h3", { children: "Polkadot Profile" }), (0, jsx_runtime_1.jsx)("button", { className: 'polkadot-auth-disconnect-button', onClick: handleDisconnect, type: 'button', children: "Disconnect" })] }), (0, jsx_runtime_1.jsxs)("div", { className: 'polkadot-auth-profile-content', children: [(0, jsx_runtime_1.jsxs)("div", { className: 'polkadot-auth-address-section', children: [(0, jsx_runtime_1.jsx)("label", { children: "Address:" }), (0, jsx_runtime_1.jsx)("span", { className: 'polkadot-auth-address', children: formatAddress(address) })] }), session && ((0, jsx_runtime_1.jsxs)("div", { className: 'polkadot-auth-session-info', children: [(0, jsx_runtime_1.jsxs)("div", { className: 'polkadot-auth-session-item', children: [(0, jsx_runtime_1.jsx)("label", { children: "Session ID:" }), (0, jsx_runtime_1.jsxs)("span", { children: [session.id.slice(0, 8), "..."] })] }), (0, jsx_runtime_1.jsxs)("div", { className: 'polkadot-auth-session-item', children: [(0, jsx_runtime_1.jsx)("label", { children: "Created:" }), (0, jsx_runtime_1.jsx)("span", { children: new Date(session.createdAt).toLocaleDateString() })] }), (0, jsx_runtime_1.jsxs)("div", { className: 'polkadot-auth-session-item', children: [(0, jsx_runtime_1.jsx)("label", { children: "Last Used:" }), (0, jsx_runtime_1.jsx)("span", { children: new Date(session.lastUsedAt).toLocaleDateString() })] }), (0, jsx_runtime_1.jsxs)("div", { className: 'polkadot-auth-session-item', children: [(0, jsx_runtime_1.jsx)("label", { children: "Status:" }), (0, jsx_runtime_1.jsx)("span", { className: session.isActive ? 'active' : 'inactive', children: session.isActive ? 'Active' : 'Inactive' })] })] })), showBalance && ((0, jsx_runtime_1.jsxs)("div", { className: 'polkadot-auth-balance-section', children: [(0, jsx_runtime_1.jsx)("label", { children: "Balance:" }), (0, jsx_runtime_1.jsx)("span", { children: "Loading..." })] })), showChain && ((0, jsx_runtime_1.jsxs)("div", { className: 'polkadot-auth-chain-section', children: [(0, jsx_runtime_1.jsx)("label", { children: "Chain:" }), (0, jsx_runtime_1.jsx)("span", { children: "Polkadot" })] }))] })] }));
}
//# sourceMappingURL=PolkadotProfile.js.map