import { config } from 'dotenv';
config();

import express, { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { createCredentialRouter } from './modules/credentials/routes/credentials';
import { CredentialService } from './modules/credentials/services/credentialService';
import { createLogger } from './utils/logger';

// Mock AuditService for testing
class MockAuditService {
  async log() { return Promise.resolve(); }
  async audit() { return Promise.resolve(); }
  getAuditLogs() { return []; }
  getAuditStats() { return {}; }
  cleanupOldAuditLogs() { return Promise.resolve(); }
}

const logger = createLogger('password-manager-app');

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
      title: 'Polkadot Password Manager API',
      version: '1.0.0',
      description: 'Secure password management service for Polkadot ecosystem',
    },
    servers: [
      {
        url: process.env.API_BASE_URL || 'http://localhost:3001',
        description: 'Development server',
      },
    ],
  },
  apis: ['./src/modules/credentials/routes/*.ts'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'polkadot-password-manager',
    version: '1.0.0',
  });
});

// Initialize services
const credentialService = new CredentialService();

// API routes
app.use('/api/credentials', createCredentialRouter(credentialService));

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

logger.info('Password Manager application initialized successfully');

export default app;
