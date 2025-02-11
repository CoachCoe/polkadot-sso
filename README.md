# Polkadot SSO Service

A secure Single Sign-On (SSO) service using Polkadot wallets for authentication.

## Features
- 🔐 Secure authentication using Polkadot wallets
- 🔑 OAuth2 PKCE flow for secure authorization
- 🛡️ Advanced security features (CSP, CORS, Rate Limiting)
- 📝 Comprehensive audit logging
- 🔄 Session management with Redis (Production) / Memory Store (Development)
- 🎯 TypeScript for type safety

## Core Functionality
- OAuth2 PKCE-based SSO service using Polkadot wallet signatures
- Challenge-response authentication with secure message signing
- JWT-based token management with refresh capabilities
- Comprehensive security features and audit logging
- SQLite database with encryption for sensitive data

## Key Components

### Backend Services
- **Authentication Service**
  - OAuth2 PKCE flow implementation
  - Challenge generation and verification
  - Signature validation using @polkadot/util-crypto
  - JWT token issuance and refresh handling

- **Token Service**
  - Access and refresh token management
  - Token verification and refresh logic
  - Session tracking and expiration

- **Challenge Service**
  - Secure challenge message generation
  - Challenge storage and verification
  - PKCE code challenge verification

- **Audit Service**
  - Comprehensive security event logging
  - Authentication attempt tracking
  - Rate limit and security violation logging


## Prerequisites

- Node.js (v16 or higher)
- SQLite3
- Redis (for production)

## Installation

1. Clone the repository:
git clone https://github.com/yourusername/polkadot-sso.git
cd polkadot-sso

2. Install dependencies:
npm install

3. Create `.env` file:
Required
SESSION_SECRET=your-secret-here
NODE_ENV=development
JWT_SECRET=your-jwt-secret
DATABASE_ENCRYPTION_KEY=your-db-encryption-key
Optional
PORT=3000
LOG_LEVEL=info
COOKIE_DOMAIN=localhost
CLIENT_WHITELIST=http://localhost:3001
ALLOWED_ORIGINS=http://localhost:3001
Redis (only needed in production)
REDIS_URL=redis://localhost:6379

4. Start the development server:
npm run dev

## Project Structure
public/
├── js/
│   └── client/
│       ├── login.js      # Compiled from src/client/login.ts
│       └── challenge.js  # Compiled from src/client/challenge.ts
├── styles/
│   └── main.css          # Styles for the login/challenge pages
└── favicon.ico           # Optional favicon
src/
├── config/ # Configuration files
│ ├── cors.ts # CORS configuration
│ ├── db.ts # Database configuration
│ └── session.ts # Session configuration
├── middleware/ # Express middleware
│ ├── bruteForce.ts # Brute force protection
│ ├── rateLimit.ts # Rate limiting
│ ├── security.ts # Security headers
│ ├── securityAudit.ts # Security event logging
│ └── validation.ts # Input validation & sanitization
├── routes/ # API routes
│ ├── auth.ts # Authentication routes
│ ├── tokens.ts # Token management
│ └── clients.ts # Client management
├── services/ # Business logic
├── types/ # TypeScript types
├── utils/ # Utility functions
└── app.ts # Application entry point

## Security Features
- Content Security Policy (CSP) with nonce-based script execution
- CORS protection with configurable origins
- Multi-layer rate limiting:
  - Global rate limits
  - Endpoint-specific limits
  - Brute force protection
- Session security:
  - Secure cookie settings
  - Redis session store (production)
  - CSRF protection
- Request security:
  - Input validation using Zod
  - Request sanitization
  - Parameter sanitization
  - Request size limits
- HTTP Security Headers:
  - Strict-Transport-Security
  - Content-Security-Policy
  - X-Content-Type-Options
  - X-Frame-Options
  - X-XSS-Protection
  - Expect-CT
- SQL injection protection with parameterized queries
- Comprehensive audit logging:
  - Security events
  - Authentication attempts
  - Rate limit violations
  - Brute force detection

## API Endpoints

### Authentication Flow
- `GET /login` - Initiates login flow
- `GET /challenge` - Generates signing challenge
- `GET /verify` - Verifies signature
- `POST /token` - Exchanges auth code for tokens

### Token Management
- `POST /api/tokens/refresh` - Refresh access token

### Database Schema
CREATE TABLE challenges (
id TEXT PRIMARY KEY,
message TEXT NOT NULL,
client_id TEXT NOT NULL,
code_verifier TEXT NOT NULL,
code_challenge TEXT NOT NULL,
state TEXT NOT NULL,
created_at INTEGER NOT NULL,
expires_at INTEGER NOT NULL,
used BOOLEAN DEFAULT FALSE
);
CREATE TABLE auth_codes (
code TEXT PRIMARY KEY,
address TEXT NOT NULL,
client_id TEXT NOT NULL,
created_at INTEGER NOT NULL,
expires_at INTEGER NOT NULL,
used BOOLEAN DEFAULT FALSE
);
CREATE TABLE sessions (
address TEXT NOT NULL,
client_id TEXT NOT NULL,
access_token TEXT NOT NULL,
refresh_token TEXT NOT NULL,
access_token_id TEXT NOT NULL,
refresh_token_id TEXT NOT NULL,
fingerprint TEXT NOT NULL,
created_at INTEGER NOT NULL,
access_token_expires_at INTEGER NOT NULL,
refresh_token_expires_at INTEGER NOT NULL,
last_used_at INTEGER NOT NULL,
PRIMARY KEY (address, client_id)
);

## Development
Run in development mode
npm run dev
Build the project
npm run build
Run tests
npm test

## Production Deployment
1. Set environment variables
2. Build the project: `npm run build`
3. Start the server: `npm start`

## Contributing
1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License
MIT