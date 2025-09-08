"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NovaQrAuthService = void 0;
exports.createNovaQrAuthService = createNovaQrAuthService;
const qrcode_1 = __importDefault(require("qrcode"));
const core_1 = require("@polkadot-auth/core");
class NovaQrAuthService {
    constructor(config) {
        this.activeAuth = new Map();
        this.config = {
            timeout: 5 * 60 * 1000, // 5 minutes
            pollInterval: 2000, // 2 seconds
            ...config,
        };
    }
    /**
     * Generate QR code for Nova Wallet mobile authentication
     */
    async generateQrAuth(challengeId, message, address) {
        try {
            // Create deep link for Nova Wallet
            const deepLink = this.createNovaDeepLink(challengeId, message, address);
            // Generate QR code as data URL
            const qrCodeDataUrl = await qrcode_1.default.toDataURL(deepLink, {
                width: 256,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF',
                },
                errorCorrectionLevel: 'M',
            });
            const authData = {
                challengeId,
                message,
                address,
                deepLink,
                qrCodeDataUrl,
                expiresAt: Date.now() + this.config.timeout,
            };
            // Store active auth for polling
            this.activeAuth.set(challengeId, authData);
            // Auto-cleanup expired auths
            this.cleanupExpiredAuths();
            return authData;
        }
        catch (error) {
            throw core_1.ErrorService.createError('QR_GENERATION_FAILED', 'Failed to generate QR code for Nova Wallet authentication', error);
        }
    }
    /**
     * Poll for authentication completion
     */
    async pollForCompletion(challengeId) {
        const authData = this.activeAuth.get(challengeId);
        if (!authData) {
            throw core_1.ErrorService.createError('AUTH_NOT_FOUND', 'Authentication session not found');
        }
        if (Date.now() > authData.expiresAt) {
            this.activeAuth.delete(challengeId);
            throw core_1.ErrorService.createError('AUTH_EXPIRED', 'Authentication session has expired');
        }
        try {
            // Poll the SSO server for completion
            const response = await fetch(`${this.config.baseUrl}/auth/qr-status?challenge_id=${challengeId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const result = await response.json();
            return result.completed === true;
        }
        catch (error) {
            // Don't throw on network errors, just return false
            console.warn('Polling error:', error);
            return false;
        }
    }
    /**
     * Wait for authentication completion with polling
     */
    async waitForCompletion(challengeId) {
        const authData = this.activeAuth.get(challengeId);
        if (!authData) {
            throw core_1.ErrorService.createError('AUTH_NOT_FOUND', 'Authentication session not found');
        }
        const startTime = Date.now();
        const timeout = this.config.timeout;
        return new Promise((resolve, reject) => {
            const poll = async () => {
                try {
                    // Check if expired
                    if (Date.now() > authData.expiresAt) {
                        this.activeAuth.delete(challengeId);
                        reject(core_1.ErrorService.createError('AUTH_EXPIRED', 'Authentication session has expired'));
                        return;
                    }
                    // Check if completed
                    const completed = await this.pollForCompletion(challengeId);
                    if (completed) {
                        this.activeAuth.delete(challengeId);
                        resolve();
                        return;
                    }
                    // Check timeout
                    if (Date.now() - startTime > timeout) {
                        this.activeAuth.delete(challengeId);
                        reject(core_1.ErrorService.createError('AUTH_TIMEOUT', 'Authentication timed out'));
                        return;
                    }
                    // Continue polling
                    setTimeout(poll, this.config.pollInterval);
                }
                catch (error) {
                    reject(error);
                }
            };
            poll();
        });
    }
    /**
     * Create Nova Wallet deep link
     */
    createNovaDeepLink(challengeId, message, address) {
        // Nova Wallet deep link format
        // This is a custom protocol that Nova Wallet should support
        const params = new URLSearchParams({
            action: 'sign_message',
            challenge_id: challengeId,
            message: message,
            address: address,
            callback: `${this.config.baseUrl}/auth/qr-callback`,
        });
        return `nova://auth?${params.toString()}`;
    }
    /**
     * Clean up expired authentication sessions
     */
    cleanupExpiredAuths() {
        const now = Date.now();
        for (const [challengeId, authData] of this.activeAuth.entries()) {
            if (now > authData.expiresAt) {
                this.activeAuth.delete(challengeId);
            }
        }
    }
    /**
     * Get active authentication data
     */
    getAuthData(challengeId) {
        return this.activeAuth.get(challengeId);
    }
    /**
     * Cancel authentication session
     */
    cancelAuth(challengeId) {
        this.activeAuth.delete(challengeId);
    }
    /**
     * Get all active authentication sessions
     */
    getActiveAuths() {
        return Array.from(this.activeAuth.values());
    }
}
exports.NovaQrAuthService = NovaQrAuthService;
/**
 * Create a new Nova QR authentication service
 */
function createNovaQrAuthService(config) {
    return new NovaQrAuthService(config);
}
//# sourceMappingURL=novaQrAuth.js.map