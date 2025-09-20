import { Session } from '../types/auth.js';
export declare class TokenService {
    constructor();
    generateTokens(address: string, client_id: string): {
        accessToken: string;
        refreshToken: string;
        fingerprint: string;
        accessJwtid: string;
        refreshJwtid: string;
        accessTokenExpiresAt: number;
        refreshTokenExpiresAt: number;
    };
    verifyToken(token: string, type: 'access' | 'refresh'): Promise<{
        valid: boolean;
        decoded: import("./jwtService.js").JWTPayload;
        session: Session;
        error?: undefined;
    } | {
        valid: boolean;
        error: string;
        decoded?: undefined;
        session?: undefined;
    }>;
    createSession(address: string, client_id: string): Promise<Session | null>;
    invalidateSession(accessToken: string): Promise<boolean>;
    refreshSession(refreshToken: string): Promise<Session | null>;
    getSessionStats(): Promise<{
        active: number;
        total: number;
    }>;
}
//# sourceMappingURL=token.d.ts.map