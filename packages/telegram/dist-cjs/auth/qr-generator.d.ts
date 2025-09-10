import { TelegramDeepLinkParams, TelegramQRData } from '../types';
/**
 * QR code generator for Telegram authentication
 */
export declare class TelegramQRGenerator {
    private ssoServerUrl;
    private botUsername;
    private qrCodeSize;
    constructor(ssoServerUrl: string, botUsername: string, qrCodeSize?: number);
    /**
     * Generate QR code data for Telegram authentication
     */
    generateQRCode(challengeId: string, message: string): Promise<TelegramQRData>;
    /**
     * Create Telegram deep link
     */
    private createDeepLink;
    /**
     * Parse deep link parameters
     */
    static parseDeepLink(url: string): TelegramDeepLinkParams | null;
    /**
     * Validate deep link
     */
    static validateDeepLink(params: TelegramDeepLinkParams): boolean;
}
//# sourceMappingURL=qr-generator.d.ts.map