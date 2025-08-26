// Remix adapter for Polkadot authentication

// Types
export type {
  ActionFunction,
  ActionFunctionArgs,
  LoaderFunction,
  LoaderFunctionArgs,
  RemixAuthConfig,
  RemixAuthContext,
  RemixAuthHandler,
  RemixAuthMiddleware,
} from './types';

// API Routes
export { createAuthApiRoutes } from './api-routes';

// Middleware
export { createAuthMiddleware, getUserFromRequest, isAuthenticated } from './middleware';

// Factory function
export function createRemixAuth(config: any) {
  // Import here to avoid circular dependency issues
  const { createAuthApiRoutes } = require('./api-routes');
  const { createAuthMiddleware } = require('./middleware');

  const apiRoutes = createAuthApiRoutes(config);
  const middleware = createAuthMiddleware(config);

  return {
    apiRoutes,
    middleware,
    config,
  };
}

// Default export
export default createRemixAuth;
