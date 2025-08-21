import { NextFunction, Request, Response } from 'express';
export interface SecurityConfig {
    enableCSP: boolean;
    enableHSTS: boolean;
    enableReferrerPolicy: boolean;
    enablePermissionsPolicy: boolean;
    strictTransportSecurity: {
        maxAge: number;
        includeSubDomains: boolean;
        preload: boolean;
    };
    contentSecurityPolicy: {
        enableNonce: boolean;
        allowedDomains: string[];
        reportUri?: string;
    };
}
/**
 * Advanced Security Headers Middleware
 */
export declare class AdvancedSecurityHeaders {
    private config;
    private nonceStore;
    constructor(config: SecurityConfig);
    /**
     * Generate cryptographically secure nonce
     */
    generateNonce(): string;
    /**
     * Store nonce for request
     */
    private storeNonce;
    /**
     * Get nonce for request
     */
    getNonce(requestId: string): string | null;
    /**
     * Cleanup old nonces
     */
    private cleanupNonces;
    /**
     * Content Security Policy with dynamic nonce
     */
    getCSPMiddleware(): (req: Request, res: Response, next: NextFunction) => void;
    /**
     * HTTP Strict Transport Security
     */
    getHSTSMiddleware(): (req: Request, res: Response, next: NextFunction) => void;
    /**
     * Referrer Policy
     */
    getReferrerPolicyMiddleware(): (req: Request, res: Response, next: NextFunction) => void;
    /**
     * Permissions Policy (formerly Feature Policy)
     */
    getPermissionsPolicyMiddleware(): (req: Request, res: Response, next: NextFunction) => void;
    /**
     * Additional Security Headers
     */
    getAdditionalHeadersMiddleware(): (req: Request, res: Response, next: NextFunction) => void;
    /**
     * Security Headers Violation Reporter
     */
    getViolationReporter(): (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
    /**
     * Complete security headers middleware
     */
    getAllSecurityMiddleware(): ((req: Request, res: Response, next: NextFunction) => void)[];
}
/**
 * Default security configuration
 */
export declare const defaultSecurityConfig: SecurityConfig;
export declare const advancedSecurityHeaders: AdvancedSecurityHeaders;
//# sourceMappingURL=advancedSecurityHeaders.d.ts.map