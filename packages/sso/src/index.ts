import app from './app';
import { createLogger } from './utils/logger';

const logger = createLogger('sso-package');

export { app };

export type { Challenge, Client, Credential } from './types';

export { AuditService, ChallengeService, TokenService, WalletBasedKusamaService } from './services';

export { CredentialService } from './modules/credentials';

export { createAuthRouter, createClientRouter, createTokenRouter } from './routes';

export { createCredentialRouter } from './modules/credentials';

export { createLogger } from './utils';

export { corsConfig, initializeDatabase, sessionConfig } from './config';

export default app;
