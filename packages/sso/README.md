# @polkadot-auth/sso

Polkadot SSO service for authentication and wallet management.

## Installation

```bash
npm install @polkadot-auth/sso
```

## Usage

### As a standalone service

```typescript
import { app } from '@polkadot-auth/sso';

// The app is a configured Express.js application
// You can start it directly or mount it in another Express app

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`SSO Service running on port ${port}`);
});
```

### As a mounted service in another Express app

```typescript
import express from 'express';
import { app as ssoApp } from '@polkadot-auth/sso';

const app = express();

// Mount the SSO service at /auth
app.use('/auth', ssoApp);
```

### Using individual components

```typescript
import {
  ChallengeService,
  CredentialService,
  TokenService,
  createAuthRouter,
  initializeDatabase,
} from '@polkadot-auth/sso';

// Initialize database
const db = await initializeDatabase();

// Create services
const challengeService = new ChallengeService(db);
const credentialService = new CredentialService(db);
const tokenService = new TokenService(db);

// Create routers
const authRouter = createAuthRouter(tokenService, challengeService, auditService, clients, db);
```

## Features

- **Polkadot Wallet Authentication**: SIWE-style message signing for Polkadot accounts
- **Session Management**: Secure session handling with Redis support
- **Credential Storage**: Encrypted credential storage on Kusama blockchain
- **Rate Limiting**: Built-in protection against brute force attacks
- **Audit Logging**: Comprehensive audit trail for all operations
- **CORS Support**: Configurable CORS policies
- **Security Headers**: Helmet.js integration for security headers

## Configuration

The service uses environment variables for configuration:

- `SESSION_SECRET`: Secret for session encryption
- `PORT`: Port to run the service on (default: 3000)
- `ALLOWED_ORIGINS`: Comma-separated list of allowed CORS origins
- `NODE_ENV`: Environment (development/production)

## API Endpoints

- `GET /login`: Authentication challenge page
- `POST /verify`: Verify wallet signature
- `GET /callback`: OAuth callback endpoint
- `GET /api/tokens`: Token management
- `GET /api/credentials`: Credential management
- `GET /api/clients`: Client management

## Dependencies

This package depends on:

- `@polkadot-auth/core`: Core authentication logic
- Express.js ecosystem
- SQLite for local storage
- Redis for session storage (optional)
- Polkadot.js libraries for blockchain interaction
