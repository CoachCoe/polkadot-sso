"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelegramAuthButton = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const TelegramAuthButton = ({ onAuthStart, onAuthSuccess, onAuthError, className = '', disabled = false, children, }) => {
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    const [qrData, setQrData] = (0, react_1.useState)(null);
    const [error, setError] = (0, react_1.useState)(null);
    const handleAuthStart = async () => {
        if (isLoading || disabled)
            return;
        setIsLoading(true);
        setError(null);
        try {
            // Generate challenge
            const response = await fetch('/api/auth/telegram/challenge', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: 'Sign in with Telegram to authenticate with Polkadot SSO',
                    client_id: 'web-app',
                }),
            });
            if (!response.ok) {
                throw new Error('Failed to create authentication challenge');
            }
            const data = await response.json();
            if (data.success) {
                setQrData(data);
                onAuthStart?.(data.challenge.id);
                // Start polling for authentication status
                pollAuthStatus(data.challenge.id);
            }
            else {
                throw new Error(data.error || 'Authentication failed');
            }
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Authentication failed';
            setError(errorMessage);
            onAuthError?.(errorMessage);
        }
        finally {
            setIsLoading(false);
        }
    };
    const pollAuthStatus = async (challengeId) => {
        const pollInterval = setInterval(async () => {
            try {
                const response = await fetch(`/api/auth/telegram/status/${challengeId}`);
                const data = await response.json();
                if (data.success) {
                    const challenge = data.challenge;
                    if (challenge.status === 'completed') {
                        clearInterval(pollInterval);
                        setQrData(null);
                        onAuthSuccess?.(challenge.walletAddress, {
                            id: challengeId,
                            address: challenge.walletAddress,
                            userId: challenge.userId,
                        });
                    }
                    else if (challenge.status === 'failed' || challenge.status === 'expired') {
                        clearInterval(pollInterval);
                        setQrData(null);
                        const errorMessage = challenge.status === 'expired' ? 'Authentication expired' : 'Authentication failed';
                        setError(errorMessage);
                        onAuthError?.(errorMessage);
                    }
                }
            }
            catch (err) {
                console.error('Failed to check authentication status:', err);
            }
        }, 1000); // Poll every second
        // Stop polling after 5 minutes
        setTimeout(() => {
            clearInterval(pollInterval);
            if (qrData) {
                setQrData(null);
                setError('Authentication timeout');
                onAuthError?.('Authentication timeout');
            }
        }, 5 * 60 * 1000);
    };
    const handleClose = () => {
        setQrData(null);
        setError(null);
    };
    if (qrData) {
        return ((0, jsx_runtime_1.jsxs)("div", { className: "telegram-auth-modal", children: [(0, jsx_runtime_1.jsxs)("div", { className: "telegram-auth-content", children: [(0, jsx_runtime_1.jsxs)("div", { className: "telegram-auth-header", children: [(0, jsx_runtime_1.jsx)("h3", { children: "\uD83D\uDCF1 Sign in with Telegram" }), (0, jsx_runtime_1.jsx)("button", { onClick: handleClose, className: "telegram-auth-close", children: "\u00D7" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "telegram-auth-body", children: [(0, jsx_runtime_1.jsx)("div", { className: "telegram-qr-container", children: (0, jsx_runtime_1.jsx)("img", { src: qrData.qrCode, alt: "Telegram QR Code", className: "telegram-qr-code" }) }), (0, jsx_runtime_1.jsxs)("div", { className: "telegram-auth-instructions", children: [(0, jsx_runtime_1.jsx)("p", { children: "1. Open Telegram on your phone" }), (0, jsx_runtime_1.jsx)("p", { children: "2. Scan this QR code" }), (0, jsx_runtime_1.jsx)("p", { children: "3. Follow the instructions in the bot" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "telegram-auth-deep-link", children: [(0, jsx_runtime_1.jsx)("p", { children: "Or click this link:" }), (0, jsx_runtime_1.jsx)("a", { href: qrData.deepLink, target: "_blank", rel: "noopener noreferrer", className: "telegram-deep-link", children: "Open in Telegram" })] })] })] }), (0, jsx_runtime_1.jsx)("style", { children: `
          .telegram-auth-modal {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
          }

          .telegram-auth-content {
            background: white;
            border-radius: 12px;
            padding: 24px;
            max-width: 400px;
            width: 90%;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
          }

          .telegram-auth-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
          }

          .telegram-auth-header h3 {
            margin: 0;
            color: #333;
            font-size: 1.25rem;
          }

          .telegram-auth-close {
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #666;
            padding: 0;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .telegram-qr-container {
            text-align: center;
            margin-bottom: 20px;
          }

          .telegram-qr-code {
            max-width: 200px;
            height: auto;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
          }

          .telegram-auth-instructions {
            margin-bottom: 20px;
          }

          .telegram-auth-instructions p {
            margin: 8px 0;
            color: #666;
            font-size: 0.9rem;
          }

          .telegram-auth-deep-link {
            text-align: center;
          }

          .telegram-deep-link {
            display: inline-block;
            background: #0088cc;
            color: white;
            padding: 12px 24px;
            border-radius: 6px;
            text-decoration: none;
            font-weight: 500;
            transition: background-color 0.2s;
          }

          .telegram-deep-link:hover {
            background: #006699;
          }
        ` })] }));
    }
    return ((0, jsx_runtime_1.jsxs)("div", { className: "telegram-auth-button-container", children: [(0, jsx_runtime_1.jsx)("button", { onClick: handleAuthStart, disabled: disabled || isLoading, className: `telegram-auth-button ${className}`, children: isLoading ? ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("span", { className: "telegram-auth-spinner", children: "\u23F3" }), "Connecting..."] })) : ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("span", { className: "telegram-auth-icon", children: "\uD83D\uDCF1" }), children || 'Sign in with Telegram'] })) }), error && ((0, jsx_runtime_1.jsxs)("div", { className: "telegram-auth-error", children: [(0, jsx_runtime_1.jsx)("p", { children: error }), (0, jsx_runtime_1.jsx)("button", { onClick: () => setError(null), className: "telegram-auth-error-close", children: "\u00D7" })] })), (0, jsx_runtime_1.jsx)("style", { children: `
        .telegram-auth-button-container {
          position: relative;
        }

        .telegram-auth-button {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #0088cc;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          min-width: 200px;
          justify-content: center;
        }

        .telegram-auth-button:hover:not(:disabled) {
          background: #006699;
          transform: translateY(-1px);
        }

        .telegram-auth-button:disabled {
          background: #ccc;
          cursor: not-allowed;
          transform: none;
        }

        .telegram-auth-icon,
        .telegram-auth-spinner {
          font-size: 1.2rem;
        }

        .telegram-auth-error {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: #fee;
          color: #c33;
          padding: 8px 12px;
          border-radius: 4px;
          margin-top: 8px;
          font-size: 0.9rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .telegram-auth-error p {
          margin: 0;
          flex: 1;
        }

        .telegram-auth-error-close {
          background: none;
          border: none;
          color: #c33;
          cursor: pointer;
          font-size: 18px;
          padding: 0;
          margin-left: 8px;
        }
      ` })] }));
};
exports.TelegramAuthButton = TelegramAuthButton;
//# sourceMappingURL=TelegramAuthButton.js.map