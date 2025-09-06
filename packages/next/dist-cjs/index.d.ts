export type { AuthContext, NextAuthConfig, NextAuthHandler, NextAuthMiddleware } from './types';
export { createAuthMiddleware, optionalAuth, requireAuth } from './middleware';
import { NextAuthConfig } from './types';
export declare function createNextAuth(config?: NextAuthConfig): {
    middleware: (req: any) => Promise<any | null>;
    config: NextAuthConfig;
};
//# sourceMappingURL=index.d.ts.map