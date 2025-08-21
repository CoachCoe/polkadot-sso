import { NextFunction, Request, Response } from 'express';
import { AuditService, TokenService } from '../modules';
export interface AuthenticatedRequest extends Request {
    user?: {
        address: string;
        sessionId?: string;
        permissions?: string[];
        isAdmin?: boolean;
    };
}
export interface AuthOptions {
    required?: boolean;
    adminOnly?: boolean;
    permissions?: string[];
    allowedRoles?: string[];
}
/**
 * JWT Authentication Middleware
 */
export declare const createAuthenticationMiddleware: (tokenService: TokenService, auditService: AuditService) => (options?: AuthOptions) => (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
/**
 * Role-based Authorization Middleware
 */
export declare const createAuthorizationMiddleware: (auditService: AuditService) => (allowedRoles: string[]) => (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Resource Ownership Middleware
 */
export declare const createOwnershipMiddleware: (getResourceOwnerId: (req: Request) => Promise<string | null>) => (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * API Rate Limiting per User
 */
export declare const createUserRateLimiter: (auditService: AuditService) => (maxRequests: number, windowMs: number) => (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
//# sourceMappingURL=authenticationMiddleware.d.ts.map