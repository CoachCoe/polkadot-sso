"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorService = void 0;
class ErrorService {
    /**
     * Create a standardized error object
     */
    static createError(code, message, details, wallet) {
        return {
            code,
            message,
            details,
            wallet,
            timestamp: Date.now(),
        };
    }
    /**
     * Wallet-related errors
     */
    static walletNotAvailable(walletName) {
        return this.createError('WALLET_NOT_AVAILABLE', `Wallet ${walletName} is not installed or not available`, { walletName }, walletName);
    }
    static walletConnectionFailed(walletName, originalError) {
        return this.createError('WALLET_CONNECTION_FAILED', `Failed to connect to ${walletName} wallet`, { originalError }, walletName);
    }
    static walletSigningFailed(walletName, originalError) {
        return this.createError('WALLET_SIGNING_FAILED', `Failed to sign message with ${walletName} wallet`, { originalError }, walletName);
    }
    static noAccountsFound(walletName) {
        return this.createError('NO_ACCOUNTS_FOUND', `No accounts found in ${walletName} wallet`, { walletName }, walletName);
    }
    static walletNotConnected(walletName) {
        return this.createError('WALLET_NOT_CONNECTED', `${walletName} wallet is not connected`, { walletName }, walletName);
    }
    /**
     * Authentication-related errors
     */
    static authenticationFailed(reason) {
        return this.createError('AUTHENTICATION_FAILED', reason || 'Authentication failed', { reason });
    }
    static challengeExpired() {
        return this.createError('CHALLENGE_EXPIRED', 'Authentication challenge has expired');
    }
    static invalidSignature() {
        return this.createError('INVALID_SIGNATURE', 'Invalid signature provided');
    }
    static sessionExpired() {
        return this.createError('SESSION_EXPIRED', 'User session has expired');
    }
    static sessionNotFound() {
        return this.createError('SESSION_NOT_FOUND', 'User session not found');
    }
    /**
     * Network-related errors
     */
    static networkError(originalError) {
        return this.createError('NETWORK_ERROR', 'Network request failed', { originalError });
    }
    static serverError(statusCode, message) {
        return this.createError('SERVER_ERROR', message || `Server error: ${statusCode}`, {
            statusCode,
        });
    }
    /**
     * Configuration errors
     */
    static invalidConfiguration(property, value) {
        return this.createError('INVALID_CONFIGURATION', `Invalid configuration: ${property}`, {
            property,
            value,
        });
    }
    static missingConfiguration(property) {
        return this.createError('MISSING_CONFIGURATION', `Missing required configuration: ${property}`, { property });
    }
    /**
     * Generic errors
     */
    static unknownError(originalError) {
        return this.createError('UNKNOWN_ERROR', 'An unknown error occurred', { originalError });
    }
    /**
     * Convert any error to a standardized error
     */
    static fromError(error, wallet) {
        if (this.isPolkadotAuthError(error)) {
            return error;
        }
        if (error instanceof Error) {
            return this.createError('ERROR', error.message, { stack: error.stack }, wallet);
        }
        return this.unknownError(error);
    }
    /**
     * Check if an object is a PolkadotAuthError
     */
    static isPolkadotAuthError(error) {
        return (error &&
            typeof error === 'object' &&
            typeof error.code === 'string' &&
            typeof error.message === 'string' &&
            typeof error.timestamp === 'number');
    }
    /**
     * Get user-friendly error message
     */
    static getUserFriendlyMessage(error) {
        const friendlyMessages = {
            WALLET_NOT_AVAILABLE: 'Please install a Polkadot wallet extension',
            WALLET_CONNECTION_FAILED: 'Failed to connect to wallet. Please try again.',
            WALLET_SIGNING_FAILED: 'Failed to sign message. Please try again.',
            NO_ACCOUNTS_FOUND: 'No accounts found in wallet. Please add an account.',
            WALLET_NOT_CONNECTED: 'Wallet is not connected. Please connect your wallet.',
            AUTHENTICATION_FAILED: 'Authentication failed. Please try again.',
            CHALLENGE_EXPIRED: 'Authentication challenge expired. Please try again.',
            INVALID_SIGNATURE: 'Invalid signature. Please try again.',
            SESSION_EXPIRED: 'Your session has expired. Please sign in again.',
            SESSION_NOT_FOUND: 'Session not found. Please sign in again.',
            NETWORK_ERROR: 'Network error. Please check your connection and try again.',
            SERVER_ERROR: 'Server error. Please try again later.',
            INVALID_CONFIGURATION: 'Configuration error. Please contact support.',
            MISSING_CONFIGURATION: 'Configuration error. Please contact support.',
            UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
        };
        return friendlyMessages[error.code] || error.message;
    }
    /**
     * Log error for debugging
     */
    static logError(error, context) {
        const logMessage = context
            ? `[${context}] ${error.code}: ${error.message}`
            : `${error.code}: ${error.message}`;
        console.error(logMessage, error.details);
    }
}
exports.ErrorService = ErrorService;
//# sourceMappingURL=errorService.js.map