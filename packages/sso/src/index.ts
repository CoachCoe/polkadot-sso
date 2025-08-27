import app from './app';
import { createLogger } from './utils/logger';

const logger = createLogger('sso-package');

// Export the app for use by other packages
export { app };

// Export key types and services for consumption by other packages
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

// Export utility functions
export { createLogger } from './utils';

// Export configuration
export { corsConfig, initializeDatabase, sessionConfig } from './config';

// Default export for direct usage
export default app;
