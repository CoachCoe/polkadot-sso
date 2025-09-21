"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SIWEStyleAuthService = void 0;
const crypto_1 = __importDefault(require("crypto"));
class SIWEStyleAuthService {
    constructor(db) {
        this.db = db;
    }
    generateSIWEMessage(params) {
        const { domain, address, statement = 'Sign this message to authenticate with Polkadot SSO', uri, version = '1', chainId, nonce, issuedAt, expirationTime, notBefore, requestId, resources, } = params;
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
    parseSIWEMessage(message) {
        try {
            const lines = message.split('\n');
            const parsed = {};
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                if (line.includes('wants you to sign in with your Polkadot account:')) {
                    parsed.domain = line.split(' wants you to sign in')[0];
                    if (i + 1 < lines.length) {
                        const addressLine = lines[i + 1].trim();
                        if (this.isValidPolkadotAddress(addressLine)) {
                            parsed.address = addressLine;
                        }
                    }
                }
                else if (line.startsWith('URI: ')) {
                    parsed.uri = line.substring(5);
                }
                else if (line.startsWith('Version: ')) {
                    parsed.version = line.substring(9);
                }
                else if (line.startsWith('Chain ID: ')) {
                    parsed.chainId = line.substring(10);
                }
                else if (line.startsWith('Nonce: ')) {
                    parsed.nonce = line.substring(7);
                }
                else if (line.startsWith('Issued At: ')) {
                    parsed.issuedAt = line.substring(11);
                }
                else if (line.startsWith('Expiration Time: ')) {
                    parsed.expirationTime = line.substring(17);
                }
                else if (line.startsWith('Not Before: ')) {
                    parsed.notBefore = line.substring(12);
                }
                else if (line.startsWith('Request ID: ')) {
                    parsed.requestId = line.substring(12);
                }
            }
            const addressIndex = lines.findIndex(line => this.isValidPolkadotAddress(line.trim()));
            const uriIndex = lines.findIndex(line => line.startsWith('URI: '));
            if (addressIndex !== -1 && uriIndex !== -1 && uriIndex > addressIndex + 1) {
                const statementLines = lines.slice(addressIndex + 1, uriIndex).filter(line => line.trim());
                if (statementLines.length > 0) {
                    parsed.statement = statementLines.join('\n');
                }
            }
            if (!parsed.domain ||
                !parsed.address ||
                !parsed.uri ||
                !parsed.version ||
                !parsed.chainId ||
                !parsed.nonce ||
                !parsed.issuedAt) {
                return null;
            }
            return parsed;
        }
        catch (error) {
            console.error('Error parsing SIWE message:', error);
            return null;
        }
    }
    validateSIWEMessage(message) {
        const requiredFields = [
            'wants you to sign in with your Polkadot account:',
            'URI:',
            'Version:',
            'Chain ID:',
            'Nonce:',
            'Issued At:',
        ];
        return requiredFields.every(field => message.includes(field));
    }
    isValidPolkadotAddress(address) {
        // Polkadot addresses are 47-48 characters long and use base58 encoding
        return /^[1-9A-HJ-NP-Za-km-z]{47,48}$/.test(address);
    }
    async verifySIWESignature(signature, challenge) {
        try {
            if (!this.validateSIWEMessage(signature.message)) {
                return { isValid: false, error: 'Invalid SIWE message format' };
            }
            const parsedMessage = this.parseSIWEMessage(signature.message);
            if (!parsedMessage) {
                return { isValid: false, error: 'Failed to parse SIWE message' };
            }
            if (parsedMessage.nonce !== challenge.nonce) {
                return { isValid: false, error: 'Nonce mismatch' };
            }
            if (!this.isValidPolkadotAddress(parsedMessage.address)) {
                return { isValid: false, error: 'Invalid Polkadot address format' };
            }
            if (parsedMessage.expirationTime) {
                const expirationTime = new Date(parsedMessage.expirationTime);
                if (expirationTime < new Date()) {
                    return { isValid: false, error: 'Message has expired' };
                }
            }
            const issuedAt = new Date(parsedMessage.issuedAt);
            if (issuedAt > new Date()) {
                return { isValid: false, error: 'Message issued time is in the future' };
            }
            if (parsedMessage.notBefore) {
                const notBefore = new Date(parsedMessage.notBefore);
                if (notBefore > new Date()) {
                    return { isValid: false, error: 'Message not yet valid' };
                }
            }
            return {
                isValid: true,
                parsedMessage,
            };
        }
        catch (error) {
            console.error('Error verifying SIWE signature:', error);
            return { isValid: false, error: 'Signature verification failed' };
        }
    }
    async createSession(address, client_id, _parsedMessage) {
        const sessionId = crypto_1.default.randomUUID();
        const accessToken = crypto_1.default.randomBytes(32).toString('hex');
        const refreshToken = crypto_1.default.randomBytes(32).toString('hex');
        const fingerprint = crypto_1.default.randomBytes(16).toString('hex');
        const now = Date.now();
        const accessTokenExpiresAt = now + 15 * 60 * 1000;
        const refreshTokenExpiresAt = now + 7 * 24 * 60 * 60 * 1000;
        const session = {
            id: sessionId,
            address,
            client_id,
            access_token: accessToken,
            refresh_token: refreshToken,
            access_token_id: crypto_1.default.randomUUID(),
            refresh_token_id: crypto_1.default.randomUUID(),
            fingerprint,
            access_token_expires_at: accessTokenExpiresAt,
            refresh_token_expires_at: refreshTokenExpiresAt,
            created_at: now,
            last_used_at: now,
            is_active: true,
        };
        await this.db.run(`INSERT INTO sessions (
        id, address, client_id, access_token, refresh_token, access_token_id,
        refresh_token_id, fingerprint, access_token_expires_at, refresh_token_expires_at,
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
            session.is_active,
        ]);
        return session;
    }
    async getSessionByAccessToken(accessToken) {
        return this.db.get('SELECT * FROM sessions WHERE access_token = ? AND is_active = 1 AND access_token_expires_at > ?', [accessToken, Date.now()]);
    }
    async refreshSession(refreshToken) {
        const session = await this.db.get('SELECT * FROM sessions WHERE refresh_token = ? AND is_active = 1 AND refresh_token_expires_at > ?', [refreshToken, Date.now()]);
        if (!session) {
            return null;
        }
        const newAccessToken = crypto_1.default.randomBytes(32).toString('hex');
        const newRefreshToken = crypto_1.default.randomBytes(32).toString('hex');
        const now = Date.now();
        const newAccessTokenExpiresAt = now + 15 * 60 * 1000;
        const newRefreshTokenExpiresAt = now + 7 * 24 * 60 * 60 * 1000;
        await this.db.run(`UPDATE sessions SET
        access_token = ?, refresh_token = ?, access_token_expires_at = ?,
        refresh_token_expires_at = ?, last_used_at = ?
       WHERE id = ?`, [
            newAccessToken,
            newRefreshToken,
            newAccessTokenExpiresAt,
            newRefreshTokenExpiresAt,
            now,
            session.id,
        ]);
        return {
            ...session,
            access_token: newAccessToken,
            refresh_token: newRefreshToken,
            access_token_expires_at: newAccessTokenExpiresAt,
            refresh_token_expires_at: newRefreshTokenExpiresAt,
            last_used_at: now,
        };
    }
    async invalidateSession(sessionId) {
        await this.db.run('UPDATE sessions SET is_active = 0 WHERE id = ?', [sessionId]);
    }
}
exports.SIWEStyleAuthService = SIWEStyleAuthService;
//# sourceMappingURL=siweStyleAuthService.js.map