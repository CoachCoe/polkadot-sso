// Remix adapter for Polkadot authentication

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

export { createAuthApiRoutes } from './api-routes';

export { createAuthMiddleware, getUserFromRequest, isAuthenticated } from './middleware';

export function createRemixAuth(config: any) {
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

export default createRemixAuth;
