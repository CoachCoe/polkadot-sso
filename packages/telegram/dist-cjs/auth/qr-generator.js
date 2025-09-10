"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelegramQRGenerator = void 0;
const qrcode_1 = __importDefault(require("qrcode"));
/**
 * QR code generator for Telegram authentication
 */
class TelegramQRGenerator {
    constructor(ssoServerUrl, botUsername, qrCodeSize = 256) {
        this.ssoServerUrl = ssoServerUrl;
        this.botUsername = botUsername;
        this.qrCodeSize = qrCodeSize;
    }
    /**
     * Generate QR code data for Telegram authentication
     */
    async generateQRCode(challengeId, message) {
        try {
            // Create deep link parameters
            const params = {
                challengeId,
                message,
                ssoUrl: this.ssoServerUrl,
            };
            // Generate deep link
            const deepLink = this.createDeepLink(params);
            // Generate QR code
            const qrCode = await qrcode_1.default.toDataURL(deepLink, {
                width: this.qrCodeSize,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF',
                },
                errorCorrectionLevel: 'M',
            });
            // Set expiration time (5 minutes)
            const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
            return {
                challengeId,
                deepLink,
                qrCode,
                expiresAt,
            };
        }
        catch (error) {
            throw new Error(`Failed to generate QR code: ${error}`);
        }
    }
    /**
     * Create Telegram deep link
     */
    createDeepLink(params) {
        const baseUrl = `https://t.me/${this.botUsername}`;
        const queryParams = new URLSearchParams({
            start: 'auth',
            challenge: params.challengeId,
            message: encodeURIComponent(params.message),
            sso: params.ssoUrl,
        });
        return `${baseUrl}?${queryParams.toString()}`;
    }
    /**
     * Parse deep link parameters
     */
    static parseDeepLink(url) {
        try {
            const urlObj = new URL(url);
            const params = urlObj.searchParams;
            if (!params.get('start') || params.get('start') !== 'auth') {
                return null;
            }
            return {
                challengeId: params.get('challenge') || '',
                message: decodeURIComponent(params.get('message') || ''),
                ssoUrl: params.get('sso') || '',
            };
        }
        catch (error) {
            return null;
        }
    }
    /**
     * Validate deep link
     */
    static validateDeepLink(params) {
        return !!(params.challengeId &&
            params.message &&
            params.ssoUrl &&
            params.challengeId.length > 0 &&
            params.message.length > 0 &&
            params.ssoUrl.startsWith('http'));
    }
}
exports.TelegramQRGenerator = TelegramQRGenerator;
//# sourceMappingURL=qr-generator.js.map