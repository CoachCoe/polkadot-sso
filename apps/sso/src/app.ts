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
import { createTelegramAuthRouter } from './routes/telegramAuth.js';
import { AuditService } from './services/auditService.js';
import { ChallengeService } from './services/challengeService.js';
import { TokenService } from './services/token.js';
import { ServiceUnavailableError } from './utils/errors.js';
import { createLogger } from './utils/logger.js';

const logger = createLogger('polkadot-sso-app');

const app = express();

// Trust proxy for rate limiting (needed for ngrok)
app.set('trust proxy', 1);

// Body parsing middleware MUST come first so req.body is available
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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

// Serve the OpenAPI spec as JSON
app.get('/api-docs/swagger.json', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Serve a simple Swagger UI page
app.get('/api-docs', (_req: Request, res: Response) => {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Polkadot SSO API Documentation</title>
  <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui.css" />
  <style>
    html {
      box-sizing: border-box;
      overflow: -moz-scrollbars-vertical;
      overflow-y: scroll;
    }
    *, *:before, *:after {
      box-sizing: inherit;
    }
    body {
      margin:0;
      background: #fafafa;
    }
    .swagger-ui .topbar { display: none; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      const ui = SwaggerUIBundle({
        url: '/api-docs/swagger.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: "StandaloneLayout"
      });
    };
  </script>
</body>
</html>`;
  res.send(html);
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

// Initialize services
const tokenService = new TokenService();
const challengeService = new ChallengeService();
const auditService = new AuditService();
const clients = new Map(); // Empty clients map for now

// Add default client for demo purposes
clients.set('demo-client', {
  client_id: 'demo-client',
  client_secret: process.env.DEFAULT_CLIENT_SECRET || 'default-client-secret-for-development-only',
  name: 'Demo Client Application',
  redirect_url: process.env.DEMO_CLIENT_REDIRECT_URL || 'http://localhost:3001/api/auth/callback',
  allowed_origins: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173']
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

// Telegram authentication routes
app.use('/api/auth/telegram', (req, res, next) => {
  if (!db) {
    const error = new ServiceUnavailableError('Database not initialized', undefined, (req as Request & { requestId?: string }).requestId);
    return next(error);
  }
  const telegramAuthRouter = createTelegramAuthRouter(tokenService, auditService, clients, db, rateLimiters);
  telegramAuthRouter(req, res, next);
});

// 404 handler (must be before error handler)
app.use((req, res) => {
  notFoundHandler(req, res);
});

// Global error handling middleware (must be last)
app.use(globalErrorHandler);

logger.info('Polkadot SSO application initialized successfully');

export default app;
