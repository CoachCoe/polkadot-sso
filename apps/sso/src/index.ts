import app from './app.js';
import { createLogger } from './utils/logger.js';

const logger = createLogger('polkadot-sso');

const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, () => {
  logger.info(`🚀 Polkadot SSO server running on port ${PORT}`);
  logger.info(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
  logger.info(`🏥 Health Check: http://localhost:${PORT}/health`);
});

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

  export { ChallengeService } from './services/challengeService.js';
  export { TokenService } from './services/token.js';

export { createAuthRouter } from './routes/auth/index.js';

export { createLogger } from './utils/index.js';

export { initializeDatabase, sessionConfig } from './config/index.js';

export default app;
