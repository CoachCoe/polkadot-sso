import { RemixAuthConfig, RemixAuthMiddleware } from '../types';

export function createAuthMiddleware(config: RemixAuthConfig): RemixAuthMiddleware {
  return {
    async requireAuth(request: Request): Promise<Response | null> {
      try {
        const cookieHeader = request.headers.get('Cookie');
        const sessionId = cookieHeader
          ?.split(';')
          .find(c => c.trim().startsWith('polkadot-auth='))
          ?.split('=')[1];

        if (!sessionId) {
          const loginUrl = new URL('/login', request.url);
          loginUrl.searchParams.set('redirect', new URL(request.url).pathname);
          return Response.redirect(loginUrl.toString(), 302);
        }

        return null;
      } catch (error) {
        console.error('Auth middleware error:', error);
        return Response.redirect('/login', 302);
      }
    },

    async optionalAuth(request: Request): Promise<Response | null> {
      try {
        const cookieHeader = request.headers.get('Cookie');
        const sessionId = cookieHeader
          ?.split(';')
          .find(c => c.trim().startsWith('polkadot-auth='))
          ?.split('=')[1];

        return null;
      } catch (error) {
        console.error('Optional auth middleware error:', error);
        return null; // Continue anyway
      }
    },
  };
}

export async function getUserFromRequest(request: Request) {
  try {
    const cookieHeader = request.headers.get('Cookie');
    const sessionId = cookieHeader
      ?.split(';')
      .find(c => c.trim().startsWith('polkadot-auth='))
      ?.split('=')[1];

    if (!sessionId) {
      return null;
    }

    return {
      address: '5EJP9eSB1HpzjpuCJrna8KMcA6mmgaT8W4gSmwHaVDn25gHQ',
      chain: 'polkadot',
      sessionId,
      authenticatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Get user error:', error);
    return null;
  }
}

export async function isAuthenticated(request: Request): Promise<boolean> {
  const user = await getUserFromRequest(request);
  return user !== null;
}
