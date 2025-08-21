import { TokenPayload, Session } from '../types/auth';
import { Database } from 'sqlite';
export declare class TokenService {
    private db;
    constructor(db: Database);
    generateTokens(address: string, client_id: string): {
        accessToken: string;
        refreshToken: string;
        fingerprint: string;
        accessJwtid: string;
        refreshJwtid: string;
    };
    verifyToken(token: string, type: 'access' | 'refresh'): Promise<{
        valid: boolean;
        decoded: TokenPayload;
        session: Session;
        error?: undefined;
    } | {
        valid: boolean;
        error: string;
        decoded?: undefined;
        session?: undefined;
    }>;
}
//# sourceMappingURL=token.d.ts.map