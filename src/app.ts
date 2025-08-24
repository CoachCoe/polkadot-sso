import { config } from 'dotenv';
config();

import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import session from 'express-session';
import helmet from 'helmet';
import path from 'path';
import { corsConfig } from './config/cors';
import { initializeDatabase } from './config/db';
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
import { ChallengeService } from './services/challengeService';
import { CredentialService } from './services/credentialService';
import { TokenService } from './services/token';
import { Client } from './types/auth';
import { RequestWithId } from './types/express';
import { createLogger } from './utils/logger';
import { validateAllSecrets } from './utils/secrets';

const logger = createLogger('app');

// Validate secrets before starting the application
const secretValidation = validateAllSecrets();
if (!secretValidation.valid) {
  logger.error('Secret validation failed:', secretValidation.errors);
  process.exit(1);
}

const app = express();

app.use(addRequestId);
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

app.use(
  helmet({
    contentSecurityPolicy: false, // Temporarily disable CSP to allow WebAssembly to work
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
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Temporarily disabled security middleware to allow WebAssembly to work
// app.use(securityMiddleware);
// But keep nonce middleware for proper nonce generation
app.use((req, res, next) => nonceMiddleware(req, res as ResponseWithLocals, next));

async function initializeApp() {
  const db = await initializeDatabase();

  const tokenService = new TokenService(db);
  const challengeService = new ChallengeService(db);
  const auditService = new AuditService(db);
  const credentialService = new CredentialService(db);

  const clients = new Map<string, Client>();

  // Create a default client for testing
  clients.set('default-client', {
    client_id: 'default-client',
    name: 'Polkadot SSO Demo',
    client_secret: 'default-client-secret-32-chars-minimum-required',
    redirect_url: 'http://localhost:3000/callback',
    allowed_origins: ['http://localhost:3000'],
  });

  const bruteForceMiddleware = createBruteForceProtection(auditService);

  app.use('/', createAuthRouter(tokenService, challengeService, auditService, clients, db));
  app.use('/api/tokens', createTokenRouter(tokenService, db, auditService));
  app.use('/api/clients', createClientRouter(db));
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

initializeApp().catch(console.error);

export default app;
