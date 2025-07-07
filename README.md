# Polkadot SSO & Credential Management Service

A comprehensive Single Sign-On (SSO) and credential management service using Polkadot wallets for authentication and secure credential storage.

## Features
- 🔐 Secure authentication using Polkadot wallets
- 🔑 OAuth2 PKCE flow for secure authorization
- 🛡️ Advanced security features (CSP, CORS, Rate Limiting)
- 📝 Comprehensive audit logging
- 🔄 Session management with Redis (Production) / Memory Store (Development)
- 🎯 TypeScript for type safety
- 🏷️ **Credential Management System**
  - User profile management
  - Credential types and schemas
  - Secure credential storage with encryption
  - Credential sharing and permissions
  - Verification and revocation
  - Issuance request workflow

## Core Functionality
- OAuth2 PKCE-based SSO service using Polkadot wallet signatures
- Challenge-response authentication with secure message signing
- JWT-based token management with refresh capabilities
- Comprehensive security features and audit logging
- SQLite database with encryption for sensitive data
- **Credential Management:**
  - User profiles with verification levels
  - Flexible credential type definitions
  - Encrypted credential data storage
  - Granular sharing permissions
  - Cryptographic verification
  - Issuance request approval workflow

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

- **Credential Service**
  - User profile management
  - Credential type definitions and validation
  - Encrypted credential storage and retrieval
  - Credential sharing and permission management
  - Verification and revocation handling
  - Issuance request workflow

- **Audit Service**
  - Comprehensive security event logging
  - Authentication attempt tracking
  - Rate limit and security violation logging
  - Credential lifecycle auditing


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

3. Generate secure secrets:
```bash
npm run generate-secrets
```
This will create a `.env` file with cryptographically secure secrets.

Alternatively, create `.env` file manually:
**Required Secrets:**
- `SESSION_SECRET` - Secret for session encryption (min 32 chars)
- `JWT_SECRET` - Secret for JWT token signing (min 32 chars)  
- `DATABASE_ENCRYPTION_KEY` - Key for database field encryption (min 32 chars)

**Optional Configuration:**
- `NODE_ENV` - Environment (development/production)
- `PORT` - Server port (default: 3000)
- `LOG_LEVEL` - Logging level (default: info)
- `COOKIE_DOMAIN` - Cookie domain (default: localhost)
- `CLIENT_WHITELIST` - Allowed client origins
- `ALLOWED_ORIGINS` - CORS allowed origins
- `ADMIN_SECRET` - Secret for admin operations (min 16 chars)
- `REDIS_URL` - Redis URL (for production sessions)

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

### Credential Management

#### User Profiles
- `POST /api/credentials/profiles` - Create user profile
- `GET /api/credentials/profiles/me` - Get current user profile
- `PUT /api/credentials/profiles/me` - Update user profile

#### Credential Types
- `POST /api/credentials/types` - Create credential type
- `GET /api/credentials/types` - List active credential types
- `GET /api/credentials/types/:id` - Get specific credential type

#### Credentials
- `POST /api/credentials/credentials` - Issue new credential
- `GET /api/credentials/credentials` - List user's credentials
- `GET /api/credentials/credentials/:id` - Get specific credential
- `GET /api/credentials/credentials/:id/data` - Get decrypted credential data

#### Credential Sharing
- `POST /api/credentials/credentials/:id/share` - Share credential with another user
- `GET /api/credentials/credentials/shared` - List credentials shared with user

#### Credential Verification
- `POST /api/credentials/credentials/:id/verify` - Verify a credential

#### Issuance Requests
- `POST /api/credentials/issuance-requests` - Request credential issuance
- `GET /api/credentials/issuance-requests/pending` - List pending requests (issuer only)
- `POST /api/credentials/issuance-requests/:id/approve` - Approve issuance request
- `POST /api/credentials/issuance-requests/:id/reject` - Reject issuance request

### Database Schema

#### SSO Tables
```sql
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
```

