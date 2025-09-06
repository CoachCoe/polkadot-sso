import { RemixAuthConfig, RemixAuthMiddleware } from '../types';
export declare function createAuthMiddleware(config: RemixAuthConfig): RemixAuthMiddleware;
export declare function getUserFromRequest(request: Request): Promise<{
    address: string;
    chain: string;
    sessionId: string;
    authenticatedAt: string;
} | null>;
export declare function isAuthenticated(request: Request): Promise<boolean>;
//# sourceMappingURL=index.d.ts.map