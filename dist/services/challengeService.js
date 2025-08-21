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
    generateCodeVerifier() {
        return crypto_1.default.randomBytes(32).toString('base64url');
    }
    async generateCodeChallenge(verifier) {
        const hash = crypto_1.default.createHash('sha256');
        hash.update(verifier);
        return hash.digest('base64url');
    }
    async generateChallenge(client_id) {
        const code_verifier = this.generateCodeVerifier();
        const code_challenge = await this.generateCodeChallenge(code_verifier);
        const state = crypto_1.default.randomBytes(16).toString('hex');
        return {
            id: crypto_1.default.randomUUID(),
            message: `Login to SSO Demo at ${new Date().toISOString()}`,
            code_verifier,
            code_challenge,
            state,
            client_id,
            created_at: Date.now(),
            expires_at: Date.now() + 5 * 60 * 1000,
            used: false,
        };
    }
    async storeChallenge(challenge) {
        await this.db.run(`INSERT INTO challenges (
        id, message, client_id, created_at, expires_at, 
        code_verifier, code_challenge, state, used
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            challenge.id,
            challenge.message,
            challenge.client_id,
            challenge.created_at,
            challenge.expires_at,
            challenge.code_verifier,
            challenge.code_challenge,
            challenge.state,
            challenge.used,
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
//# sourceMappingURL=challengeService.js.map