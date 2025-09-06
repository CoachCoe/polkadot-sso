export type { ActionFunction, ActionFunctionArgs, LoaderFunction, LoaderFunctionArgs, RemixAuthConfig, RemixAuthContext, RemixAuthHandler, RemixAuthMiddleware, } from './types';
export { createAuthApiRoutes } from './api-routes';
export { createAuthMiddleware, getUserFromRequest, isAuthenticated } from './middleware';
export declare function createRemixAuth(config: any): {
    apiRoutes: any;
    middleware: any;
    config: any;
};
export default createRemixAuth;
//# sourceMappingURL=index.d.ts.map