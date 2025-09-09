"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NovaQrAuth = NovaQrAuth;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
function NovaQrAuth({ qrData, onSuccess, onError, onCancel, waitForCompletion, className = '', }) {
    const [isWaiting, setIsWaiting] = (0, react_1.useState)(false);
    const [timeRemaining, setTimeRemaining] = (0, react_1.useState)(0);
    const [error, setError] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        // Calculate time remaining
        const updateTimeRemaining = () => {
            const remaining = Math.max(0, Math.floor((qrData.expiresAt - Date.now()) / 1000));
            setTimeRemaining(remaining);
            if (remaining === 0) {
                setError('QR code has expired. Please try again.');
                setIsWaiting(false);
            }
        };
        updateTimeRemaining();
        const interval = setInterval(updateTimeRemaining, 1000);
        return () => clearInterval(interval);
    }, [qrData.expiresAt]);
    const handleStartWaiting = async () => {
        setIsWaiting(true);
        setError(null);
        try {
            await waitForCompletion();
            onSuccess();
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Authentication failed';
            setError(errorMessage);
            onError(err instanceof Error ? err : new Error(errorMessage));
        }
        finally {
            setIsWaiting(false);
        }
    };
    const formatTime = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };
    return ((0, jsx_runtime_1.jsxs)("div", { className: `nova-qr-auth ${className}`, children: [(0, jsx_runtime_1.jsxs)("div", { className: 'nova-qr-auth__container', children: [(0, jsx_runtime_1.jsxs)("div", { className: 'nova-qr-auth__header', children: [(0, jsx_runtime_1.jsxs)("div", { className: 'nova-qr-auth__logo', children: [(0, jsx_runtime_1.jsx)("span", { className: 'nova-qr-auth__logo-icon', children: "\uD83D\uDFE0" }), (0, jsx_runtime_1.jsx)("span", { className: 'nova-qr-auth__logo-text', children: "Nova Wallet" })] }), (0, jsx_runtime_1.jsx)("h3", { className: 'nova-qr-auth__title', children: "Scan QR Code" }), (0, jsx_runtime_1.jsx)("p", { className: 'nova-qr-auth__subtitle', children: "Open Nova Wallet on your mobile device and scan this QR code to authenticate" })] }), (0, jsx_runtime_1.jsxs)("div", { className: 'nova-qr-auth__qr-container', children: [(0, jsx_runtime_1.jsx)("img", { src: qrData.qrCodeDataUrl, alt: 'Nova Wallet QR Code', className: 'nova-qr-auth__qr-code' }), (0, jsx_runtime_1.jsx)("div", { className: 'nova-qr-auth__qr-overlay', children: (0, jsx_runtime_1.jsx)("div", { className: 'nova-qr-auth__qr-icon', children: "\uD83D\uDCF1" }) })] }), (0, jsx_runtime_1.jsxs)("div", { className: 'nova-qr-auth__timer', children: [(0, jsx_runtime_1.jsx)("div", { className: 'nova-qr-auth__timer-icon', children: "\u23F1\uFE0F" }), (0, jsx_runtime_1.jsxs)("span", { className: 'nova-qr-auth__timer-text', children: ["Expires in ", formatTime(timeRemaining)] })] }), (0, jsx_runtime_1.jsxs)("div", { className: 'nova-qr-auth__instructions', children: [(0, jsx_runtime_1.jsx)("h4", { children: "How to authenticate:" }), (0, jsx_runtime_1.jsxs)("ol", { children: [(0, jsx_runtime_1.jsx)("li", { children: "Open Nova Wallet on your mobile device" }), (0, jsx_runtime_1.jsx)("li", { children: "Tap the \"Scan\" button in the app" }), (0, jsx_runtime_1.jsx)("li", { children: "Point your camera at this QR code" }), (0, jsx_runtime_1.jsx)("li", { children: "Review and approve the authentication request" })] })] }), error && ((0, jsx_runtime_1.jsxs)("div", { className: 'nova-qr-auth__error', children: [(0, jsx_runtime_1.jsx)("div", { className: 'nova-qr-auth__error-icon', children: "\u274C" }), (0, jsx_runtime_1.jsx)("span", { className: 'nova-qr-auth__error-text', children: error })] })), (0, jsx_runtime_1.jsx)("div", { className: 'nova-qr-auth__actions', children: !isWaiting ? ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)("button", { onClick: handleStartWaiting, disabled: timeRemaining === 0, className: 'nova-qr-auth__btn nova-qr-auth__btn--primary', children: [(0, jsx_runtime_1.jsx)("span", { className: 'nova-qr-auth__btn-icon', children: "\uD83D\uDD0D" }), "Start Waiting for Authentication"] }), (0, jsx_runtime_1.jsx)("button", { onClick: onCancel, className: 'nova-qr-auth__btn nova-qr-auth__btn--secondary', children: "Cancel" })] })) : ((0, jsx_runtime_1.jsxs)("div", { className: 'nova-qr-auth__waiting', children: [(0, jsx_runtime_1.jsx)("div", { className: 'nova-qr-auth__spinner' }), (0, jsx_runtime_1.jsx)("span", { className: 'nova-qr-auth__waiting-text', children: "Waiting for authentication..." })] })) }), (0, jsx_runtime_1.jsx)("div", { className: 'nova-qr-auth__fallback', children: (0, jsx_runtime_1.jsxs)("p", { className: 'nova-qr-auth__fallback-text', children: ["Having trouble scanning?", (0, jsx_runtime_1.jsx)("a", { href: qrData.deepLink, className: 'nova-qr-auth__fallback-link', target: '_blank', rel: 'noopener noreferrer', children: "Open in Nova Wallet" })] }) })] }), (0, jsx_runtime_1.jsx)("style", { children: `
        .nova-qr-auth {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .nova-qr-auth__container {
          max-width: 400px;
          margin: 0 auto;
          padding: 24px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
          text-align: center;
        }

        .nova-qr-auth__header {
          margin-bottom: 24px;
        }

        .nova-qr-auth__logo {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-bottom: 16px;
        }

        .nova-qr-auth__logo-icon {
          font-size: 24px;
        }

        .nova-qr-auth__logo-text {
          font-size: 18px;
          font-weight: 600;
          color: #333;
        }

        .nova-qr-auth__title {
          font-size: 20px;
          font-weight: 600;
          color: #333;
          margin: 0 0 8px 0;
        }

        .nova-qr-auth__subtitle {
          font-size: 14px;
          color: #666;
          margin: 0;
          line-height: 1.4;
        }

        .nova-qr-auth__qr-container {
          position: relative;
          display: inline-block;
          margin-bottom: 16px;
        }

        .nova-qr-auth__qr-code {
          width: 200px;
          height: 200px;
          border-radius: 8px;
          border: 2px solid #e5e7eb;
        }

        .nova-qr-auth__qr-overlay {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: rgba(255, 255, 255, 0.9);
          border-radius: 50%;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .nova-qr-auth__qr-icon {
          font-size: 20px;
        }

        .nova-qr-auth__timer {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-bottom: 20px;
          padding: 8px 16px;
          background: #f3f4f6;
          border-radius: 20px;
          font-size: 14px;
          color: #374151;
        }

        .nova-qr-auth__timer-icon {
          font-size: 16px;
        }

        .nova-qr-auth__instructions {
          text-align: left;
          margin-bottom: 20px;
          padding: 16px;
          background: #f9fafb;
          border-radius: 8px;
          border-left: 4px solid #3b82f6;
        }

        .nova-qr-auth__instructions h4 {
          margin: 0 0 12px 0;
          font-size: 14px;
          font-weight: 600;
          color: #374151;
        }

        .nova-qr-auth__instructions ol {
          margin: 0;
          padding-left: 20px;
          font-size: 13px;
          color: #6b7280;
          line-height: 1.5;
        }

        .nova-qr-auth__instructions li {
          margin-bottom: 4px;
        }

        .nova-qr-auth__error {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-bottom: 16px;
          padding: 12px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 8px;
          color: #dc2626;
          font-size: 14px;
        }

        .nova-qr-auth__error-icon {
          font-size: 16px;
        }

        .nova-qr-auth__actions {
          margin-bottom: 16px;
        }

        .nova-qr-auth__btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px 24px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          margin: 0 4px;
        }

        .nova-qr-auth__btn--primary {
          background: #3b82f6;
          color: white;
        }

        .nova-qr-auth__btn--primary:hover:not(:disabled) {
          background: #2563eb;
        }

        .nova-qr-auth__btn--primary:disabled {
          background: #9ca3af;
          cursor: not-allowed;
        }

        .nova-qr-auth__btn--secondary {
          background: #f3f4f6;
          color: #374151;
          border: 1px solid #d1d5db;
        }

        .nova-qr-auth__btn--secondary:hover {
          background: #e5e7eb;
        }

        .nova-qr-auth__btn-icon {
          font-size: 16px;
        }

        .nova-qr-auth__waiting {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 12px 24px;
          background: #f0f9ff;
          border: 1px solid #bae6fd;
          border-radius: 8px;
          color: #0369a1;
        }

        .nova-qr-auth__spinner {
          width: 20px;
          height: 20px;
          border: 2px solid #e0f2fe;
          border-top: 2px solid #0369a1;
          border-radius: 50%;
          animation: nova-qr-spin 1s linear infinite;
        }

        @keyframes nova-qr-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .nova-qr-auth__waiting-text {
          font-size: 14px;
          font-weight: 500;
        }

        .nova-qr-auth__fallback {
          padding-top: 16px;
          border-top: 1px solid #e5e7eb;
        }

        .nova-qr-auth__fallback-text {
          font-size: 12px;
          color: #6b7280;
          margin: 0;
        }

        .nova-qr-auth__fallback-link {
          color: #3b82f6;
          text-decoration: none;
          font-weight: 500;
          margin-left: 4px;
        }

        .nova-qr-auth__fallback-link:hover {
          text-decoration: underline;
        }
      ` })] }));
}
//# sourceMappingURL=NovaQrAuth.js.map