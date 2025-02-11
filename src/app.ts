import { config } from 'dotenv';
config();

import express, { Request, Response, NextFunction, RequestHandler, ErrorRequestHandler } from 'express';
import path from 'path';
import helmet from 'helmet';
import { securityMiddleware, nonceMiddleware, ResponseWithLocals } from './middleware/security';
import { initializeDatabase } from './config/db';
import { TokenService } from './services/token';
import { ChallengeService } from './services/challengeService';
import { AuditService } from './services/auditService';
import { createAuthRouter } from './routes/auth';
import { createTokenRouter } from './routes/tokens';
import { createClientRouter } from './routes/clients';
import { Client } from './types/auth';
import session from 'express-session';
import { rateLimit } from 'express-rate-limit';
import { createLogger } from './utils/logger';
import { addRequestId } from './middleware/requestId';
import { RequestWithId } from './types/express';
import { sessionConfig } from './config/session';
import cors from 'cors';
import { corsConfig } from './config/cors';
import { createBruteForceProtection } from './middleware/bruteForce';
import { sanitizeRequestParams } from './middleware/validation';

const logger = createLogger('app');

const app = express();

// Apply middleware
app.use(addRequestId);
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        (_, res: any) => `'nonce-${res.locals.nonce}'`,
        "https://cdn.jsdelivr.net",
        "https://polkadot.js.org"
      ],
      connectSrc: ["'self'", "wss://rpc.polkadot.io"],
      frameAncestors: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  },
  referrerPolicy: { policy: 'same-origin' },
  permittedCrossDomainPolicies: { permittedPolicies: 'none' },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  crossOriginResourcePolicy: { policy: 'same-site' }
}));

// Add CORS preflight
app.options('*', cors(corsConfig));

// Add request ID tracking and security headers
app.use((req, res, next) => {
  res.setHeader('X-Request-ID', (req as RequestWithId).id);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Expect-CT', 'enforce, max-age=86400');
  next();
});

// Session configuration
app.use(session(sessionConfig));

// Global rate limiter
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false
}));

// Add request size limits before other middleware
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Add before other middleware
app.use((req, res, next) => nonceMiddleware(req, res as ResponseWithLocals, next));
app.use(securityMiddleware);

// Initialize services and routes
async function initializeApp() {
  const db = await initializeDatabase();
  
  const tokenService = new TokenService(db);
  const challengeService = new ChallengeService(db);
  const auditService = new AuditService(db);

  // Demo clients (to be replaced with database-backed system)
  const clients = new Map<string, Client>([
    ['demo-app', { 
      client_id: 'demo-app',
      name: 'Polkadot SSO',
      redirect_url: 'http://localhost:3001/callback',
      allowed_origins: ['http://localhost:3001']
    }]
  ]);

  const bruteForceMiddleware = createBruteForceProtection(auditService);

  // Mount routes
  app.use('/', createAuthRouter(
    tokenService, 
    challengeService, 
    auditService,
    clients, 
    db
  ));
  app.use('/api/tokens', createTokenRouter(tokenService, db, auditService));
  app.use('/api/clients', createClientRouter(db));

  // Add before route handlers
  app.use(bruteForceMiddleware);
  app.use(sanitizeRequestParams());

  // Error handler
  app.use(((err: Error, req: Request, res: Response, next: NextFunction) => {
    const requestId = (req as RequestWithId).id;
    logger.error({
      requestId,
      error: {
        name: err.name,
        message: err.message,
        stack: err.stack,
        details: err
      },
      method: req.method,
      url: req.url,
      query: req.query,
      body: req.body,
      ip: req.ip || 'unknown'
    });

    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      requestId,
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }) as ErrorRequestHandler);

  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    logger.info(`SSO Service running on port ${port}`);
  });
}

initializeApp().catch(console.error);

export default app;
