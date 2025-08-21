import { Request, Response as ExpressResponse, NextFunction, RequestHandler } from 'express';
export interface ResponseWithLocals extends ExpressResponse {
    locals: {
        nonce: string;
        [key: string]: unknown;
    };
}
export declare const securityMiddleware: RequestHandler[];
export declare const csrfProtection: import("express-serve-static-core").RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
export declare const errorHandler: (err: Error, req: Request, res: ResponseWithLocals) => void;
export declare const securityHeaders: (req: Request, res: ResponseWithLocals, next: NextFunction) => void;
type NonceMiddleware = (req: Request, res: ResponseWithLocals, next: NextFunction) => void;
export declare const nonceMiddleware: NonceMiddleware;
export {};
//# sourceMappingURL=security.d.ts.map