import { NextFunction, Request, Response } from 'express';
/**
 * Enhanced security middleware for Kusama operations
 */
export declare class EnhancedSecurityMiddleware {
    /**
     * Validate Kusama address format
     */
    static validateKusamaAddress(address: string): boolean;
    /**
     * Validate credential data structure and size
     */
    static validateCredentialData(data: Record<string, unknown>): {
        valid: boolean;
        errors: string[];
        size: number;
    };
    /**
     * Rate limiting with anomaly detection
     */
    static createEnhancedRateLimiter(): (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
    /**
     * Request size validation
     */
    static validateRequestSize(): (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
    /**
     * Kusama-specific security validation
     */
    static validateKusamaRequest(): (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
    /**
     * Enhanced CORS with Kusama-specific origins
     */
    static createEnhancedCORS(): (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
    /**
     * Request sanitization for Kusama operations
     */
    static sanitizeKusamaRequest(): (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
    /**
     * Audit logging for Kusama operations
     */
    static auditKusamaOperation(operation: string): (req: Request, res: Response, next: NextFunction) => void;
    /**
     * Clean up old request trackers
     */
    static cleanupRequestTrackers(): void;
}
export declare const enhancedRateLimiter: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare const validateRequestSize: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare const validateKusamaRequest: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare const enhancedCORS: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare const sanitizeKusamaRequest: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare const auditKusamaOperation: (operation: string) => (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=enhancedSecurity.d.ts.map