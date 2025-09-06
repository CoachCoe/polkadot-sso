import { NextFunction, Request, Response } from 'express';
import { AuditService } from '../services/auditService';
export interface WalletSecurityConfig {
    maxTransactionSize: number;
    maxCredentialSize: number;
    rateLimitWindow: number;
    maxRequestsPerWindow: number;
    allowedWalletProviders: string[];
    requireSignatureValidation: boolean;
    maxConcurrentConnections: number;
}
export declare class WalletSecurityMiddleware {
    private config;
    private auditService;
    constructor(auditService: AuditService, config?: Partial<WalletSecurityConfig>);
    static validateKusamaAddress(address: string): boolean;
    static validateWalletProvider(provider: string, allowedProviders: string[]): boolean;
    static validateTransactionData(data: Record<string, unknown>): {
        valid: boolean;
        errors: string[];
        size: number;
    };
    createWalletRateLimiter(): (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
    validateWalletConnection(): (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
    validateTransactionRequest(): (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
    validateSignature(): (req: Request, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>;
    sanitizeWalletData(): (req: Request, res: Response, next: NextFunction) => void;
    logWalletEvent(action: string, details: Record<string, unknown>): void;
    getSecurityStats(): {
        totalConnections: number;
        blockedUsers: number;
        activeConnections: number;
    };
}
//# sourceMappingURL=walletSecurityMiddleware.d.ts.map