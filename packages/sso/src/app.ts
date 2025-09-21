import { config } from 'dotenv';
config();

import express, { Request, Response } from 'express';
import { Database } from 'sqlite';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { initializeDatabase } from './config/db.js';
import { globalErrorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { createRateLimiters } from './middleware/rateLimit.js';
import { securityMiddleware } from './middleware/security.js';
import { validationMiddleware } from './middleware/validation.js';
import { createAuthRouter } from './routes/auth/index.js';
import { AuditService } from './services/auditService.js';
import { ChallengeService } from './services/challengeService.js';
import { TokenService } from './services/token.js';
import { ServiceUnavailableError } from './utils/errors.js';
import { createLogger } from './utils/logger.js';

const logger = createLogger('polkadot-sso-app');

const app = express();

// Apply security middleware
securityMiddleware.forEach(middleware => {
  if (middleware) {
    app.use(middleware);
  }
});

// Apply validation middleware
validationMiddleware.forEach(middleware => {
  if (middleware) {
    app.use(middleware);
  }
});

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Swagger documentation
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Polkadot SSO API',
      version: '1.0.0',
      description: 'Single Sign-On service for Polkadot ecosystem applications',
    },
    servers: [
      {
        url: process.env.API_BASE_URL || 'http://localhost:3001',
        description: 'Development server',
      },
    ],
  },
  apis: ['./src/routes/*.ts'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'polkadot-sso',
    version: '1.0.0',
  });
});

// Initialize services
const tokenService = new TokenService();
const challengeService = new ChallengeService();
const auditService = new AuditService();
const clients = new Map(); // Empty clients map for now

// Add default client for password manager
clients.set('polkadot-password-manager', {
  client_id: 'polkadot-password-manager',
  client_secret: process.env.DEFAULT_CLIENT_SECRET || 'default-client-secret-for-development-only',
  name: 'Polkadot Password Manager',
  redirect_url: 'http://localhost:3000/callback',
  allowed_origins: ['http://localhost:3000', 'http://localhost:3001']
});

// Create rate limiters once at app initialization
const rateLimiters = createRateLimiters(auditService);

// Initialize database
let db: Database | null = null;
initializeDatabase().then(database => {
  db = database;
  logger.info('Database initialized successfully');
}).catch(error => {
  logger.error('Failed to initialize database:', error);
  process.exit(1);
});

// API routes
app.use('/api/auth', (req, res, next) => {
  if (!db) {
    const error = new ServiceUnavailableError('Database not initialized', undefined, (req as Request & { requestId?: string }).requestId);
    return next(error);
  }
  const authRouter = createAuthRouter(tokenService, challengeService, auditService, clients, db, rateLimiters);
  authRouter(req, res, next);
});

// 404 handler (must be before error handler)
app.use('*', notFoundHandler);

// Global error handling middleware (must be last)
app.use(globalErrorHandler);

logger.info('Polkadot SSO application initialized successfully');

export default app;
