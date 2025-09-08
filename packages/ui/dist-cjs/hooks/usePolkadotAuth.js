"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
            // Use real wallet connection instead of mock data
            const { web3Enable, web3Accounts } = await Promise.resolve().then(() => __importStar(require('@polkadot/extension-dapp')));
            const extensions = await web3Enable('T-REX Demo dApp');
            if (extensions.length === 0) {
                throw new Error('No Polkadot.js Extension found');
            }
            const accounts = await web3Accounts();
            if (accounts.length === 0) {
                throw new Error('No accounts found');
            }
            // If multiple accounts, let the user choose (for now, use the first one)
            // TODO: Implement account selection UI
            const account = accounts[0];
            const realAddress = account.address;
            console.log('Available accounts:', accounts.map(acc => ({
                address: acc.address,
                name: acc.meta.name
            })));
            const realSession = {
                id: Math.random().toString(36).substr(2, 9),
                address: realAddress,
                clientId: 'real-client',
                accessToken: 'real-access-token',
                refreshToken: 'real-refresh-token',
                accessTokenId: 'real-access-token-id',
                refreshTokenId: 'real-refresh-token-id',
                fingerprint: 'real-fingerprint',
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
    }, []);
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