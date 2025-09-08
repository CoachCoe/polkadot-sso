"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.usePolkadotAuth = usePolkadotAuth;
exports.usePolkadotAuthState = usePolkadotAuthState;
const core_1 = require("@polkadot-auth/core");
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
    // Initialize real wallet and auth services
    const walletService = new core_1.WalletProviderService();
    const authService = new core_1.AuthService({
        challengeExpiration: 300, // 5 minutes
        sessionExpiration: 86400, // 24 hours
        enableNonce: true,
        enableDomainBinding: true,
        allowedDomains: [],
    });
    const clearError = (0, react_1.useCallback)(() => {
        setError(null);
    }, []);
    const connect = (0, react_1.useCallback)(async (providerId) => {
        setIsLoading(true);
        setError(null);
        try {
            // Connect to real wallet using the wallet service
            const connection = await walletService.connectWallet(providerId);
            if (connection.accounts.length === 0) {
                throw new Error('No accounts found in wallet');
            }
            // Use the first account
            const account = connection.accounts[0];
            const realAddress = account.address;
            // Generate a challenge for authentication
            const challenge = await authService.createChallenge('trex-demo-dapp', realAddress);
            // Sign the challenge message
            const signature = await connection.signMessage(challenge.message);
            // Verify the signature and create a real session
            const authResult = await authService.verifySignature({
                message: challenge.message,
                signature: signature,
                address: realAddress,
                nonce: challenge.nonce,
            }, challenge);
            if (!authResult.success) {
                throw new Error('Authentication failed');
            }
            // Create a real session
            const realSession = {
                id: challenge.id,
                address: realAddress,
                clientId: 'trex-demo-dapp',
                accessToken: 'real-access-token', // This would come from the SSO server
                refreshToken: 'real-refresh-token', // This would come from the SSO server
                accessTokenId: challenge.id,
                refreshTokenId: challenge.id,
                fingerprint: challenge.nonce,
                accessTokenExpiresAt: Date.now() + 15 * 60 * 1000,
                refreshTokenExpiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
                createdAt: Date.now(),
                lastUsedAt: Date.now(),
                isActive: true,
            };
            setAddress(realAddress);
            setSession(realSession);
            setIsConnected(true);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to connect wallet');
        }
        finally {
            setIsLoading(false);
        }
    }, [walletService, authService]);
    const disconnect = (0, react_1.useCallback)(async () => {
        setIsLoading(true);
        setError(null);
        try {
            // Disconnect from the wallet service
            if (session?.accessTokenId) {
                await walletService.disconnectWallet('polkadot-js'); // Default wallet type
            }
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
    }, [session, walletService]);
    const signMessage = (0, react_1.useCallback)(async (message) => {
        if (!isConnected || !address) {
            throw new Error('Wallet not connected');
        }
        setIsLoading(true);
        setError(null);
        try {
            // Use the real wallet service to sign the message
            const connection = await walletService.connectWallet('polkadot-js'); // Default wallet type
            const account = connection.accounts.find(acc => acc.address === address);
            if (!account) {
                throw new Error('Account not found');
            }
            const signature = await connection.signMessage(message);
            return signature;
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to sign message';
            setError(errorMessage);
            throw new Error(errorMessage);
        }
        finally {
            setIsLoading(false);
        }
    }, [isConnected, address, walletService]);
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