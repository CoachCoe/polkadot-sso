"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolkadotAuthProvider = PolkadotAuthProvider;
const jsx_runtime_1 = require("react/jsx-runtime");
const core_1 = require("@polkadot-auth/core");
const react_1 = require("react");
const PolkadotAuthContext_1 = require("../context/PolkadotAuthContext");
function PolkadotAuthProvider({ children, config = {} }) {
    const [isConnected, setIsConnected] = (0, react_1.useState)(false);
    const [address, setAddress] = (0, react_1.useState)(null);
    const [session, setSession] = (0, react_1.useState)(null);
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    // Initialize the auth instance
    const auth = (0, core_1.createPolkadotAuth)({
        defaultChain: config.defaultChain || 'polkadot',
        providers: config.providers || ['polkadot-js', 'talisman'],
    });
    const providers = auth.getProviders();
    const chains = auth.getChains();
    // Initialize real wallet and auth services
    const walletService = new core_1.WalletProviderService();
    const authService = new core_1.AuthService({
        challengeExpiration: 300, // 5 minutes
        sessionExpiration: 86400, // 24 hours
        enableNonce: true,
        enableDomainBinding: true,
        allowedDomains: [],
    });
    const connect = async (providerId) => {
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
                accountName: account.name || 'Unnamed Account',
                walletType: account.type || providerId,
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
    };
    const disconnect = async () => {
        setIsLoading(true);
        setError(null);
        try {
            // Disconnect from the wallet service
            if (session?.walletType) {
                await walletService.disconnectWallet(session.walletType);
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
    };
    const signMessage = async (message) => {
        if (!isConnected || !address || !session?.walletType) {
            throw new Error('Wallet not connected');
        }
        setIsLoading(true);
        setError(null);
        try {
            // Use the real wallet service to sign the message
            const connection = await walletService.connectWallet(session.walletType);
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
    };
    const clearError = () => {
        setError(null);
    };
    const contextValue = {
        isConnected,
        address,
        session,
        providers,
        chains,
        connect,
        disconnect,
        signMessage,
        isLoading,
        error,
        clearError,
    };
    // Auto-connect if enabled
    (0, react_1.useEffect)(() => {
        if (config.autoConnect && !isConnected && !isLoading) {
            connect('polkadot-js');
        }
    }, [config.autoConnect, isConnected, isLoading]);
    return ((0, jsx_runtime_1.jsx)(PolkadotAuthContext_1.PolkadotAuthContext.Provider, { value: contextValue, children: children }));
}
//# sourceMappingURL=PolkadotAuthProvider.js.map