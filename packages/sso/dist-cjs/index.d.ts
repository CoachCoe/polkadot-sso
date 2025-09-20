import app from './app';
export { app };
export * from './modules/credentials/types/credential';
export { CredentialService } from './modules/credentials/services/credentialService';
export { createCredentialRouter } from './modules/credentials/routes/credentials';
export { createLogger } from './utils';
export { corsConfig, initializeDatabase, sessionConfig } from './config';
export default app;
//# sourceMappingURL=index.d.ts.map