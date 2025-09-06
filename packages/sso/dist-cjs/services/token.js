"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenService = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const auth_1 = require("../config/auth");
const db_1 = require("../config/db");
const crypto_1 = require("../utils/crypto");
const logger_1 = require("../utils/logger");
const cacheService_1 = require("./cacheService");
const logger = (0, logger_1.createLogger)('token-service');
class TokenService {
    constructor() { }
    generateTokens(address, client_id) {
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            throw new Error('JWT_SECRET environment variable is required');
        }
        const accessJwtid = Array.from((0, crypto_1.randomBytes)(32))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
        const refreshJwtid = Array.from((0, crypto_1.randomBytes)(32))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
        const fingerprint = Array.from((0, crypto_1.randomBytes)(16))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
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
        let db = null;
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
            const cacheStrategies = (0, cacheService_1.getCacheStrategies)();
            const cacheKey = `session:${decoded.address}:${decoded.client_id}`;
            let session = await cacheStrategies.getSession(cacheKey);
            if (!session) {
                db = await (0, db_1.getDatabaseConnection)();
                session = (await db.get('SELECT * FROM sessions WHERE address = ? AND client_id = ? AND is_active = 1', [decoded.address, decoded.client_id]));
                if (session) {
                    await cacheStrategies.setSession(cacheKey, session);
                }
            }
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
        finally {
            if (db) {
                (0, db_1.releaseDatabaseConnection)(db);
            }
        }
    }
    async createSession(address, client_id) {
        let db = null;
        try {
            const tokens = this.generateTokens(address, client_id);
            const now = Date.now();
            const accessTokenExpiresAt = now + auth_1.JWT_CONFIG.accessTokenExpiry * 1000;
            const refreshTokenExpiresAt = now + auth_1.JWT_CONFIG.refreshTokenExpiry * 1000;
            const session = {
                id: crypto.randomUUID(),
                address,
                client_id,
                access_token: tokens.accessToken,
                refresh_token: tokens.refreshToken,
                access_token_id: tokens.accessJwtid,
                refresh_token_id: tokens.refreshJwtid,
                fingerprint: tokens.fingerprint,
                access_token_expires_at: accessTokenExpiresAt,
                refresh_token_expires_at: refreshTokenExpiresAt,
                created_at: now,
                last_used_at: now,
                is_active: true,
            };
            db = await (0, db_1.getDatabaseConnection)();
            await db.run(`INSERT INTO sessions (
          id, address, client_id, access_token, refresh_token,
          access_token_id, refresh_token_id, fingerprint,
          access_token_expires_at, refresh_token_expires_at,
          created_at, last_used_at, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                session.id,
                session.address,
                session.client_id,
                session.access_token,
                session.refresh_token,
                session.access_token_id,
                session.refresh_token_id,
                session.fingerprint,
                session.access_token_expires_at,
                session.refresh_token_expires_at,
                session.created_at,
                session.last_used_at,
                session.is_active ? 1 : 0,
            ]);
            const cacheStrategies = (0, cacheService_1.getCacheStrategies)();
            const cacheKey = `session:${address}:${client_id}`;
            await cacheStrategies.setSession(cacheKey, session);
            logger.info('Session created successfully', {
                sessionId: session.id,
                address,
                clientId: client_id,
            });
            return session;
        }
        catch (error) {
            logger.error('Failed to create session', {
                error: error instanceof Error ? error.message : String(error),
                address,
                clientId: client_id,
            });
            return null;
        }
        finally {
            if (db) {
                (0, db_1.releaseDatabaseConnection)(db);
            }
        }
    }
    async invalidateSession(accessToken) {
        let db = null;
        try {
            const result = await this.verifyToken(accessToken, 'access');
            if (!result.valid || !result.session) {
                return false;
            }
            db = await (0, db_1.getDatabaseConnection)();
            await db.run('UPDATE sessions SET is_active = 0 WHERE id = ?', [result.session.id]);
            const cacheStrategies = (0, cacheService_1.getCacheStrategies)();
            const cacheKey = `session:${result.session.address}:${result.session.client_id}`;
            await cacheStrategies.getSession(cacheKey); // This will clear the cache entry
            logger.info('Session invalidated successfully', {
                sessionId: result.session.id,
                address: result.session.address,
            });
            return true;
        }
        catch (error) {
            logger.error('Failed to invalidate session', {
                error: error instanceof Error ? error.message : String(error),
            });
            return false;
        }
        finally {
            if (db) {
                (0, db_1.releaseDatabaseConnection)(db);
            }
        }
    }
    async refreshSession(refreshToken) {
        let db = null;
        try {
            const result = await this.verifyToken(refreshToken, 'refresh');
            if (!result.valid || !result.session) {
                return null;
            }
            const tokens = this.generateTokens(result.session.address, result.session.client_id);
            const now = Date.now();
            const accessTokenExpiresAt = now + auth_1.JWT_CONFIG.accessTokenExpiry * 1000;
            const refreshTokenExpiresAt = now + auth_1.JWT_CONFIG.refreshTokenExpiry * 1000;
            db = await (0, db_1.getDatabaseConnection)();
            await db.run(`UPDATE sessions SET
          access_token = ?, refresh_token = ?,
          access_token_id = ?, refresh_token_id = ?,
          fingerprint = ?, access_token_expires_at = ?,
          refresh_token_expires_at = ?, last_used_at = ?
        WHERE id = ?`, [
                tokens.accessToken,
                tokens.refreshToken,
                tokens.accessJwtid,
                tokens.refreshJwtid,
                tokens.fingerprint,
                accessTokenExpiresAt,
                refreshTokenExpiresAt,
                now,
                result.session.id,
            ]);
            const updatedSession = {
                ...result.session,
                access_token: tokens.accessToken,
                refresh_token: tokens.refreshToken,
                access_token_id: tokens.accessJwtid,
                refresh_token_id: tokens.refreshJwtid,
                fingerprint: tokens.fingerprint,
                access_token_expires_at: accessTokenExpiresAt,
                refresh_token_expires_at: refreshTokenExpiresAt,
                last_used_at: now,
            };
            const cacheStrategies = (0, cacheService_1.getCacheStrategies)();
            const cacheKey = `session:${result.session.address}:${result.session.client_id}`;
            await cacheStrategies.setSession(cacheKey, updatedSession);
            logger.info('Session refreshed successfully', {
                sessionId: result.session.id,
                address: result.session.address,
            });
            return updatedSession;
        }
        catch (error) {
            logger.error('Failed to refresh session', {
                error: error instanceof Error ? error.message : String(error),
            });
            return null;
        }
        finally {
            if (db) {
                (0, db_1.releaseDatabaseConnection)(db);
            }
        }
    }
    async getSessionStats() {
        let db = null;
        try {
            db = await (0, db_1.getDatabaseConnection)();
            const activeResult = await db.get('SELECT COUNT(*) as count FROM sessions WHERE is_active = 1');
            const totalResult = await db.get('SELECT COUNT(*) as count FROM sessions');
            return {
                active: activeResult?.count || 0,
                total: totalResult?.count || 0,
            };
        }
        catch (error) {
            logger.error('Failed to get session stats', {
                error: error instanceof Error ? error.message : String(error),
            });
            return { active: 0, total: 0 };
        }
        finally {
            if (db) {
                (0, db_1.releaseDatabaseConnection)(db);
            }
        }
    }
}
exports.TokenService = TokenService;
//# sourceMappingURL=token.js.map