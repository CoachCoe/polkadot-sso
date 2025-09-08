export interface NovaQrAuthData {
    challengeId: string;
    message: string;
    address: string;
    deepLink: string;
    qrCodeDataUrl: string;
    expiresAt: number;
}
export interface NovaQrAuthConfig {
    baseUrl: string;
    timeout?: number;
    pollInterval?: number;
}
export declare class NovaQrAuthService {
    private config;
    private activeAuth;
    constructor(config: NovaQrAuthConfig);
    /**
     * Generate QR code for Nova Wallet mobile authentication
     */
    generateQrAuth(challengeId: string, message: string, address: string): Promise<NovaQrAuthData>;
    /**
     * Poll for authentication completion
     */
    pollForCompletion(challengeId: string): Promise<boolean>;
    /**
     * Wait for authentication completion with polling
     */
    waitForCompletion(challengeId: string): Promise<void>;
    /**
     * Create Nova Wallet deep link
     */
    private createNovaDeepLink;
    /**
     * Clean up expired authentication sessions
     */
    private cleanupExpiredAuths;
    /**
     * Get active authentication data
     */
    getAuthData(challengeId: string): NovaQrAuthData | undefined;
    /**
     * Cancel authentication session
     */
    cancelAuth(challengeId: string): void;
    /**
     * Get all active authentication sessions
     */
    getActiveAuths(): NovaQrAuthData[];
}
/**
 * Create a new Nova QR authentication service
 */
export declare function createNovaQrAuthService(config: NovaQrAuthConfig): NovaQrAuthService;
//# sourceMappingURL=novaQrAuth.d.ts.map