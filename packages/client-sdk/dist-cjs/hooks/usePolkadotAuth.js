"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.usePolkadotAuth = usePolkadotAuth;
const react_1 = require("react");
const PolkadotAuthClient_1 = require("../PolkadotAuthClient");
const walletAdapters_1 = require("../walletAdapters");
function usePolkadotAuth(config) {
    const [isAuthenticated, setIsAuthenticated] = (0, react_1.useState)(false);
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const [session, setSession] = (0, react_1.useState)(null);
    const [availableWallets, setAvailableWallets] = (0, react_1.useState)([]);
    const [authClient] = (0, react_1.useState)(() => (0, PolkadotAuthClient_1.createPolkadotAuthClient)(config));
    // Initialize available wallets
    (0, react_1.useEffect)(() => {
        const wallets = (0, walletAdapters_1.getAvailableWallets)().map(w => w.name);
        setAvailableWallets(wallets);
    }, []);
    // Check for existing session on mount
    (0, react_1.useEffect)(() => {
        const existingSession = authClient.getSession();
        if (existingSession && authClient.isAuthenticated()) {
            setSession(existingSession);
            setIsAuthenticated(true);
        }
    }, [authClient]);
    const connect = (0, react_1.useCallback)(async (walletName) => {
        setIsLoading(true);
        setError(null);
        try {
            // Get available wallets
            const wallets = (0, walletAdapters_1.getAvailableWallets)();
            if (wallets.length === 0) {
                throw new Error('No Polkadot wallets available. Please install a wallet extension.');
            }
            // Select wallet
            const selectedWallet = walletName
                ? (0, walletAdapters_1.getWalletAdapter)(walletName)
                : wallets[0]; // Use first available wallet
            if (!selectedWallet) {
                throw new Error(`Wallet "${walletName}" not available`);
            }
            // Connect to wallet
            const signer = await selectedWallet.connect();
            const address = signer.getAddress();
            // Authenticate with SSO
            const userSession = await authClient.authenticate(address, signer);
            setSession(userSession);
            setIsAuthenticated(true);
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Authentication failed';
            setError(errorMessage);
            console.error('Authentication error:', err);
        }
        finally {
            setIsLoading(false);
        }
    }, [authClient]);
    const disconnect = (0, react_1.useCallback)(() => {
        authClient.logout();
        setSession(null);
        setIsAuthenticated(false);
        setError(null);
    }, [authClient]);
    const clearError = (0, react_1.useCallback)(() => {
        setError(null);
    }, []);
    const refreshSession = (0, react_1.useCallback)(async () => {
        if (!session?.tokens?.refreshToken) {
            return;
        }
        setIsLoading(true);
        try {
            const newTokens = await authClient.refreshTokens(session.tokens.refreshToken);
            const updatedSession = {
                ...session,
                tokens: newTokens,
                lastUsedAt: Date.now(),
            };
            setSession(updatedSession);
        }
        catch (err) {
            console.error('Token refresh failed:', err);
            // If refresh fails, logout the user
            disconnect();
        }
        finally {
            setIsLoading(false);
        }
    }, [session, authClient, disconnect]);
    return {
        isAuthenticated,
        isLoading,
        error,
        session,
        availableWallets,
        connect,
        disconnect,
        clearError,
        refreshSession,
    };
}
//# sourceMappingURL=usePolkadotAuth.js.map