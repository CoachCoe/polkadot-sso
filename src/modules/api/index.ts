export { createAuthRouter } from '../../routes/auth';
export { createClientRouter } from '../../routes/clients';
export { createCredentialRouter } from '../../routes/credentials';
// Removed hybrid credentials router - no longer needed
export { addRequestId as requestIdMiddleware } from '../../middleware/requestId';
export { createTokenRouter } from '../../routes/tokens';
