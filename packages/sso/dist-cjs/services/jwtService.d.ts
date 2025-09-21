import type { Session } from '../types/index.js';
export interface JWTPayload {
    sub: string;
    iss: string;
    aud: string;
    iat: number;
    exp: number;
    jti: string;
    sessionId: string;
    address: string;
    clientId: string;
}
export interface TokenPair {
    accessToken: string;
    refreshToken: string;
    accessTokenExpiresAt: number;
    refreshTokenExpiresAt: number;
}
export declare class JWTService {
    private accessTokenSecret;
    private refreshTokenSecret;
    private issuer;
    private accessTokenExpiry;
    private refreshTokenExpiry;
    constructor();
    private validateSecret;
    /**
     * Generate a new token pair for a session
     */
    generateTokenPair(session: Session): TokenPair;
    /**
     * Verify and decode an access token
     */
    verifyAccessToken(token: string): JWTPayload | null;
    /**
     * Verify and decode a refresh token
     */
    verifyRefreshToken(token: string): JWTPayload | null;
    /**
     * Extract token from Authorization header
     */
    extractTokenFromHeader(authHeader: string | undefined): string | null;
    /**
     * Check if a token is expired
     */
    isTokenExpired(payload: JWTPayload): boolean;
    /**
     * Get token expiration time
     */
    getTokenExpiration(payload: JWTPayload): Date;
    /**
     * Generate a new access token from a refresh token
     */
    refreshAccessToken(refreshToken: string): {
        accessToken: string;
        expiresAt: number;
    } | null;
    /**
     * Blacklist a token (in a real implementation, you'd store this in Redis)
     */
    blacklistToken(tokenId: string, expiresAt: number): void;
    /**
     * Check if a token is blacklisted
     */
    isTokenBlacklisted(_tokenId: string): boolean;
}
export declare const getJWTService: () => JWTService;
//# sourceMappingURL=jwtService.d.ts.map