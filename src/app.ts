import express, { Request, Response, NextFunction, RequestHandler, ErrorRequestHandler } from 'express';
import path from 'path';
import { config } from 'dotenv';
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

// Load environment variables
config();

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
        "https://cdn.jsdelivr.net",
        "https://polkadot.js.org"
      ],
      connectSrc: ["'self'", "wss://rpc.polkadot.io"],
      frameAncestors: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: true,
  crossOriginResourcePolicy: { policy: "same-site" }
}));

// Session configuration
app.use(session(sessionConfig));

// Global rate limiter
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false
}));

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

  // Mount routes
  app.use('/', createAuthRouter(
    tokenService, 
    challengeService, 
    auditService,
    clients, 
    db
  ));
  app.use('/api/tokens', createTokenRouter(tokenService, db));
  app.use('/api/clients', createClientRouter(db));

  // Error handler
  app.use(((err: Error, req: Request, res: Response, next: NextFunction) => {
    const requestId = (req as RequestWithId).id;
    logger.error({
      requestId,
      error: err,
      method: req.method,
      url: req.url,
      ip: req.ip || 'unknown'
    });

    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      requestId
    });
  }) as ErrorRequestHandler);

  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    logger.info(`SSO Service running on port ${port}`);
  });
}

initializeApp().catch(console.error);

export default app;
