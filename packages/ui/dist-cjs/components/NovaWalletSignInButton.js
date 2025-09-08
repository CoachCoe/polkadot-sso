"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NovaWalletSignInButton = NovaWalletSignInButton;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const client_sdk_1 = require("@polkadot-auth/client-sdk");
const NovaQrAuth_1 = require("./NovaQrAuth");
function NovaWalletSignInButton({ onSuccess, onError, baseUrl, className = '', children, }) {
    const [isConnecting, setIsConnecting] = (0, react_1.useState)(false);
    const [showQrAuth, setShowQrAuth] = (0, react_1.useState)(false);
    const [qrData, setQrData] = (0, react_1.useState)(null);
    const [waitForCompletion, setWaitForCompletion] = (0, react_1.useState)(null);
    const handleConnect = async () => {
        setIsConnecting(true);
        try {
            const adapter = new client_sdk_1.NovaWalletAdapter();
            // Try browser extension first
            try {
                const signer = await adapter.connect();
                const address = signer.getAddress();
                // For now, create a mock session - in real implementation, this would come from SSO server
                const session = {
                    id: `session_${Date.now()}`,
                    address,
                    clientId: 'nova-wallet-dapp',
                    accessToken: 'mock-access-token',
                    refreshToken: 'mock-refresh-token',
                    accessTokenId: `token_${Date.now()}`,
                    refreshTokenId: `refresh_${Date.now()}`,
                    fingerprint: `fingerprint_${Date.now()}`,
                    accessTokenExpiresAt: Date.now() + 15 * 60 * 1000,
                    refreshTokenExpiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
                    createdAt: Date.now(),
                    lastUsedAt: Date.now(),
                    isActive: true,
                    walletType: 'nova-wallet',
                };
                onSuccess(address, session);
                return;
            }
            catch (extensionError) {
                // Extension not available, fall back to QR code
                console.log('Extension not available, using QR code authentication');
            }
            // Set up QR authentication
            const qrAuthService = (0, client_sdk_1.createNovaQrAuthService)({ baseUrl });
            adapter.setQrAuthService(qrAuthService);
            // Generate challenge (in real implementation, this would come from SSO server)
            const challengeId = `challenge_${Date.now()}`;
            const message = `Sign this message to authenticate with Nova Wallet\n\nChallenge ID: ${challengeId}\nTimestamp: ${new Date().toISOString()}`;
            const address = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'; // Mock address
            const { qrData: qrAuthData, waitForCompletion: waitFn } = await adapter.connectWithQr(challengeId, message, address);
            setQrData(qrAuthData);
            setWaitForCompletion(() => waitFn);
            setShowQrAuth(true);
        }
        catch (error) {
            onError(error instanceof Error ? error : new Error('Failed to connect to Nova Wallet'));
        }
        finally {
            setIsConnecting(false);
        }
    };
    const handleQrSuccess = () => {
        setShowQrAuth(false);
        setQrData(null);
        setWaitForCompletion(null);
        // In real implementation, this would come from the SSO server after QR authentication
        const mockAddress = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
        const mockSession = {
            id: `session_${Date.now()}`,
            address: mockAddress,
            clientId: 'nova-wallet-dapp',
            accessToken: 'mock-access-token',
            refreshToken: 'mock-refresh-token',
            accessTokenId: `token_${Date.now()}`,
            refreshTokenId: `refresh_${Date.now()}`,
            fingerprint: `fingerprint_${Date.now()}`,
            accessTokenExpiresAt: Date.now() + 15 * 60 * 1000,
            refreshTokenExpiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
            createdAt: Date.now(),
            lastUsedAt: Date.now(),
            isActive: true,
            walletType: 'nova-wallet',
        };
        onSuccess(mockAddress, mockSession);
    };
    const handleQrError = (error) => {
        setShowQrAuth(false);
        setQrData(null);
        setWaitForCompletion(null);
        onError(error);
    };
    const handleQrCancel = () => {
        setShowQrAuth(false);
        setQrData(null);
        setWaitForCompletion(null);
    };
    if (showQrAuth && qrData && waitForCompletion) {
        return ((0, jsx_runtime_1.jsx)(NovaQrAuth_1.NovaQrAuth, { qrData: qrData, onSuccess: handleQrSuccess, onError: handleQrError, onCancel: handleQrCancel, waitForCompletion: waitForCompletion, className: className }));
    }
    return ((0, jsx_runtime_1.jsxs)("button", { onClick: handleConnect, disabled: isConnecting, className: `nova-wallet-signin-btn ${className}`, children: [isConnecting ? ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("span", { className: "nova-wallet-signin-btn__spinner" }), "Connecting..."] })) : ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("span", { className: "nova-wallet-signin-btn__icon", children: "\uD83D\uDFE0" }), children || 'Connect Nova Wallet'] })), (0, jsx_runtime_1.jsx)("style", { children: `
        .nova-wallet-signin-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px 24px;
          background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .nova-wallet-signin-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
        }

        .nova-wallet-signin-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .nova-wallet-signin-btn__icon {
          font-size: 16px;
        }

        .nova-wallet-signin-btn__spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top: 2px solid white;
          border-radius: 50%;
          animation: nova-wallet-spin 1s linear infinite;
        }

        @keyframes nova-wallet-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      ` })] }));
}
//# sourceMappingURL=NovaWalletSignInButton.js.map