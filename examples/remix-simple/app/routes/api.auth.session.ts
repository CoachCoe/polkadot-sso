import { createAuthApiRoutes } from '@polkadot-auth/remix';
import type { LoaderFunctionArgs } from '@remix-run/node';

const authRoutes = createAuthApiRoutes({
  sessionSecret: process.env.SESSION_SECRET || 'remix-example-secret',
});

export async function loader({ request }: LoaderFunctionArgs) {
  return authRoutes.session(request);
}
