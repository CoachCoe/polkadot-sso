import { TokenPayload } from '../types/auth';
export declare const JWT_CONFIG: {
    algorithm: "HS512";
    issuer: string;
    accessTokenExpiry: number;
    refreshTokenExpiry: number;
};
export declare const authLimiter: import("express-rate-limit").RateLimitRequestHandler;
export interface VerifyTokenResult {
    valid: boolean;
    decoded?: TokenPayload;
    error?: string;
}
//# sourceMappingURL=auth.d.ts.map