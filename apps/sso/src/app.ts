import { config } from 'dotenv';
config();

import express, { Request, Response } from 'express';
import { Database } from 'sqlite';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import path from 'path';
import { initializeDatabase } from './config/db.js';
import { globalErrorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { createRateLimiters } from './middleware/rateLimit.js';
import { securityMiddleware } from './middleware/security.js';
import { validationMiddleware } from './middleware/validation.js';
import { createAuthRouter } from './routes/auth/index.js';
import { createAdminRouter, initializeAdminServices } from './routes/admin/index.js';
import { AuditService } from './services/auditService.js';
import { ChallengeService } from './services/challengeService.js';
import { TokenService } from './services/token.js';
import { monitoringService } from './services/monitoringService.js';
import { SecurityService, defaultSecurityConfig } from './services/securityService.js';
import { BackupService, defaultBackupConfig } from './services/backupService.js';
import { ServiceUnavailableError } from './utils/errors.js';
import { createLogger } from './utils/logger.js';

const logger = createLogger('polkadot-sso-app');

const app = express();

// Body parsing middleware MUST come first so req.body is available
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Swagger documentation - set up VERY early to avoid middleware conflicts
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

// Set up Swagger UI with proper static file serving - BEFORE security middleware
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Polkadot SSO API Documentation',
}));

// Serve swagger-ui-dist static files manually
app.use('/api-docs', express.static(path.join(__dirname, '../node_modules/swagger-ui-dist')));

// Apply security middleware
securityMiddleware.forEach(middleware => {
  if (middleware) {
    app.use(middleware);
  }
});

// Apply validation middleware (needs req.body to be populated)
validationMiddleware.forEach(middleware => {
  if (middleware) {
    app.use(middleware);
  }
});

// Request monitoring middleware
app.use((req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    const success = res.statusCode < 400;
    const endpoint = `${req.method} ${req.path}`;
    
    monitoringService.recordRequest(endpoint, success, responseTime);
  });
  
  next();
});

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'polkadot-sso',
    version: '1.0.0',
  });
});

// Success page for authentication callback
app.get('/success', (_req: Request, res: Response) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Authentication Successful</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                margin: 0;
                padding: 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .container {
                background: white;
                border-radius: 12px;
                padding: 40px;
                box-shadow: 0 20px 40px rgba(0,0,0,0.1);
                max-width: 500px;
                width: 100%;
                text-align: center;
            }
            .success-icon {
                font-size: 4rem;
                color: #28a745;
                margin-bottom: 20px;
            }
            h1 {
                color: #333;
                margin-bottom: 10px;
            }
            p {
                color: #666;
                margin-bottom: 20px;
            }
            .code {
                background: #f8f9fa;
                border: 1px solid #e9ecef;
                border-radius: 6px;
                padding: 10px;
                font-family: monospace;
                word-break: break-all;
                margin: 10px 0;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="success-icon">✅</div>
            <h1>Authentication Successful!</h1>
            <p>You have successfully authenticated with Polkadot SSO.</p>
            ${_req.query.code ? `<p>Authorization Code:</p><div class="code">${_req.query.code}</div>` : ''}
            ${_req.query.state ? `<p>State:</p><div class="code">${_req.query.state}</div>` : ''}
            <p><a href="/api-docs">View API Documentation</a></p>
        </div>
    </body>
    </html>
  `);
});

// Initialize services
const tokenService = new TokenService();
const challengeService = new ChallengeService();
const auditService = new AuditService();
const clients = new Map(); // Initialize clients map

// Initialize production services
const securityService = new SecurityService(defaultSecurityConfig);
const backupService = new BackupService(defaultBackupConfig);

// Initialize monitoring service
monitoringService.initialize();

// Initialize admin services
initializeAdminServices(securityService, backupService);

// Add demo client for testing
clients.set('demo-client', {
  client_id: 'demo-client',
  client_secret: process.env.DEFAULT_CLIENT_SECRET || 'default-client-secret-for-development-only',
  name: 'Demo Client Application',
  redirect_url: process.env.DEMO_CLIENT_REDIRECT_URL || 'http://localhost:3001/success',
  allowed_origins: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173']
});

// Create rate limiters once at app initialization
const rateLimiters = createRateLimiters(auditService);

// Initialize database
let db: Database | null = null;
initializeDatabase().then(database => {
  db = database;
  logger.info('Database initialized successfully');
  
  // Initialize backup service with database
  backupService.initialize(db);
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
  const authRouter = createAuthRouter(tokenService, challengeService, auditService, clients, db, rateLimiters, process.env.JWT_SECRET || 'fallback-secret');
  authRouter(req, res, next);
});

// Mount admin routes
app.use('/api/admin', createAdminRouter(rateLimiters));

// 404 handler (must be before error handler)
app.use((req, res, next) => {
  notFoundHandler(req, res);
});

// Global error handling middleware (must be last)
app.use(globalErrorHandler);

logger.info('Polkadot SSO application initialized successfully');

export default app;
