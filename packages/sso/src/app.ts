import { config } from 'dotenv';
config();

import compression from 'compression';
import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import session from 'express-session';
import helmet from 'helmet';
import path from 'path';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { corsConfig } from './config/cors';
import { initializeDatabasePool, shutdownDatabasePool } from './config/db';
import { sessionConfig } from './config/session';
import { createBruteForceProtection } from './middleware/bruteForce';
import { addRequestId } from './middleware/requestId';
import { nonceMiddleware, ResponseWithLocals } from './middleware/security';
import { sanitizeRequestParams } from './middleware/validation';
import { createAuthRouter } from './routes/auth';
import { createClientRouter } from './routes/clients';
import { createCredentialRouter } from './routes/credentials';
import { createTokenRouter } from './routes/tokens';
import { AuditService } from './services/auditService';
import { getCacheService, shutdownCacheService } from './services/cacheService';
import { ChallengeService } from './services/challengeService';
import { CredentialService } from './services/credentialService';
import { TokenService } from './services/token';
import { Client } from './types/auth';
import { RequestWithId } from './types/express';
import { validateEnvironment } from './utils/envValidation';
import { createLogger } from './utils/logger';

const logger = createLogger('app');

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Polkadot SSO API',
      version: '1.0.0',
      description:
        'Polkadot Single Sign-On (SSO) service API for wallet-based authentication and credential management',
      contact: {
        name: 'Polkadot Auth Team',
        email: 'support@polkadot-auth.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url:
          process.env.NODE_ENV === 'production'
            ? 'https://api.polkadot-auth.com'
            : 'http://localhost:3000',
        description:
          process.env.NODE_ENV === 'production' ? 'Production server' : 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token obtained from authentication',
        },
      },
    },
    security: [
      {
        BearerAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.ts', './src/app.ts'], // Path to the API docs
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Validate environment variables before starting the application
const envValidation = validateEnvironment();
if (!envValidation.valid) {
  logger.error('Environment validation failed:', envValidation.errors);
  process.exit(1);
}

// Log warnings if any
if (envValidation.warnings.length > 0) {
  logger.warn('Environment validation warnings:', envValidation.warnings);
}

const app = express();

// Performance optimizations
app.use(
  compression({
    level: 6, // Balanced compression level
    threshold: 1024, // Only compress responses larger than 1KB
    filter: (req, res) => {
      // Don't compress if client doesn't support it
      if (req.headers['x-no-compression']) {
        return false;
      }
      // Use compression for all other requests
      return compression.filter(req, res);
    },
  })
);

app.use(addRequestId);
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(
  express.static(path.join(__dirname, '../public'), {
    maxAge: process.env.NODE_ENV === 'production' ? '1h' : '0', // Cache static files in production
    etag: true,
    lastModified: true,
  })
);

app.use(
  helmet({
    contentSecurityPolicy:
      process.env.NODE_ENV === 'production'
        ? {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'", "'unsafe-inline'"], // Allow inline scripts for wallet integration
              styleSrc: ["'self'", "'unsafe-inline'"],
              imgSrc: ["'self'", 'data:', 'https:'],
              connectSrc: ["'self'", 'https://kusama-rpc.polkadot.io', 'https://kusama.subscan.io'],
              frameSrc: ["'none'"],
              objectSrc: ["'none'"],
              upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
            },
          }
        : false, // Disable CSP in development for easier debugging
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: process.env.NODE_ENV === 'production',
    },
    noSniff: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    frameguard: { action: 'deny' },
    xssFilter: true,
  })
);

app.options('*', cors(corsConfig));

app.use((req, res, next) => {
  res.setHeader('X-Request-ID', (req as RequestWithId).id);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Expect-CT', 'enforce, max-age=86400');
  next();
});

app.use(session(sessionConfig));

app.use(
  rateLimit({
    windowMs: envValidation.env?.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000,
    max: envValidation.env?.RATE_LIMIT_MAX_REQUESTS || 100,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// Temporarily disabled security middleware to allow WebAssembly to work
// app.use(securityMiddleware);
// But keep nonce middleware for proper nonce generation
app.use((req, res, next) => nonceMiddleware(req, res as ResponseWithLocals, next));

async function initializeApp() {
  // Initialize database pool
  await initializeDatabasePool();

  // Initialize cache service
  const cacheService = getCacheService();

  // Health check for cache service
  const cacheHealth = await cacheService.healthCheck();
  logger.info('Cache service health check', { healthy: cacheHealth });

  const tokenService = new TokenService();
  const challengeService = new ChallengeService();
  const auditService = new AuditService();
  const credentialService = new CredentialService();

  const clients = new Map<string, Client>();

  // Create a default client for testing (only in development)
  if (process.env.NODE_ENV === 'development') {
    clients.set('default-client', {
      client_id: 'default-client',
      name: 'Polkadot SSO Demo',
      client_secret: process.env.DEFAULT_CLIENT_SECRET || 'dev-secret-change-in-production',
      redirect_url: 'http://localhost:3000/callback',
      allowed_origins: ['http://localhost:3000'],
    });
  }

  const bruteForceMiddleware = createBruteForceProtection(auditService);

  // Swagger documentation routes
  app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'Polkadot SSO API Documentation',
    })
  );

  /**
   * @swagger
   * /health:
   *   get:
   *     summary: Health check endpoint
   *     description: Check if the service is running and healthy
   *     tags: [Health]
   *     responses:
   *       200:
   *         description: Service is healthy
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: "ok"
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   *                   example: "2024-01-01T12:00:00.000Z"
   *                 version:
   *                   type: string
   *                   example: "1.0.0"
   */
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    });
  });

  app.use('/', createAuthRouter(tokenService, challengeService, auditService, clients));
  app.use('/api/tokens', createTokenRouter(tokenService, auditService));
  app.use('/api/clients', createClientRouter());
  app.use('/api/credentials', createCredentialRouter(credentialService, auditService));
  // Temporarily disabled due to Polkadot.js dependency issues
  // app.use('/api/kusama', kusamaRoutes);
  // app.use('/api/wallet-kusama', walletKusamaRoutes);

  app.use(bruteForceMiddleware);
  app.use(sanitizeRequestParams());

  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    const requestId = (req as RequestWithId).id;
    logger.error({
      requestId,
      error: {
        name: err.name,
        message: err.message,
        stack: err.stack,
        details: err,
      },
      method: req.method,
      url: req.url,
      query: req.query,
      body: req.body,
      ip: req.ip || 'unknown',
    });

    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      requestId,
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  });

  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    logger.info(`SSO Service running on port ${port}`);
  });
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, starting graceful shutdown...');
  await shutdownDatabasePool();
  await shutdownCacheService();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('Received SIGINT, starting graceful shutdown...');
  await shutdownDatabasePool();
  await shutdownCacheService();
  process.exit(0);
});

initializeApp().catch(console.error);

export default app;