#### Credential Management Tables
```sql
-- User profiles extending beyond just addresses
CREATE TABLE user_profiles (
  id TEXT PRIMARY KEY,
  address TEXT UNIQUE NOT NULL,
  display_name TEXT,
  email TEXT,
  avatar_url TEXT,
  bio TEXT,
  website TEXT,
  location TEXT,
  timezone TEXT,
  preferences TEXT, -- JSON string for user preferences
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  last_login_at INTEGER,
  is_verified BOOLEAN DEFAULT 0,
  verification_level INTEGER DEFAULT 0 -- 0=unverified, 1=email, 2=kyc, 3=advanced
);

-- Credential types/schemas
CREATE TABLE credential_types (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  schema_version TEXT NOT NULL,
  schema_definition TEXT NOT NULL, -- JSON schema
  issuer_pattern TEXT, -- Regex pattern for valid issuers
  required_fields TEXT, -- JSON array of required field names
  optional_fields TEXT, -- JSON array of optional field names
  validation_rules TEXT, -- JSON object with validation rules
  is_active BOOLEAN DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  created_by TEXT NOT NULL -- address of creator
);

-- Credential instances
CREATE TABLE credentials (
  id TEXT PRIMARY KEY,
  user_address TEXT NOT NULL,
  credential_type_id TEXT NOT NULL,
  issuer_address TEXT NOT NULL,
  issuer_name TEXT,
  credential_data TEXT NOT NULL, -- Encrypted JSON data
  credential_hash TEXT NOT NULL, -- Hash of credential data for integrity
  proof_signature TEXT, -- Cryptographic proof of credential
  proof_type TEXT, -- Type of proof (e.g., 'ed25519', 'sr25519', 'ecdsa')
  status TEXT NOT NULL DEFAULT 'active', -- active, revoked, expired, pending
  issued_at INTEGER NOT NULL,
  expires_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  metadata TEXT, -- JSON string for additional metadata
  FOREIGN KEY (user_address) REFERENCES user_profiles(address),
  FOREIGN KEY (credential_type_id) REFERENCES credential_types(id)
);

-- Credential sharing permissions
CREATE TABLE credential_shares (
  id TEXT PRIMARY KEY,
  credential_id TEXT NOT NULL,
  owner_address TEXT NOT NULL,
  shared_with_address TEXT NOT NULL,
  shared_with_client_id TEXT, -- Optional: specific client app
  permissions TEXT NOT NULL, -- JSON string of granted permissions
  access_level TEXT NOT NULL DEFAULT 'read', -- read, write, admin
  expires_at INTEGER,
  created_at INTEGER NOT NULL,
  created_by TEXT NOT NULL, -- address of person who created the share
  is_active BOOLEAN DEFAULT 1,
  FOREIGN KEY (credential_id) REFERENCES credentials(id),
  FOREIGN KEY (owner_address) REFERENCES user_profiles(address),
  FOREIGN KEY (shared_with_address) REFERENCES user_profiles(address)
);

-- Credential verification records
CREATE TABLE credential_verifications (
  id TEXT PRIMARY KEY,
  credential_id TEXT NOT NULL,
  verifier_address TEXT NOT NULL,
  verification_type TEXT NOT NULL, -- 'proof', 'signature', 'manual', 'automated'
  verification_data TEXT, -- JSON string with verification details
  verification_signature TEXT, -- Cryptographic proof of verification
  status TEXT NOT NULL, -- 'verified', 'failed', 'pending', 'expired'
  verified_at INTEGER,
  expires_at INTEGER,
  created_at INTEGER NOT NULL,
  notes TEXT,
  FOREIGN KEY (credential_id) REFERENCES credentials(id),
  FOREIGN KEY (verifier_address) REFERENCES user_profiles(address)
);

-- Credential issuance requests
CREATE TABLE issuance_requests (
  id TEXT PRIMARY KEY,
  requester_address TEXT NOT NULL,
  issuer_address TEXT NOT NULL,
  credential_type_id TEXT NOT NULL,
  template_id TEXT, -- Optional: if using a template
  request_data TEXT NOT NULL, -- JSON with requested credential data
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected, issued
  approved_at INTEGER,
  rejected_at INTEGER,
  rejection_reason TEXT,
  issued_credential_id TEXT, -- Reference to created credential
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  expires_at INTEGER, -- Request expiration
  FOREIGN KEY (requester_address) REFERENCES user_profiles(address),
  FOREIGN KEY (issuer_address) REFERENCES user_profiles(address),
  FOREIGN KEY (credential_type_id) REFERENCES credential_types(id),
  FOREIGN KEY (template_id) REFERENCES credential_templates(id),
  FOREIGN KEY (issued_credential_id) REFERENCES credentials(id)
);

-- Credential revocation registry
CREATE TABLE credential_revocations (
  id TEXT PRIMARY KEY,
  credential_id TEXT NOT NULL,
  revoked_by_address TEXT NOT NULL,
  revocation_reason TEXT,
  revocation_signature TEXT, -- Cryptographic proof of revocation
  revoked_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (credential_id) REFERENCES credentials(id),
  FOREIGN KEY (revoked_by_address) REFERENCES user_profiles(address)
);
```

## Security Features

### Secret Management
- **Cryptographically Secure Secrets**: All secrets are generated using Node.js crypto.randomBytes()
- **Secret Validation**: Automatic validation of secret strength and entropy
- **Secret Rotation**: Built-in support for rotating secrets
- **Environment Isolation**: Different secrets for different environments

### Encryption
- **AES-256-GCM**: Uses authenticated encryption for database fields
- **Key Derivation**: PBKDF2 key derivation for encryption keys
- **Additional Authenticated Data**: Prevents tampering with encrypted data

### Best Practices
- **Never commit secrets**: .env files are gitignored
- **Regular rotation**: Rotate secrets in production environments
- **Environment separation**: Use different secrets for dev/staging/prod
- **Secrets management**: Consider using AWS Secrets Manager, HashiCorp Vault, etc. in production

## Demo Scripts

### SSO Demo (Login Flow)

A simple Express app that demonstrates the Polkadot SSO login flow in action.

To run the SSO demo app:
```bash
npm run demo
```
Or directly:
```bash
npx ts-node-dev src/demo/app.ts
```
This will start a demo server and allow you to test the SSO login flow in your browser.

### Credential Management Demo

A comprehensive CLI demo script that showcases the full credential lifecycle:
- User profile creation
- Credential type creation
- Credential issuance
- Credential sharing
- Credential verification
- Issuance request workflow

To run the credential management demo:
```bash
npm run demo:credentials
```
Or directly:
```bash
npx ts-node src/demo/credentialDemo.ts
```
All output will be printed to your terminal.

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