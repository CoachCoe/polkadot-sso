import { createAuthApiRoutes } from '@polkadot-auth/remix';
import type { ActionFunctionArgs } from '@remix-run/node';

const authRoutes = createAuthApiRoutes({
  sessionSecret: process.env.SESSION_SECRET || 'remix-example-secret',
});

export async function action({ request }: ActionFunctionArgs) {
  return authRoutes.signOut(request);
}
