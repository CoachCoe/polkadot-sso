"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolkadotSignInButton = PolkadotSignInButton;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const usePolkadotAuth_1 = require("../hooks/usePolkadotAuth");
function PolkadotSignInButton({ onSignIn, onError, className = '', children, disabled = false, }) {
    const { isConnected, address, session, connect, isLoading, error } = (0, usePolkadotAuth_1.usePolkadotAuth)();
    const [isConnecting, setIsConnecting] = (0, react_1.useState)(false);
    const handleClick = async () => {
        if (isConnected) {
            return;
        }
        setIsConnecting(true);
        try {
            // For now, we'll use a mock provider
            await connect('polkadot-js');
            if (address && session && onSignIn) {
                onSignIn(address, session);
            }
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to connect wallet';
            if (onError) {
                onError(errorMessage);
            }
        }
        finally {
            setIsConnecting(false);
        }
    };
    if (isConnected) {
        return ((0, jsx_runtime_1.jsx)("div", { className: `polkadot-auth-connected ${className}`, children: (0, jsx_runtime_1.jsxs)("span", { className: 'polkadot-auth-address', children: ["Connected: ", address?.slice(0, 8), "...", address?.slice(-8)] }) }));
    }
    return ((0, jsx_runtime_1.jsx)("button", { className: `polkadot-auth-signin-button ${className}`, onClick: handleClick, disabled: disabled || isLoading || isConnecting, type: 'button', children: isLoading || isConnecting ? ((0, jsx_runtime_1.jsx)("span", { children: "Connecting..." })) : (children || 'Connect Polkadot Wallet') }));
}
//# sourceMappingURL=PolkadotSignInButton.js.map