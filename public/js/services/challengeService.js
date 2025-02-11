"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChallengeService = void 0;
const crypto_1 = __importDefault(require("crypto"));
class ChallengeService {
    constructor(db) {
        this.db = db;
    }
    generateChallenge(client_id) {
        return {
            id: crypto_1.default.randomUUID(),
            message: `Login to SSO Demo at ${new Date().toISOString()}`,
            nonce: crypto_1.default.randomBytes(32).toString('hex'),
            client_id,
            created_at: Date.now(),
            expires_at: Date.now() + (5 * 60 * 1000), // 5 minutes
            used: false
        };
    }
    async storeChallenge(challenge) {
        await this.db.run('INSERT INTO challenges (id, message, client_id, created_at, expires_at, nonce, used) VALUES (?, ?, ?, ?, ?, ?, ?)', [
            challenge.id,
            challenge.message,
            challenge.client_id,
            challenge.created_at,
            challenge.expires_at,
            challenge.nonce,
            challenge.used
        ]);
    }
    async getChallenge(id) {
        return this.db.get('SELECT * FROM challenges WHERE id = ? AND used = 0', [id]);
    }
    async markChallengeUsed(id) {
        await this.db.run('UPDATE challenges SET used = 1 WHERE id = ?', [id]);
    }
    async cleanupExpiredChallenges() {
        const now = Date.now();
        await this.db.run('DELETE FROM challenges WHERE expires_at < ?', [now]);
    }
}
exports.ChallengeService = ChallengeService;
