// Credential Management Module
// Centralized exports for credential functionality

// Services
export { CredentialService } from './services/credentialService';

// Routes
export { createCredentialRouter } from './routes/credentials';

// Types
export * from './types/credential';

// Utils
export * from './utils/credentialUtils';

// Module configuration
export const CREDENTIAL_MODULE_CONFIG = {
  name: 'Credentials Core',
  dependencies: ['security', 'storage'],
  initOrder: 4,
  enabled: true,
  description: 'Credential and password management functionality',
};
