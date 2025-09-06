import { NextFunction, Request, Response } from 'express';
export interface ExpressAuthConfig {
    basePath?: string;
    routes?: {
        signIn?: string;
        signOut?: string;
        callback?: string;
        challenge?: string;
        verify?: string;
    };
    cors?: {
        origin?: string | string[] | boolean;
        credentials?: boolean;
    };
}
export interface AuthenticatedRequest extends Request {
    user?: {
        address: string;
        session: any;
    };
}
export declare function polkadotAuth(config?: ExpressAuthConfig): import("express-serve-static-core").Router;
export declare function requireAuth(): (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
export declare function optionalAuth(): (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
export default polkadotAuth;
//# sourceMappingURL=index.d.ts.map