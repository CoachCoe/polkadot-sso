import express from 'express';
import path from 'path';
import { config } from 'dotenv';
import { securityMiddleware, errorHandler } from './middleware/security';
import { initializeDatabase } from './config/db';
import { TokenService } from './services/token';
import { ChallengeService } from './services/challengeService';
import { createAuthRouter } from './routes/auth';
import { createTokenRouter } from './routes/tokens';
import { createClientRouter } from './routes/clients';
import { Client } from './types/auth';

// Load environment variables
config();

const app = express();

// Apply security middleware
app.use(securityMiddleware);
app.use(express.json());

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// Initialize services and routes
async function initializeApp() {
  const db = await initializeDatabase();
  
  const tokenService = new TokenService(db);
  const challengeService = new ChallengeService(db);

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
  app.use('/', createAuthRouter(tokenService, challengeService, clients));
  app.use('/api/tokens', createTokenRouter(tokenService, db));
  app.use('/api/clients', createClientRouter(db));

  // Error handler
  app.use(errorHandler);

  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`SSO Service running on port ${port}`);
  });
}

initializeApp().catch(console.error);

export default app;
