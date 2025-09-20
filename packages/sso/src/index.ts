import app from './app';
import { createLogger } from './utils/logger';

const logger = createLogger('password-manager-package');

export { app };

// Password Manager Types
    export * from './modules/credentials/types/credential';

// Password Manager Services
export { CredentialService } from './modules/credentials/services/credentialService';

// Password Manager Routes
export { createCredentialRouter } from './modules/credentials/routes/credentials';

// Shared Utilities
export { createLogger } from './utils';

// Configuration
export { corsConfig, initializeDatabase, sessionConfig } from './config';

export default app;
