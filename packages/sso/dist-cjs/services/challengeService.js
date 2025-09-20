"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChallengeService = void 0;
const db_js_1 = require("../config/db.js");
const crypto_js_1 = require("../utils/crypto.js");
const logger_js_1 = require("../utils/logger.js");
const cacheService_js_1 = require("./cacheService.js");
const logger = (0, logger_js_1.createLogger)('challenge-service');
class ChallengeService {
    constructor() { }
    generateCodeVerifier() {
        return Buffer.from((0, crypto_js_1.randomBytes)(32)).toString('base64url');
    }
    async generateCodeChallenge(verifier) {
        const hash = (0, crypto_js_1.createHash)('sha256');
        hash.update(verifier);
        return hash.digest('base64url');
    }
    generateNonce() {
        return Array.from((0, crypto_js_1.randomBytes)(32))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }
    formatSIWEStyleMessage(params) {
        const { domain, address, statement, uri, version, chainId, nonce, issuedAt, expirationTime, notBefore, requestId, resources, } = params;
        let message = `${domain} wants you to sign in with your Polkadot account:\n`;
        message += `${address}\n\n`;
        if (statement) {
            message += `${statement}\n\n`;
        }
        message += `URI: ${uri}\n`;
        message += `Version: ${version}\n`;
        message += `Chain ID: ${chainId}\n`;
        message += `Nonce: ${nonce}\n`;
        message += `Issued At: ${issuedAt}`;
        if (expirationTime) {
            message += `\nExpiration Time: ${expirationTime}`;
        }
        if (notBefore) {
            message += `\nNot Before: ${notBefore}`;
        }
        if (requestId) {
            message += `\nRequest ID: ${requestId}`;
        }
        if (resources && resources.length > 0) {
            message += `\nResources:`;
            resources.forEach(resource => {
                message += `\n- ${resource}`;
            });
        }
        return message;
    }
    async generateChallenge(client_id, userAddress) {
        let db = null;
        try {
            const code_verifier = this.generateCodeVerifier();
            const code_challenge = await this.generateCodeChallenge(code_verifier);
            const state = Array.from((0, crypto_js_1.randomBytes)(16))
                .map(b => b.toString(16).padStart(2, '0'))
                .join('');
            const nonce = this.generateNonce();
            const issuedAt = new Date().toISOString();
            const expirationTime = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes
            const message = this.formatSIWEStyleMessage({
                domain: 'polkadot-sso.localhost',
                address: userAddress || '0x...', // Will be replaced with actual address
                statement: 'Sign this message to authenticate with Polkadot SSO',
                uri: 'http://localhost:3000',
                version: '1',
                chainId: 'kusama',
                nonce,
                issuedAt,
                expirationTime,
                requestId: Array.from((0, crypto_js_1.randomBytes)(16))
                    .map(b => b.toString(16).padStart(2, '0'))
                    .join(''),
                resources: ['https://polkadot-sso.localhost'],
            });
            const challenge = {
                id: (0, crypto_js_1.randomUUID)(),
                message,
                client_id,
                created_at: Date.now(),
                expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes
                expires_at_timestamp: Math.floor((Date.now() + 5 * 60 * 1000) / 1000),
                code_verifier,
                code_challenge,
                state,
                nonce,
                issued_at: issuedAt,
                used: false,
            };
            db = await (0, db_js_1.getDatabaseConnection)();
            await db.run(`INSERT INTO challenges (
          id, message, client_id, created_at, expires_at,
          expires_at_timestamp, code_verifier, code_challenge,
          state, nonce, issued_at, used
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                challenge.id,
                challenge.message,
                challenge.client_id,
                challenge.created_at,
                challenge.expires_at,
                challenge.expires_at_timestamp,
                challenge.code_verifier,
                challenge.code_challenge,
                challenge.state,
                challenge.nonce,
                challenge.issued_at,
                0,
            ]);
            const cacheStrategies = (0, cacheService_js_1.getCacheStrategies)();
            await cacheStrategies.setChallenge(challenge.id, challenge);
            logger.info('Challenge generated successfully', {
                challengeId: challenge.id,
                clientId: client_id,
                address: userAddress,
            });
            return challenge;
        }
        catch (error) {
            logger.error('Failed to generate challenge', {
                error: error instanceof Error ? error.message : String(error),
                clientId: client_id,
                address: userAddress,
            });
            throw error;
        }
        finally {
            if (db) {
                (0, db_js_1.releaseDatabaseConnection)(db);
            }
        }
    }
    async getChallenge(challengeId) {
        let db = null;
        try {
            const cacheStrategies = (0, cacheService_js_1.getCacheStrategies)();
            let challenge = await cacheStrategies.getChallenge(challengeId);
            if (!challenge) {
                db = await (0, db_js_1.getDatabaseConnection)();
                const result = await db.get('SELECT * FROM challenges WHERE id = ? AND used = 0 AND expires_at > ?', [challengeId, Date.now()]);
                if (result) {
                    challenge = {
                        id: result.id,
                        message: result.message,
                        client_id: result.client_id,
                        created_at: result.created_at,
                        expires_at: result.expires_at,
                        expires_at_timestamp: result.expires_at_timestamp,
                        code_verifier: result.code_verifier,
                        code_challenge: result.code_challenge,
                        state: result.state,
                        nonce: result.nonce,
                        issued_at: result.issued_at,
                        used: Boolean(result.used),
                    };
                    await cacheStrategies.setChallenge(challengeId, challenge);
                }
            }
            return challenge || null;
        }
        catch (error) {
            logger.error('Failed to get challenge', {
                error: error instanceof Error ? error.message : String(error),
                challengeId,
            });
            return null;
        }
        finally {
            if (db) {
                (0, db_js_1.releaseDatabaseConnection)(db);
            }
        }
    }
    async markChallengeUsed(challengeId) {
        let db = null;
        try {
            db = await (0, db_js_1.getDatabaseConnection)();
            const result = await db.run('UPDATE challenges SET used = 1 WHERE id = ?', [challengeId]);
            if (result.changes > 0) {
                const cacheStrategies = (0, cacheService_js_1.getCacheStrategies)();
                await cacheStrategies.getChallenge(challengeId);
                logger.info('Challenge marked as used', { challengeId });
                return true;
            }
            return false;
        }
        catch (error) {
            logger.error('Failed to mark challenge as used', {
                error: error instanceof Error ? error.message : String(error),
                challengeId,
            });
            return false;
        }
        finally {
            if (db) {
                (0, db_js_1.releaseDatabaseConnection)(db);
            }
        }
    }
    async cleanupExpiredChallenges() {
        let db = null;
        try {
            db = await (0, db_js_1.getDatabaseConnection)();
            const result = await db.run('DELETE FROM challenges WHERE expires_at < ?', [Date.now()]);
            if (result.changes > 0) {
                logger.info('Cleaned up expired challenges', { count: result.changes });
            }
            return result.changes || 0;
        }
        catch (error) {
            logger.error('Failed to cleanup expired challenges', {
                error: error instanceof Error ? error.message : String(error),
            });
            return 0;
        }
        finally {
            if (db) {
                (0, db_js_1.releaseDatabaseConnection)(db);
            }
        }
    }
    async getChallengeStats() {
        let db = null;
        try {
            db = await (0, db_js_1.getDatabaseConnection)();
            const now = Date.now();
            const activeResult = await db.get('SELECT COUNT(*) as count FROM challenges WHERE used = 0 AND expires_at > ?', [now]);
            const expiredResult = await db.get('SELECT COUNT(*) as count FROM challenges WHERE expires_at <= ?', [now]);
            const usedResult = await db.get('SELECT COUNT(*) as count FROM challenges WHERE used = 1', []);
            return {
                active: activeResult?.count || 0,
                expired: expiredResult?.count || 0,
                used: usedResult?.count || 0,
            };
        }
        catch (error) {
            logger.error('Failed to get challenge stats', {
                error: error instanceof Error ? error.message : String(error),
            });
            return { active: 0, expired: 0, used: 0 };
        }
        finally {
            if (db) {
                (0, db_js_1.releaseDatabaseConnection)(db);
            }
        }
    }
}
exports.ChallengeService = ChallengeService;
//# sourceMappingURL=challengeService.js.map