export interface PolkadotAuthError {
    code: string;
    message: string;
    details?: any;
    wallet?: string;
    timestamp: number;
}
export declare class ErrorService {
    /**
     * Create a standardized error object
     */
    static createError(code: string, message: string, details?: any, wallet?: string): PolkadotAuthError;
    /**
     * Wallet-related errors
     */
    static walletNotAvailable(walletName: string): PolkadotAuthError;
    static walletConnectionFailed(walletName: string, originalError?: any): PolkadotAuthError;
    static walletSigningFailed(walletName: string, originalError?: any): PolkadotAuthError;
    static noAccountsFound(walletName: string): PolkadotAuthError;
    static walletNotConnected(walletName: string): PolkadotAuthError;
    /**
     * Authentication-related errors
     */
    static authenticationFailed(reason?: string): PolkadotAuthError;
    static challengeExpired(): PolkadotAuthError;
    static invalidSignature(): PolkadotAuthError;
    static sessionExpired(): PolkadotAuthError;
    static sessionNotFound(): PolkadotAuthError;
    /**
     * Network-related errors
     */
    static networkError(originalError?: any): PolkadotAuthError;
    static serverError(statusCode: number, message?: string): PolkadotAuthError;
    /**
     * Configuration errors
     */
    static invalidConfiguration(property: string, value?: any): PolkadotAuthError;
    static missingConfiguration(property: string): PolkadotAuthError;
    /**
     * Generic errors
     */
    static unknownError(originalError?: any): PolkadotAuthError;
    /**
     * Convert any error to a standardized error
     */
    static fromError(error: any, wallet?: string): PolkadotAuthError;
    /**
     * Check if an object is a PolkadotAuthError
     */
    static isPolkadotAuthError(error: any): error is PolkadotAuthError;
    /**
     * Get user-friendly error message
     */
    static getUserFriendlyMessage(error: PolkadotAuthError): string;
    /**
     * Log error for debugging
     */
    static logError(error: PolkadotAuthError, context?: string): void;
}
//# sourceMappingURL=errorService.d.ts.map