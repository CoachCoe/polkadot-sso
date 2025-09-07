export interface PolkadotAuthConfig {
    ssoEndpoint: string;
    clientId: string;
    clientSecret?: string;
    redirectUri?: string;
    defaultChain?: 'polkadot' | 'kusama';
    supportedWallets?: string[];
}
export interface AuthChallenge {
    challengeId: string;
    message: string;
    codeVerifier: string;
    state: string;
    expiresAt: number;
}
export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
    tokenType: string;
    expiresIn: number;
    expiresAt: number;
}
export interface UserSession {
    address: string;
    tokens: AuthTokens;
    authenticatedAt: number;
    lastUsedAt: number;
}
export interface WalletSigner {
    signMessage: (message: string) => Promise<string>;
    getAddress: () => string;
}
export interface PolkadotAuthClient {
    initiateLogin: (address: string) => Promise<AuthChallenge>;
    verifySignature: (signature: string, challenge: AuthChallenge, address: string) => Promise<string>;
    exchangeCodeForTokens: (authCode: string) => Promise<AuthTokens>;
    authenticate: (address: string, signer: WalletSigner) => Promise<UserSession>;
    refreshTokens: (refreshToken: string) => Promise<AuthTokens>;
    logout: () => void;
    getSession: () => UserSession | null;
    isAuthenticated: () => boolean;
}
export interface AuthError extends Error {
    code: string;
    details?: any;
}
export interface PolkadotWalletAdapter {
    name: string;
    isAvailable: () => boolean;
    connect: () => Promise<WalletSigner>;
}
export interface UsePolkadotAuthReturn {
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
    session: UserSession | null;
    availableWallets: string[];
    connect: (walletName?: string) => Promise<void>;
    disconnect: () => void;
    clearError: () => void;
    refreshSession: () => Promise<void>;
}
//# sourceMappingURL=types.d.ts.map