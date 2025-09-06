"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.usePolkadotAuth = usePolkadotAuth;
exports.usePolkadotAuthState = usePolkadotAuthState;
const react_1 = require("react");
const PolkadotAuthContext_1 = require("../context/PolkadotAuthContext");
function usePolkadotAuth() {
    const context = (0, react_1.useContext)(PolkadotAuthContext_1.PolkadotAuthContext);
    if (!context) {
        throw new Error('usePolkadotAuth must be used within a PolkadotAuthProvider');
    }
    return context;
}
function usePolkadotAuthState() {
    const [isConnected, setIsConnected] = (0, react_1.useState)(false);
    const [address, setAddress] = (0, react_1.useState)(null);
    const [session, setSession] = (0, react_1.useState)(null);
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const clearError = (0, react_1.useCallback)(() => {
        setError(null);
    }, []);
    const connect = (0, react_1.useCallback)(async (providerId) => {
        setIsLoading(true);
        setError(null);
        try {
            // This would be implemented based on the actual wallet provider
            // For now, we'll simulate a connection
            const mockAddress = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
            const mockSession = {
                id: 'mock-session-id',
                address: mockAddress,
                clientId: 'mock-client',
                accessToken: 'mock-access-token',
                refreshToken: 'mock-refresh-token',
                accessTokenId: 'mock-access-token-id',
                refreshTokenId: 'mock-refresh-token-id',
                fingerprint: 'mock-fingerprint',
                accessTokenExpiresAt: Date.now() + 15 * 60 * 1000,
                refreshTokenExpiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
                createdAt: Date.now(),
                lastUsedAt: Date.now(),
                isActive: true,
            };
            setAddress(mockAddress);
            setSession(mockSession);
            setIsConnected(true);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to connect wallet');
        }
        finally {
            setIsLoading(false);
        }
    }, []);
    const disconnect = (0, react_1.useCallback)(async () => {
        setIsLoading(true);
        setError(null);
        try {
            setAddress(null);
            setSession(null);
            setIsConnected(false);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to disconnect wallet');
        }
        finally {
            setIsLoading(false);
        }
    }, []);
    const signMessage = (0, react_1.useCallback)(async (message) => {
        if (!isConnected || !address) {
            throw new Error('Wallet not connected');
        }
        setIsLoading(true);
        setError(null);
        try {
            // This would be implemented based on the actual wallet provider
            // For now, we'll simulate a signature
            const mockSignature = `0x${Math.random().toString(16).substr(2, 64)}`;
            return mockSignature;
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to sign message';
            setError(errorMessage);
            throw new Error(errorMessage);
        }
        finally {
            setIsLoading(false);
        }
    }, [isConnected, address]);
    return {
        isConnected,
        address,
        session,
        providers: [], // Would be populated from context
        chains: [], // Would be populated from context
        connect,
        disconnect,
        signMessage,
        isLoading,
        error,
        clearError,
    };
}
//# sourceMappingURL=usePolkadotAuth.js.map