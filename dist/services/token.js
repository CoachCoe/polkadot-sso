"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenService = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const auth_1 = require("../config/auth");
class TokenService {
    constructor(db) {
        this.db = db;
    }
    generateTokens(address, client_id) {
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            throw new Error('JWT_SECRET environment variable is required');
        }
        const accessJwtid = crypto_1.default.randomBytes(32).toString('hex');
        const refreshJwtid = crypto_1.default.randomBytes(32).toString('hex');
        const fingerprint = crypto_1.default.randomBytes(16).toString('hex');
        const accessToken = jsonwebtoken_1.default.sign({
            address,
            client_id,
            type: 'access',
            jti: accessJwtid,
            fingerprint,
        }, jwtSecret, {
            algorithm: auth_1.JWT_CONFIG.algorithm,
            expiresIn: auth_1.JWT_CONFIG.accessTokenExpiry,
            audience: client_id,
            issuer: auth_1.JWT_CONFIG.issuer,
        });
        const refreshToken = jsonwebtoken_1.default.sign({
            address,
            client_id,
            type: 'refresh',
            jti: refreshJwtid,
            fingerprint,
        }, jwtSecret, {
            algorithm: auth_1.JWT_CONFIG.algorithm,
            expiresIn: auth_1.JWT_CONFIG.refreshTokenExpiry,
            audience: client_id,
            issuer: auth_1.JWT_CONFIG.issuer,
        });
        return {
            accessToken,
            refreshToken,
            fingerprint,
            accessJwtid,
            refreshJwtid,
        };
    }
    async verifyToken(token, type) {
        try {
            const jwtSecret = process.env.JWT_SECRET;
            if (!jwtSecret) {
                throw new Error('JWT_SECRET environment variable is required');
            }
            const decoded = jsonwebtoken_1.default.verify(token, jwtSecret, {
                algorithms: [auth_1.JWT_CONFIG.algorithm],
                issuer: auth_1.JWT_CONFIG.issuer,
            });
            if (decoded.type !== type) {
                throw new Error('Invalid token type');
            }
            const session = await this.db.get('SELECT * FROM sessions WHERE address = ? AND client_id = ? AND is_active = 1', [decoded.address, decoded.client_id]);
            if (!session) {
                throw new Error('Session not found or inactive');
            }
            if (session.fingerprint !== decoded.fingerprint) {
                throw new Error('Invalid token fingerprint');
            }
            return {
                valid: true,
                decoded,
                session,
            };
        }
        catch (error) {
            return {
                valid: false,
                error: error instanceof Error ? error.message : 'Token verification failed',
            };
        }
    }
}
exports.TokenService = TokenService;
//# sourceMappingURL=token.js.map