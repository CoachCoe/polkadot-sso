export type { AuthContext, NextAuthConfig, NextAuthHandler, NextAuthMiddleware } from './types';

export { createAuthMiddleware, optionalAuth, requireAuth } from './middleware';

import { createAuthMiddleware } from './middleware';
import { NextAuthConfig } from './types';

export function createNextAuth(config: NextAuthConfig = {}) {
  return {
    middleware: createAuthMiddleware(config),
    config,
  };
}
