"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.jwtService = exports.JWTService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
class JWTService {
    constructor() {
        this.accessTokenSecret = process.env.JWT_ACCESS_SECRET || 'default-access-secret';
        this.refreshTokenSecret = process.env.JWT_REFRESH_SECRET || 'default-refresh-secret';
        this.issuer = process.env.JWT_ISSUER || 'polkadot-sso';
        this.accessTokenExpiry = parseInt(process.env.JWT_ACCESS_EXPIRY || '900'); // 15 minutes
        this.refreshTokenExpiry = parseInt(process.env.JWT_REFRESH_EXPIRY || '604800'); // 7 days
    }
    /**
     * Generate a new token pair for a session
     */
    generateTokenPair(session) {
        const now = Math.floor(Date.now() / 1000);
        const accessTokenExpiresAt = now + this.accessTokenExpiry;
        const refreshTokenExpiresAt = now + this.refreshTokenExpiry;
        // Generate unique token IDs
        const accessTokenId = crypto_1.default.randomUUID();
        const refreshTokenId = crypto_1.default.randomUUID();
        // Create access token payload
        const accessTokenPayload = {
            sub: session.address,
            iss: this.issuer,
            aud: session.client_id,
            iat: now,
            exp: accessTokenExpiresAt,
            jti: accessTokenId,
            sessionId: session.id,
            address: session.address,
            clientId: session.client_id,
        };
        // Create refresh token payload
        const refreshTokenPayload = {
            sub: session.address,
            iss: this.issuer,
            aud: session.client_id,
            iat: now,
            exp: refreshTokenExpiresAt,
            jti: refreshTokenId,
            sessionId: session.id,
            address: session.address,
            clientId: session.client_id,
        };
        // Generate tokens
        const accessToken = jsonwebtoken_1.default.sign(accessTokenPayload, this.accessTokenSecret, {
            algorithm: 'HS256',
        });
        const refreshToken = jsonwebtoken_1.default.sign(refreshTokenPayload, this.refreshTokenSecret, {
            algorithm: 'HS256',
        });
        return {
            accessToken,
            refreshToken,
            accessTokenExpiresAt: accessTokenExpiresAt * 1000, // Convert to milliseconds
            refreshTokenExpiresAt: refreshTokenExpiresAt * 1000, // Convert to milliseconds
        };
    }
    /**
     * Verify and decode an access token
     */
    verifyAccessToken(token) {
        try {
            const payload = jsonwebtoken_1.default.verify(token, this.accessTokenSecret, {
                algorithms: ['HS256'],
                issuer: this.issuer,
            });
            return payload;
        }
        catch (error) {
            console.error('Access token verification failed:', error);
            return null;
        }
    }
    /**
     * Verify and decode a refresh token
     */
    verifyRefreshToken(token) {
        try {
            const payload = jsonwebtoken_1.default.verify(token, this.refreshTokenSecret, {
                algorithms: ['HS256'],
                issuer: this.issuer,
            });
            return payload;
        }
        catch (error) {
            console.error('Refresh token verification failed:', error);
            return null;
        }
    }
    /**
     * Extract token from Authorization header
     */
    extractTokenFromHeader(authHeader) {
        if (!authHeader) {
            return null;
        }
        const parts = authHeader.split(' ');
        if (parts.length !== 2 || parts[0] !== 'Bearer') {
            return null;
        }
        return parts[1];
    }
    /**
     * Check if a token is expired
     */
    isTokenExpired(payload) {
        const now = Math.floor(Date.now() / 1000);
        return payload.exp < now;
    }
    /**
     * Get token expiration time
     */
    getTokenExpiration(payload) {
        return new Date(payload.exp * 1000);
    }
    /**
     * Generate a new access token from a refresh token
     */
    refreshAccessToken(refreshToken) {
        const payload = this.verifyRefreshToken(refreshToken);
        if (!payload) {
            return null;
        }
        if (this.isTokenExpired(payload)) {
            return null;
        }
        const now = Math.floor(Date.now() / 1000);
        const accessTokenExpiresAt = now + this.accessTokenExpiry;
        const accessTokenId = crypto_1.default.randomUUID();
        const accessTokenPayload = {
            sub: payload.sub,
            iss: this.issuer,
            aud: payload.aud,
            iat: now,
            exp: accessTokenExpiresAt,
            jti: accessTokenId,
            sessionId: payload.sessionId,
            address: payload.address,
            clientId: payload.clientId,
        };
        const accessToken = jsonwebtoken_1.default.sign(accessTokenPayload, this.accessTokenSecret, {
            algorithm: 'HS256',
        });
        return {
            accessToken,
            expiresAt: accessTokenExpiresAt * 1000, // Convert to milliseconds
        };
    }
    /**
     * Blacklist a token (in a real implementation, you'd store this in Redis)
     */
    blacklistToken(tokenId, expiresAt) {
        // In a real implementation, you would store the blacklisted token ID
        // in Redis with an expiration time
        console.log(`Token ${tokenId} blacklisted until ${new Date(expiresAt)}`);
    }
    /**
     * Check if a token is blacklisted
     */
    isTokenBlacklisted(tokenId) {
        // In a real implementation, you would check Redis for the token ID
        return false;
    }
}
exports.JWTService = JWTService;
// Global JWT service instance
exports.jwtService = new JWTService();
//# sourceMappingURL=jwtService.js.map