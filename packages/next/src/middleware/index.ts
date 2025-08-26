import { NextAuthConfig } from '../types';

export function createAuthMiddleware(config: NextAuthConfig = {}) {
  return async function authMiddleware(req: any): Promise<any | null> {
    console.log('Auth middleware called with config:', config);
    return null;
  };
}

export function requireAuth() {
  return function requireAuthMiddleware(req: any): any | null {
    console.log('Require auth middleware called');
    return null;
  };
}

export function optionalAuth() {
  return function optionalAuthMiddleware(req: any): any | null {
    console.log('Optional auth middleware called');
    return null;
  };
}
