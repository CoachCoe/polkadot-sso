import { PolkadotAuthConfig, AuthChallenge, AuthTokens, UserSession, WalletSigner, PolkadotAuthClient as IPolkadotAuthClient } from './types';
export declare class PolkadotAuthClient implements IPolkadotAuthClient {
    private config;
    private session;
    private sessionKey;
    constructor(config: PolkadotAuthConfig);
    initiateLogin(address: string): Promise<AuthChallenge>;
    verifySignature(signature: string, challenge: AuthChallenge, address: string): Promise<string>;
    exchangeCodeForTokens(authCode: string): Promise<AuthTokens>;
    authenticate(address: string, signer: WalletSigner): Promise<UserSession>;
    refreshTokens(refreshToken: string): Promise<AuthTokens>;
    logout(): void;
    getSession(): UserSession | null;
    isAuthenticated(): boolean;
    private loadSession;
    private saveSession;
    private clearSession;
    private createAuthError;
}
export declare function createPolkadotAuthClient(config: PolkadotAuthConfig): PolkadotAuthClient;
//# sourceMappingURL=PolkadotAuthClient.d.ts.map