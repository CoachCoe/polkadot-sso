import { config } from 'dotenv';
config();

import express, { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { initializeDatabase } from './config/db.js';
import { createRateLimiters } from './middleware/rateLimit.js';
import { createAuthRouter } from './routes/auth/index.js';
import { AuditService } from './services/auditService.js';
import { ChallengeService } from './services/challengeService.js';
import { TokenService } from './services/token.js';
import { createLogger } from './utils/logger.js';

const logger = createLogger('polkadot-sso-app');

const app = express();

// Security middleware
app.use(helmet());

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
app.get('/health', (req: Request, res: Response) => {
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
let db: any = null;
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
    return res.status(503).json({ error: 'Database not initialized' });
  }
  const authRouter = createAuthRouter(tokenService, challengeService, auditService, clients, db, rateLimiters);
  authRouter(req, res, next);
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
  });
});

// 404 handler
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.originalUrl} not found`,
  });
});

logger.info('Polkadot SSO application initialized successfully');

export default app;
