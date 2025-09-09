"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = exports.AuthService = void 0;
const crypto_js_1 = require("../utils/crypto.js");
class AuthService {
    constructor(config = {}) {
        this.challenges = new Map();
        this.sessions = new Map();
        this.config = {
            challengeExpiration: 300, // 5 minutes
            sessionExpiration: 86400, // 24 hours
            enableNonce: true,
            enableDomainBinding: true,
            allowedDomains: [],
            ...config,
        };
    }
    /**
     * Create a new authentication challenge
     */
    async createChallenge(clientId, userAddress) {
        const challengeId = this.generateId();
        const nonce = this.generateNonce();
        const issuedAt = new Date().toISOString();
        const expiresAt = new Date(Date.now() + this.config.challengeExpiration * 1000).toISOString();
        // Create SIWE message
        const message = this.createSIWEMessage({
            address: userAddress || '',
            nonce,
            issuedAt,
            expiresAt,
        });
        const challenge = {
            id: challengeId,
            message: this.formatSIWEMessage(message),
            clientId,
            nonce,
            issuedAt,
            expiresAt,
            createdAt: Date.now(),
            expiresAtTimestamp: new Date(expiresAt).getTime(),
            used: false,
        };
        this.challenges.set(challengeId, challenge);
        return challenge;
    }
    /**
     * Verify a signature against a challenge
     */
    async verifySignature(signature, challenge) {
        try {
            // Check if challenge exists and is valid
            const storedChallenge = this.challenges.get(challenge.id);
            if (!storedChallenge) {
                return {
                    success: false,
                    error: 'Challenge not found',
                    errorCode: 'CHALLENGE_NOT_FOUND',
                };
            }
            // Check if challenge has expired
            if (Date.now() > storedChallenge.expiresAtTimestamp) {
                this.challenges.delete(challenge.id);
                return {
                    success: false,
                    error: 'Challenge has expired',
                    errorCode: 'CHALLENGE_EXPIRED',
                };
            }
            // Check if challenge has already been used
            if (storedChallenge.used) {
                return {
                    success: false,
                    error: 'Challenge has already been used',
                    errorCode: 'CHALLENGE_USED',
                };
            }
            // Verify the signature
            const isValid = await this.verifySignatureCryptographically(signature, storedChallenge);
            if (!isValid) {
                return {
                    success: false,
                    error: 'Invalid signature',
                    errorCode: 'INVALID_SIGNATURE',
                };
            }
            // Mark challenge as used
            storedChallenge.used = true;
            this.challenges.set(challenge.id, storedChallenge);
            return {
                success: true,
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                errorCode: 'VERIFICATION_ERROR',
            };
        }
    }
    /**
     * Create a new session after successful authentication
     */
    async createSession(address, clientId, parsedMessage) {
        const sessionId = this.generateId();
        const accessToken = this.generateToken();
        const refreshToken = this.generateToken();
        const accessTokenId = this.generateId();
        const refreshTokenId = this.generateId();
        const fingerprint = this.generateFingerprint(address, clientId);
        const now = Date.now();
        const accessTokenExpiresAt = now + this.config.sessionExpiration * 1000;
        const refreshTokenExpiresAt = now + this.config.sessionExpiration * 2 * 1000; // 48 hours
        const session = {
            id: sessionId,
            address,
            clientId,
            accessToken,
            refreshToken,
            accessTokenId,
            refreshTokenId,
            fingerprint,
            accessTokenExpiresAt,
            refreshTokenExpiresAt,
            createdAt: now,
            lastUsedAt: now,
            isActive: true,
        };
        this.sessions.set(sessionId, session);
        return session;
    }
    /**
     * Get a session by access token
     */
    async getSession(accessToken) {
        for (const session of this.sessions.values()) {
            if (session.accessToken === accessToken && session.isActive) {
                // Check if token has expired
                if (Date.now() > session.accessTokenExpiresAt) {
                    session.isActive = false;
                    return null;
                }
                // Update last used timestamp
                session.lastUsedAt = Date.now();
                return session;
            }
        }
        return null;
    }
    /**
     * Refresh a session using refresh token
     */
    async refreshSession(refreshToken) {
        for (const session of this.sessions.values()) {
            if (session.refreshToken === refreshToken && session.isActive) {
                // Check if refresh token has expired
                if (Date.now() > session.refreshTokenExpiresAt) {
                    session.isActive = false;
                    return null;
                }
                // Generate new tokens
                const newAccessToken = this.generateToken();
                const newRefreshToken = this.generateToken();
                const now = Date.now();
                session.accessToken = newAccessToken;
                session.refreshToken = newRefreshToken;
                session.accessTokenExpiresAt = now + this.config.sessionExpiration * 1000;
                session.refreshTokenExpiresAt = now + this.config.sessionExpiration * 2 * 1000;
                session.lastUsedAt = now;
                return session;
            }
        }
        return null;
    }
    /**
     * Invalidate a session
     */
    async invalidateSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.isActive = false;
        }
    }
    /**
     * Clean up expired challenges and sessions
     */
    async cleanup() {
        const now = Date.now();
        // Clean up expired challenges
        for (const [id, challenge] of this.challenges.entries()) {
            if (now > challenge.expiresAtTimestamp) {
                this.challenges.delete(id);
            }
        }
        // Clean up expired sessions
        for (const [id, session] of this.sessions.entries()) {
            if (now > session.refreshTokenExpiresAt) {
                this.sessions.delete(id);
            }
        }
    }
    /**
     * Create SIWE message
     */
    createSIWEMessage(params) {
        return {
            domain: typeof window !== 'undefined' ? window.location.hostname : 'localhost',
            address: params.address,
            statement: 'Sign in with Polkadot to authenticate with the application.',
            uri: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
            version: '1',
            chainId: '1', // Polkadot mainnet
            nonce: params.nonce,
            issuedAt: params.issuedAt,
            expirationTime: params.expiresAt,
        };
    }
    /**
     * Format SIWE message for signing
     */
    formatSIWEMessage(message) {
        return `${message.domain} wants you to sign in with your Polkadot account:
${message.address}

${message.statement}

URI: ${message.uri}
Version: ${message.version}
Chain ID: ${message.chainId}
Nonce: ${message.nonce}
Issued At: ${message.issuedAt}
Expiration Time: ${message.expirationTime}`;
    }
    /**
     * Verify signature cryptographically
     *
     * SECURITY NOTE: This is a placeholder implementation.
     * In production, you MUST implement proper cryptographic verification
     * using the Polkadot address and signature validation.
     */
    async verifySignatureCryptographically(signature, challenge) {
        try {
            // Basic validation
            if (!signature.signature || !signature.address || !signature.message) {
                console.warn('⚠️  SECURITY: Missing signature components');
                return false;
            }
            // Check if the message matches the challenge
            if (signature.message !== challenge.message) {
                console.warn('⚠️  SECURITY: Message mismatch in signature verification');
                return false;
            }
            // Check if the nonce matches
            if (signature.nonce !== challenge.nonce) {
                console.warn('⚠️  SECURITY: Nonce mismatch in signature verification');
                return false;
            }
            // TODO: Implement proper cryptographic verification
            // This should include:
            // 1. Decode the signature using Polkadot's signature format
            // 2. Verify it against the message hash using the claimed address
            // 3. Ensure the signature was created by the claimed address
            // 4. Validate the signature format and encoding
            console.warn('⚠️  SECURITY WARNING: Using mock signature verification. Implement proper cryptographic verification for production!');
            // For now, return true for development/testing
            // In production, this MUST be replaced with real cryptographic verification
            return process.env.NODE_ENV !== 'production';
        }
        catch (error) {
            console.error('Signature verification error:', error);
            return false;
        }
    }
    /**
     * Generate a unique ID
     */
    generateId() {
        return Array.from((0, crypto_js_1.randomBytes)(16))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }
    /**
     * Generate a cryptographic nonce
     */
    generateNonce() {
        return Array.from((0, crypto_js_1.randomBytes)(32))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }
    /**
     * Generate a secure token
     */
    generateToken() {
        return Array.from((0, crypto_js_1.randomBytes)(32))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }
    /**
     * Generate a fingerprint for the session
     */
    generateFingerprint(address, clientId) {
        const data = `${address}:${clientId}:${Date.now()}`;
        return (0, crypto_js_1.createHash)('sha256').update(data).digest('hex');
    }
}
exports.AuthService = AuthService;
// Global auth service instance
exports.authService = new AuthService();
//# sourceMappingURL=authService.js.map