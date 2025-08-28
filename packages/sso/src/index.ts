import app from './app';
import { createLogger } from './utils/logger';

const logger = createLogger('sso-package');

export { app };

export type { Challenge, Client, Credential } from './types';

export {
  AuditService,
  ChallengeService,
  CredentialService,
  TokenService,
  WalletBasedKusamaService,
} from './services';

export {
  createAuthRouter,
  createClientRouter,
  createCredentialRouter,
  createTokenRouter,
} from './routes';

export { createLogger } from './utils';

export { corsConfig, initializeDatabase, sessionConfig } from './config';

export default app;
