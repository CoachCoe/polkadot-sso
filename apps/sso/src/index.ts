import app from './app.js';
import { createLogger } from './utils/logger.js';

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
  export { ChallengeService } from './services/challengeService.js';
  export { TokenService } from './services/token.js';

// SSO Routes
export { createAuthRouter } from './routes/auth/index.js';

// Shared Utilities
export { createLogger } from './utils/index.js';

// Configuration
export { initializeDatabase, sessionConfig } from './config/index.js';

export default app;
