import { createAuthMiddleware } from '@polkadot-auth/next';

export default createAuthMiddleware({
  basePath: '/api/auth',
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
