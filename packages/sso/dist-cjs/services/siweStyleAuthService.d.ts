import { Database } from 'sqlite';
import { Challenge, Session } from '../types/auth';
export interface SIWEMessage {
    domain: string;
    address: string;
    statement: string;
    uri: string;
    version: string;
    chainId: string;
    nonce: string;
    issuedAt: string;
    expirationTime?: string;
    notBefore?: string;
    requestId?: string;
    resources?: string[];
}
export interface SIWESignature {
    message: string;
    signature: string;
    address: string;
    nonce: string;
}
export declare class SIWEStyleAuthService {
    private db;
    constructor(db: Database);
    generateSIWEMessage(params: {
        domain: string;
        address: string;
        statement?: string;
        uri: string;
        version?: string;
        chainId: string;
        nonce: string;
        issuedAt: string;
        expirationTime?: string;
        notBefore?: string;
        requestId?: string;
        resources?: string[];
    }): string;
    parseSIWEMessage(message: string): SIWEMessage | null;
    validateSIWEMessage(message: string): boolean;
    isValidPolkadotAddress(address: string): boolean;
    verifySIWESignature(signature: SIWESignature, challenge: Challenge): Promise<{
        isValid: boolean;
        error?: string;
        parsedMessage?: SIWEMessage;
    }>;
    createSession(address: string, client_id: string, _parsedMessage: SIWEMessage): Promise<Session>;
    getSessionByAccessToken(accessToken: string): Promise<Session | undefined>;
    refreshSession(refreshToken: string): Promise<Session | null>;
    invalidateSession(sessionId: string): Promise<void>;
}
//# sourceMappingURL=siweStyleAuthService.d.ts.map