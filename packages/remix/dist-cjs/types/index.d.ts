export interface RemixAuthConfig {
    basePath?: string;
    sessionSecret: string;
    sessionMaxAge?: number;
    cors?: {
        origin?: string | string[] | boolean;
        credentials?: boolean;
    };
}
export interface RemixAuthContext {
    isAuthenticated: boolean;
    user?: {
        address: string;
        chain: string;
        sessionId: string;
    };
    signIn: (address: string, chain: string) => Promise<void>;
    signOut: () => Promise<void>;
}
export interface RemixAuthHandler {
    challenge: (request: Request) => Promise<Response>;
    verify: (request: Request) => Promise<Response>;
    signOut: (request: Request) => Promise<Response>;
    session: (request: Request) => Promise<Response>;
}
export interface RemixAuthMiddleware {
    requireAuth: (request: Request) => Promise<Response | null>;
    optionalAuth: (request: Request) => Promise<Response | null>;
}
export interface LoaderFunctionArgs {
    request: Request;
    params: any;
    context: any;
}
export interface ActionFunctionArgs {
    request: Request;
    params: any;
    context: any;
}
export interface LoaderFunction {
    (args: LoaderFunctionArgs): Promise<Response> | Response;
}
export interface ActionFunction {
    (args: ActionFunctionArgs): Promise<Response> | Response;
}
//# sourceMappingURL=index.d.ts.map