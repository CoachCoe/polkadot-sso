import { NextAuthConfig } from '../types';
export declare function createAuthMiddleware(config?: NextAuthConfig): (req: any) => Promise<any | null>;
export declare function requireAuth(): (req: any) => any | null;
export declare function optionalAuth(): (req: any) => any | null;
//# sourceMappingURL=index.d.ts.map