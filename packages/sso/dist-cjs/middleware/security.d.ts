import cors from 'cors';
import { NextFunction, Request, Response } from 'express';
export interface ResponseWithLocals extends Response {
    locals: {
        nonce?: string;
    };
}
/**
 * Enhanced security headers middleware
 */
export declare const securityHeaders: (req: import("http").IncomingMessage, res: import("http").ServerResponse, next: (err?: unknown) => void) => void;
/**
 * Enhanced CORS configuration
 */
export declare const corsConfig: (req: cors.CorsRequest, res: {
    statusCode?: number | undefined;
    setHeader(key: string, value: string): any;
    end(): any;
}, next: (err?: any) => any) => void;
/**
 * Nonce generation middleware
 */
export declare const nonceMiddleware: (_req: Request, res: ResponseWithLocals, next: NextFunction) => void;
/**
 * Request ID middleware for tracking
 */
export declare const requestIdMiddleware: (req: Request, res: Response, next: NextFunction) => void;
/**
 * Security headers for API responses
 */
export declare const apiSecurityHeaders: (req: Request, res: Response, next: NextFunction) => void;
/**
 * IP whitelist middleware (optional)
 */
export declare const ipWhitelistMiddleware: (allowedIPs: string[]) => (req: Request, res: Response, next: NextFunction) => void;
/**
 * Rate limiting headers middleware
 */
export declare const rateLimitHeaders: (_req: Request, res: Response, next: NextFunction) => void;
/**
 * Security audit middleware
 */
export declare const securityAuditMiddleware: (req: Request, _res: Response, next: NextFunction) => void;
/**
 * Combined security middleware
 */
export declare const securityMiddleware: (((req: cors.CorsRequest, res: {
    statusCode?: number | undefined;
    setHeader(key: string, value: string): any;
    end(): any;
}, next: (err?: any) => any) => void) | ((_req: Request, res: ResponseWithLocals, next: NextFunction) => void) | ((req: Request, res: Response, next: NextFunction) => void))[];
//# sourceMappingURL=security.d.ts.map