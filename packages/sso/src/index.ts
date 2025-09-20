import app from './app';
import { createLogger } from './utils/logger';

const logger = createLogger('polkadot-sso');

// Start the server
const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, () => {
  logger.info(`🚀 Polkadot SSO server running on port ${PORT}`);
  logger.info(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
  logger.info(`🏥 Health Check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

export { app };

// SSO Services
export { SIWEStyleAuthService } from './services/siweStyleAuthService';
export { TokenService } from './services/token';
export { ChallengeService } from './services/challengeService';

// SSO Routes
export { createAuthRouter } from './routes/auth';

// Shared Utilities
export { createLogger } from './utils';

// Configuration
export { corsConfig, initializeDatabase, sessionConfig } from './config';

export default app;
