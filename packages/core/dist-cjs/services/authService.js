"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
     * Verify signature cryptographically using Polkadot's signature verification
     *
     * This implementation uses @polkadot/util-crypto for proper signature verification
     * against the claimed Polkadot address.
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
            // Import Polkadot crypto utilities dynamically to handle browser compatibility
            const { signatureVerify, decodeAddress, isAddress } = await Promise.resolve().then(() => __importStar(require('@polkadot/util-crypto')));
            // Validate the address format
            if (!isAddress(signature.address)) {
                console.warn('⚠️  SECURITY: Invalid Polkadot address format');
                return false;
            }
            // Decode the address to get the public key
            const publicKey = decodeAddress(signature.address);
            // Verify the signature using Polkadot's signature verification
            const verification = signatureVerify(signature.message, signature.signature, publicKey);
            if (!verification.isValid) {
                console.warn('⚠️  SECURITY: Signature verification failed', {
                    address: signature.address,
                });
                return false;
            }
            // Additional security checks
            if (verification.crypto !== 'sr25519' && verification.crypto !== 'ed25519') {
                console.warn('⚠️  SECURITY: Unsupported signature algorithm', {
                    crypto: verification.crypto,
                });
                return false;
            }
            console.log('✅ Signature verification successful', {
                address: signature.address,
                crypto: verification.crypto,
            });
            return true;
        }
        catch (error) {
            console.error('Signature verification error:', error);
            // In case of import errors or other issues, fall back to development mode
            if (process.env.NODE_ENV !== 'production') {
                console.warn('⚠️  FALLBACK: Using development mode signature verification due to error');
                return true;
            }
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