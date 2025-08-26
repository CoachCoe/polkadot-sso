import { createAuthApiRoutes } from '@polkadot-auth/remix';
import type { LoaderFunctionArgs } from '@remix-run/node';

const authRoutes = createAuthApiRoutes({
  sessionSecret: process.env.SESSION_SECRET || 'remix-example-secret',
  sessionMaxAge: 3600, // 1 hour
});

export async function loader({ request }: LoaderFunctionArgs) {
  return authRoutes.challenge(request);
}
