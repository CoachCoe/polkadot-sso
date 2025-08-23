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
- 🌐 **Kusama Blockchain Integration**
  - Secure credential storage on Kusama blockchain
  - User-controlled encryption with personal keys
  - Real-time transaction monitoring
  - Network health monitoring
  - Cost estimation and fee management
  - Multiple storage methods (remarks, batch, custom pallets)
  - **🆕 Wallet-Based Storage (Recommended)**
    - No hardcoded seed phrases required
    - Each user stores credentials with their own wallet
    - Integrated with SSO authentication flow
    - Real user ownership and control
    - Eliminates centralized security risks

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

- **Kusama Blockchain Service**
  - Advanced Kusama service for blockchain interaction
  - Kusama integration service for credential storage
  - Transaction monitoring and health checking
  - Multiple storage strategies (remarks, batch, custom pallets)
  - Real-time transaction status tracking
  - Network health and peer monitoring

- **Audit Service**
  - Comprehensive security event logging
  - Authentication attempt tracking
  - Rate limit and security violation logging
  - Credential lifecycle auditing

## Prerequisites

- Node.js (v16 or higher)
- SQLite3
- Redis (for production)
- Kusama account with KSM balance (for blockchain storage)

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

**Kusama Blockchain Configuration:**

- `KUSAMA_ENDPOINT` - Kusama RPC endpoint (default: wss://kusama-rpc.polkadot.io)
- `KUSAMA_ACCOUNT_TYPE` - Account type: sr25519, ed25519, or ecdsa (default: sr25519)
- `KUSAMA_ACCOUNT_SEED` - 64-character hex seed for your Kusama account

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

### Modular Architecture

The application is organized into clear, focused modules that handle specific responsibilities:

```
src/
├── modules/                    # Modular architecture
│   ├── sso/                   # SSO Core Module
│   │   ├── services/          # Authentication services
│   │   ├── middleware/        # SSO-specific middleware
│   │   └── index.ts           # Module exports
│   ├── credentials/           # Credentials Core Module
│   │   ├── services/          # Credential services
│   │   └── index.ts           # Module exports
│   ├── storage/               # Storage Core Module
│   │   ├── services/          # IPFS & Kusama services
│   │   └── index.ts           # Module exports
│   ├── security/              # Security Core Module
│   │   ├── services/          # Security services
│   │   ├── middleware/        # Security middleware
│   │   ├── utils/             # Security utilities
│   │   └── index.ts           # Module exports
│   ├── api/                   # API Gateway Module
│   │   ├── routes/            # Route definitions
│   │   ├── middleware/        # API middleware
│   │   └── index.ts           # Module exports
│   ├── config.ts              # Module configuration
│   └── index.ts               # Main module exports
├── config/                     # Configuration files
│   ├── cors.ts                # CORS configuration
│   ├── db.ts                  # Database configuration
│   └── session.ts             # Session configuration
├── middleware/                 # Legacy middleware (being migrated)
├── routes/                     # Legacy routes (being migrated)
├── services/                   # Legacy services (being migrated)
├── types/                      # TypeScript type definitions
├── utils/                      # Legacy utilities (being migrated)
└── app.ts                      # Application entry point
```

### Module Dependencies

```
Security Core (1) - No dependencies
├── SSO Core (2) - Depends on Security
├── Storage Core (3) - Depends on Security
    └── Credentials Core (4) - Depends on Security + Storage
        └── API Gateway (5) - Depends on all other modules
```

### Benefits of Modular Architecture

- **Clear Separation of Concerns**: Each module has a single, well-defined responsibility
- **Improved Maintainability**: Changes to one module don't affect others
- **Better Testing**: Each module can be tested independently
- **Future Flexibility**: Modules can be extracted to separate packages
- **Gradual Migration**: Existing code continues to work while adopting new structure
- **Professional Standards**: Industry-standard modular design patterns

## Kusama Blockchain Integration

### Overview

The Polkadot SSO service includes comprehensive integration with the Kusama blockchain for secure, decentralized credential storage. This integration provides users with full control over their data while leveraging blockchain immutability and security.

### Key Features

- **🔐 User-Controlled Encryption**: Users can encrypt their credentials with personal keys, ensuring only they can access their data
- **🌐 Blockchain Storage**: Credentials are stored as encrypted remarks on the Kusama blockchain
- **📊 Real-Time Monitoring**: Live transaction tracking with automatic retry logic
- **💰 Cost Management**: Built-in cost estimation and fee calculation
- **🛡️ Multiple Storage Methods**: Support for remarks, batch transactions, and custom pallets
- **📈 Network Health**: Continuous monitoring of Kusama network status

### Storage Methods

1. **Remarks Storage** (`remark`)
   - Individual transactions for each credential chunk
   - Suitable for small to medium credentials
   - Maximum transparency and traceability

2. **Batch Storage** (`batch`)
   - Multiple credentials in single transaction
   - Cost-effective for multiple credentials
   - Reduced blockchain bloat

3. **Custom Pallet Storage** (`custom_pallet`)
   - Optimized for large credential datasets
   - Most cost-effective for bulk storage
   - Requires custom pallet implementation

### API Endpoints

- `POST /api/kusama/store` - Store encrypted credentials on Kusama
- `POST /api/kusama/retrieve` - Retrieve and decrypt credentials
- `GET /api/kusama/list` - List all user credentials
- `GET /api/kusama/cost-estimate` - Estimate storage costs
- `POST /api/kusama/verify` - Verify credential integrity
- `GET /api/kusama/health` - Check network health status
- `GET /api/kusama/monitors` - View active transaction monitors
- `POST /api/kusama/init` - Initialize Kusama service

### Encryption

The system supports two encryption modes:

1. **User-Provided Keys**: AES-256-GCM encryption with user-supplied keys
   - Keys are derived using scrypt with salt
   - Users maintain full control over their data
   - No system access to encrypted content

2. **System Encryption**: Environment-based encryption for system-managed credentials
   - Uses `DATABASE_ENCRYPTION_KEY` environment variable
   - Suitable for system-generated credentials
   - Centralized key management

### Transaction Monitoring

- **Real-Time Tracking**: Monitor transaction status from submission to finalization
- **Automatic Retries**: Configurable retry logic with exponential backoff
- **Timeout Handling**: Graceful handling of network delays and failures
- **Health Checks**: Continuous monitoring of network connectivity and peer status

### Cost Management

- **Fee Estimation**: Pre-calculation of transaction costs before submission
- **Storage Optimization**: Automatic chunking for large credentials
- **Batch Discounts**: Reduced costs when using batch storage methods
- **Balance Monitoring**: Automatic low balance warnings

### Security Features

- **Immutable Storage**: Once stored, credentials cannot be modified or deleted
- **Cryptographic Verification**: Hash-based integrity checking
- **Access Control**: Only credential owners can decrypt their data
- **Audit Trail**: Complete transaction history for compliance

## Demo & Testing

### 🆕 Wallet-Based Kusama Demo (Recommended)

Visit `/wallet-kusama-demo` in your browser to test the new wallet-based Kusama storage system:

- **No Hardcoded Seeds**: Each user uses their own wallet
- **Real Ownership**: You control your own credentials
- **SSO Integration**: Uses the existing authentication flow
- **Secure Storage**: Mock storage with real authentication
- **Cost Estimation**: See storage costs for your data
- **Network Health**: Monitor Kusama network status

### Legacy Kusama Demo (Deprecated)

Visit `/kusama-demo` in your browser to test the legacy hardcoded seed approach:

- **Store Credentials**: Test storing encrypted credentials on Kusama
- **Retrieve Credentials**: Practice retrieving and decrypting stored data
- **Cost Estimation**: See real-time cost estimates for different data sizes
- **Network Health**: Monitor Kusama network status
- **Transaction Monitoring**: Track active blockchain transactions

### 🆕 Wallet-Based API Testing Examples (Recommended)

#### Store a Credential with Wallet Authentication

```bash
curl -X POST http://localhost:3000/api/wallet-kusama/store \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-jwt-token" \
  -d '{
    "credentialData": {
      "institution": "University of Example",
      "degree": "Bachelor of Science",
      "year": "2023"
    },
    "credentialType": "academic_degree",
    "userAddress": "5Dy3rM7WVhwv58ogVn1RGK9rmnq7HwUBqeZheT9U5B26mXZd"
  }'
```

#### List Your Credentials

```bash
curl -X GET "http://localhost:3000/api/wallet-kusama/list?userAddress=5Dy3rM7WVhwv58ogVn1RGK9rmnq7HwUBqeZheT9U5B26mXZd" \
  -H "Authorization: Bearer your-jwt-token"
```

#### Get Cost Estimate

```bash
curl "http://localhost:3000/api/wallet-kusama/cost-estimate?dataSize=1000&userAddress=5Dy3rM7WVhwv58ogVn1RGK9rmnq7HwUBqeZheT9U5B26mXZd"
```

### Legacy API Testing Examples (Deprecated)

#### Store a Credential with Hardcoded Seed

#### Get Cost Estimate

```bash
curl "http://localhost:3000/api/kusama/cost-estimate?dataSize=1000"
```

#### Check Network Health

```bash
curl "http://localhost:3000/api/kusama/health"
```

## 🆕 Wallet-Based Storage Benefits

The new wallet-based Kusama storage system provides significant advantages over the legacy hardcoded seed approach:

### ✅ **Security Improvements**
- **No Seed Phrase Exposure**: Users keep their private keys secure
- **User Ownership**: Each user stores credentials with their own wallet
- **No Centralized Risk**: No single account that could be compromised
- **Real Authentication**: Uses actual SSO wallet signatures

### ✅ **User Experience Improvements**
- **Familiar Flow**: Users already know how to connect wallets
- **Real Ownership**: Users see their actual wallet address
- **No Setup Required**: No need to configure environment variables
- **Immediate Access**: Works with any Polkadot wallet

### ✅ **Architecture Improvements**
- **Scalable**: Each user has their own storage space
- **Maintainable**: No need to manage seed phrases
- **Compliant**: Better for enterprise and regulatory requirements
- **Future-Proof**: Ready for multi-chain expansion

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

### 🆕 Wallet-Based Kusama Storage (Recommended)

- `POST /api/wallet-kusama/store` - Store credential with wallet authentication
- `POST /api/wallet-kusama/retrieve` - Retrieve credential with wallet authentication
- `GET /api/wallet-kusama/list` - List credentials with wallet authentication
- `GET /api/wallet-kusama/cost-estimate` - Estimate storage cost
- `GET /api/wallet-kusama/health` - Check network health

### Legacy Kusama Storage (Deprecated)

- `POST /api/kusama/store` - Store credential using hardcoded seed
- `POST /api/kusama/retrieve` - Retrieve credential using hardcoded seed
- `GET /api/kusama/list` - List credentials using hardcoded seed
- `GET /api/kusama/cost-estimate` - Estimate storage cost
- `GET /api/kusama/health` - Check network health

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

### Modular Architecture Demo

Demonstrates the new modular architecture and module configuration:

```bash
npm run demo:modular
```

This shows:

- Module configuration and dependencies
- Initialization order
- Dependency validation
- Module usage examples

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

### Security Testing Demo

Tests all implemented security improvements:

```bash
npm run demo:security
```

### Kusama Integration Demo

Tests Kusama blockchain integration:

```bash
npm run demo:kusama
```

## Development

### Using the Modular Architecture

Import functionality from specific modules:

```typescript
// Import from specific modules
import { SecretManager, enhancedEncryption } from './modules/security';
import { ChallengeService, TokenService } from './modules/sso';
import { CredentialService, HybridCredentialService } from './modules/credentials';
import { IPFSService, KusamaService } from './modules/storage';
import { createAuthRouter, createCredentialRouter } from './modules/api';

// Or import from main modules index
import { SecretManager, ChallengeService, CredentialService, IPFSService } from './modules';
```

### Development Commands

Run in development mode:

```bash
npm run dev
```

Build the project:

```bash
npm run build
```

Run tests:

```bash
npm test
```

Code quality checks:

```bash
npm run lint:check      # Check for linting errors
npm run type-check      # TypeScript compilation check
npm run format:check    # Check code formatting
npm run format          # Auto-format code
```

## Production Deployment

### Environment Setup

1. **Generate Production Keys**:
   ```bash
   # Generate encryption key
   node -e "console.log('DATABASE_ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('hex'))"

   # Generate session secret
   node -e "console.log('SESSION_SECRET=' + require('crypto').randomBytes(32).toString('base64'))"

   # Generate Kusama account seed
   node -e "console.log('KUSAMA_ACCOUNT_SEED=' + require('crypto').randomBytes(32).toString('hex'))"
   ```

2. **Set Production Environment Variables**:
   ```bash
   NODE_ENV=production
   ENABLE_REAL_KUSAMA_STORAGE=true
   KUSAMA_TESTNET_MODE=false
   MOCK_KUSAMA_RESPONSES=false
   ```

3. **Fund Your Kusama Account**: Ensure your account has sufficient KSM for transaction fees

4. **Configure RPC Endpoints**: Use reliable Kusama RPC endpoints for production

### Security Checklist

- [ ] All environment secrets are cryptographically secure
- [ ] Kusama account seed is properly secured
- [ ] Production RPC endpoints are configured
- [ ] Rate limiting is appropriate for production load
- [ ] CORS origins are restricted to production domains
- [ ] HTTPS is enabled with proper certificates
- [ ] Database encryption is active
- [ ] Audit logging is comprehensive

### Monitoring

- **Transaction Monitoring**: Monitor all Kusama transactions for failures
- **Network Health**: Track Kusama network connectivity
- **Cost Tracking**: Monitor storage costs and account balances
- **Performance Metrics**: Track API response times and throughput
- **Security Events**: Monitor authentication attempts and security violations

### Deployment Steps

1. Set environment variables
2. Build the project: `npm run build`
3. Start the server: `npm start`

## Recent Improvements

### Modular Architecture Implementation (Latest)

- **Complete modularization** of the codebase into focused modules
- **Clear separation** between SSO, Credentials, Storage, and Security functionality
- **Gradual migration path** with no breaking changes
- **Professional architecture** following industry best practices

### Code Quality & Security Enhancements

- **Comprehensive security improvements** including enhanced encryption, security middleware, and monitoring
- **Advanced coding standards** with ESLint, Prettier, and TypeScript strict mode
- **Automated quality checks** with Git hooks and pre-commit validation
- **Code cleanup** removing unused files and improving organization

### Storage & Blockchain Integration

- **Hybrid storage solution** combining local, IPFS, and Kusama storage
- **Advanced Kusama integration** for immutable credential verification
- **Secure credential storage** with encryption and integrity checks

### Kusama Production Integration (Latest)

- **Production-ready Kusama integration** with comprehensive blockchain storage
- **User-controlled encryption** with AES-256-GCM and personal keys
- **Real-time transaction monitoring** with automatic retry logic
- **Network health monitoring** and cost estimation
- **Multiple storage strategies** (remarks, batch, custom pallets)
- **Comprehensive API endpoints** for all Kusama operations
- **Interactive demo interface** at `/kusama-demo`
- **Environment configuration** for production deployment

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

**Note**: This project now uses strict coding standards. All commits must pass linting, type checking, and formatting validation.

## License

MIT
