# Polkadot SSO Credential Management System - Technical Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Technology Stack](#technology-stack)
4. [Core Components](#core-components)
5. [Process Flows](#process-flows)
6. [Security Implementation](#security-implementation)
7. [Database Schema](#database-schema)
8. [API Reference](#api-reference)
9. [Development Guide](#development-guide)
10. [Deployment](#deployment)

## System Overview

The Polkadot SSO Credential Management System is a comprehensive digital credential platform built on Polkadot blockchain technology. It provides secure issuance, storage, sharing, and verification of digital credentials using cryptographic proofs and blockchain-based identity verification.

### Key Features
- **Decentralized Identity**: Uses Polkadot addresses as unique identifiers
- **Cryptographic Security**: AES-256-GCM encryption for credential data
- **Flexible Credential Types**: JSON schema-based credential definitions
- **Granular Sharing**: Permission-based credential sharing with expiration
- **Verification Workflows**: Multiple verification methods with audit trails
- **Request-Based Issuance**: Workflow for credential requests and approvals

## Architecture

### High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client Apps   │    │   Polkadot.js   │    │   Polkadot      │
│   (Frontend)    │◄──►│   Extension     │◄──►│   Blockchain    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │
         ▼                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    Express.js Server                        │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │   Auth      │ │ Credential  │ │   Token     │           │
│  │  Routes     │ │  Service    │ │  Service    │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │  Security   │ │   Audit     │ │ Validation  │           │
│  │ Middleware  │ │  Service    │ │ Middleware  │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────┐    ┌─────────────────┐
│   SQLite DB     │    │   Encryption    │
│   (Local)       │    │   Layer         │
└─────────────────┘    └─────────────────┘
```

### Component Architecture

#### 1. Authentication Layer
- **Polkadot.js Integration**: Handles wallet connections and signature verification
- **Challenge-Response**: Implements PKCE (Proof Key for Code Exchange) flow
- **JWT Tokens**: Secure session management with access and refresh tokens

#### 2. Credential Management Layer
- **CredentialService**: Core business logic for credential operations
- **Schema Validation**: JSON schema-based credential type definitions
- **Encryption Service**: AES-256-GCM encryption for sensitive data

#### 3. Security Layer
- **Rate Limiting**: Multi-tier rate limiting with endpoint-specific rules
- **Input Validation**: Zod schema validation with sanitization
- **Security Headers**: Helmet.js for comprehensive security headers
- **Audit Logging**: Comprehensive security event tracking

## Technology Stack

### Core Technologies

| Component | Technology | Version | Purpose |
|-----------|------------|---------|---------|
| **Runtime** | Node.js | 18+ | Server runtime |
| **Framework** | Express.js | 4.21.2 | Web framework |
| **Language** | TypeScript | 5.7.3 | Type-safe development |
| **Database** | SQLite | 5.1.6 | Local data storage |
| **Encryption** | Node.js crypto | Built-in | AES-256-GCM encryption |

### Polkadot Ecosystem

| Package | Version | Purpose |
|---------|---------|---------|
| `@polkadot/api` | 10.13.1 | Polkadot blockchain interaction |
| `@polkadot/extension-dapp` | 0.58.3 | Wallet extension integration |
| `@polkadot/util` | 13.3.1 | Utility functions |
| `@polkadot/util-crypto` | 12.6.2 | Cryptographic operations |

### Security & Validation

| Package | Version | Purpose |
|---------|---------|---------|
| `helmet` | 7.1.0 | Security headers |
| `express-rate-limit` | 7.1.5 | Rate limiting |
| `zod` | 3.24.1 | Schema validation |
| `jsonwebtoken` | 9.0.2 | JWT token handling |
| `isomorphic-dompurify` | 2.21.0 | XSS protection |

### Development Tools

| Tool | Version | Purpose |
|------|---------|---------|
| `esbuild` | 0.25.0 | Fast bundling |
| `ts-node-dev` | 2.0.0 | Development server |
| `jest` | 29.7.0 | Testing framework |
| `eslint` | 8.56.0 | Code linting |

## Core Components

### 1. CredentialService

The central service managing all credential operations.

```typescript
export class CredentialService {
  constructor(private db: Database) {}
  
  // User Profile Management
  async createUserProfile(address: string, profile: UserProfile): Promise<UserProfile>
  async getUserProfile(address: string): Promise<UserProfile | undefined>
  
  // Credential Type Management
  async createCredentialType(creatorAddress: string, typeData: CredentialType): Promise<CredentialType>
  async getCredentialType(id: string): Promise<CredentialType | undefined>
  
  // Credential Management
  async createCredential(issuerAddress: string, userAddress: string, request: CreateCredentialRequest): Promise<Credential>
  async getUserCredentials(userAddress: string): Promise<Credential[]>
  async getCredentialData(credentialId: string): Promise<Record<string, unknown> | null>
  
  // Credential Sharing
  async shareCredential(ownerAddress: string, request: ShareCredentialRequest): Promise<CredentialShare>
  async getSharedCredentials(userAddress: string): Promise<CredentialShare[]>
  
  // Credential Verification
  async verifyCredential(verifierAddress: string, request: VerifyCredentialRequest): Promise<CredentialVerification>
  
  // Issuance Requests
  async createIssuanceRequest(requesterAddress: string, request: CreateIssuanceRequest): Promise<IssuanceRequest>
  async approveIssuanceRequest(requestId: string, approvedBy: string): Promise<void>
}
```

### 2. Encryption Service

Handles secure encryption and decryption of credential data.

```typescript
// AES-256-GCM encryption with authenticated data
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 12; // 96 bits for GCM

export const encryptData = (text: string): string => {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  cipher.setAAD(Buffer.from('polkadot-sso', 'utf8'));
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();
  
  // Format: iv:tag:encrypted
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
};
```

### 3. Security Middleware

Multi-layered security implementation.

```typescript
// Rate Limiting
export const createRateLimiters = (auditService: AuditService) => ({
  login: createRateLimiter(15 * 60 * 1000, 5, 'login', auditService),
  challenge: createRateLimiter(5 * 60 * 1000, 3, 'challenge', auditService),
  verify: createRateLimiter(5 * 60 * 1000, 3, 'verify', auditService),
  api: createRateLimiter(60 * 1000, 30, 'api', auditService)
});

// Security Headers
export const securityMiddleware = [
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'nonce-${nonce}'"],
        connectSrc: ["'self'", "wss://rpc.polkadot.io"],
        frameAncestors: ["'none'"],
        objectSrc: ["'none'"]
      }
    }
  })
];
```

## Process Flows

### 1. Authentication Flow

```mermaid
sequenceDiagram
    participant Client
    participant Server
    participant Polkadot
    participant Wallet

    Client->>Server: GET /login?client_id=xxx
    Server->>Client: Challenge page with nonce
    Client->>Wallet: Request signature
    Wallet->>Client: Signed challenge
    Client->>Server: GET /verify?signature=xxx&challenge_id=xxx
    Server->>Polkadot: Verify signature
    Polkadot->>Server: Verification result
    Server->>Client: Auth code
    Client->>Server: POST /token (exchange code)
    Server->>Client: Access + Refresh tokens
```

### 2. Credential Issuance Flow

```mermaid
sequenceDiagram
    participant Issuer
    participant Server
    participant DB
    participant Encryption

    Issuer->>Server: POST /api/credentials/credentials
    Server->>Server: Validate issuer permissions
    Server->>Encryption: Encrypt credential data
    Encryption->>Server: Encrypted data + hash
    Server->>DB: Store credential
    DB->>Server: Credential ID
    Server->>Issuer: Credential created
```

### 3. Credential Sharing Flow

```mermaid
sequenceDiagram
    participant Owner
    participant Server
    participant DB
    participant Recipient

    Owner->>Server: POST /api/credentials/shares
    Server->>Server: Validate ownership
    Server->>DB: Create share record
    DB->>Server: Share ID
    Server->>Owner: Share created
    Recipient->>Server: GET /api/credentials/shared
    Server->>DB: Query shared credentials
    DB->>Server: Shared credentials
    Server->>Recipient: Credential list
```

### 4. Credential Verification Flow

```mermaid
sequenceDiagram
    participant Verifier
    participant Server
    participant DB
    participant Encryption

    Verifier->>Server: POST /api/credentials/:id/verify
    Server->>Server: Check access permissions
    Server->>DB: Get credential data
    DB->>Server: Encrypted credential
    Server->>Encryption: Decrypt data
    Encryption->>Server: Decrypted data
    Server->>DB: Store verification record
    DB->>Server: Verification ID
    Server->>Verifier: Verification result
```

## Security Implementation

### 1. Cryptographic Security

#### Encryption Algorithm
- **Algorithm**: AES-256-GCM (Galois/Counter Mode)
- **Key Length**: 256 bits
- **IV Length**: 96 bits
- **Authentication**: Built-in GCM authentication tag

#### Key Management
The system uses a comprehensive **SecretManager** class for secure key management:

```typescript
export class SecretManager {
  private static instance: SecretManager;
  private secrets: Map<string, string> = new Map();
  private validated: boolean = false;

  // Singleton pattern for secret management
  static getInstance(): SecretManager {
    if (!SecretManager.instance) {
      SecretManager.instance = new SecretManager();
    }
    return SecretManager.instance;
  }

  // Validates all required and optional secrets
  validateSecrets(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Validate required secrets
    for (const config of REQUIRED_SECRETS) {
      const value = process.env[config.name];
      
      if (!value) {
        errors.push(`${config.name} is required but not set`);
        continue;
      }
      
      if (!validateSecret(value, config.minLength)) {
        errors.push(`${config.name} must be at least ${config.minLength} characters long with sufficient entropy`);
      }
    }
    
    this.validated = errors.length === 0;
    return { valid: this.validated, errors };
  }

  // Secure secret retrieval with validation
  getSecret(name: string): string {
    if (!this.validated) {
      throw new Error('Secrets must be validated before use');
    }
    
    const value = process.env[name];
    if (!value) {
      throw new Error(`Secret ${name} not found`);
    }
    
    return value;
  }

  // Generate cryptographically secure secrets
  generateSecrets(): Record<string, string> {
    const generated: Record<string, string> = {};
    
    for (const config of REQUIRED_SECRETS) {
      generated[config.name] = generateSecureKey(config.minLength);
    }
    
    return generated;
  }
}

// Encryption key derivation
function getEncryptionKey(): Buffer {
  const secretManager = SecretManager.getInstance();
  const envKey = secretManager.getSecret('DATABASE_ENCRYPTION_KEY');
  
  // Use the first 32 bytes as the key
  return Buffer.from(envKey).subarray(0, KEY_LENGTH);
}
```

### 2. Input Validation & Sanitization

#### Schema Validation
```typescript
const createCredentialSchema = z.object({
  body: z.object({
    user_address: z.string().min(1),
    credential_type_id: z.string().uuid(),
    credential_data: z.record(z.unknown()),
    expires_at: z.number().optional(),
    metadata: z.record(z.unknown()).optional()
  })
});
```

#### Input Sanitization
```typescript
export const sanitizeInput = (input: unknown): unknown => {
  if (typeof input === 'string') {
    return DOMPurify.sanitize(input);
  }
  if (Array.isArray(input)) {
    return input.map(sanitizeInput);
  }
  if (typeof input === 'object' && input !== null) {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[sanitizeInput(key) as string] = sanitizeInput(value);
    }
    return sanitized;
  }
  return input;
};
```

### 3. Rate Limiting Strategy

#### Multi-Tier Rate Limiting
```typescript
const rateLimiters = {
  login: { windowMs: 15 * 60 * 1000, max: 5 },      // 5 attempts per 15 minutes
  challenge: { windowMs: 5 * 60 * 1000, max: 3 },   // 3 challenges per 5 minutes
  verify: { windowMs: 5 * 60 * 1000, max: 3 },      // 3 verifications per 5 minutes
  token: { windowMs: 60 * 1000, max: 2 },           // 2 token requests per minute
  api: { windowMs: 60 * 1000, max: 30 }             // 30 API calls per minute
};
```

### 4. Security Headers

#### Content Security Policy
```typescript
contentSecurityPolicy: {
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'nonce-${nonce}'"],
    connectSrc: ["'self'", "wss://rpc.polkadot.io"],
    frameAncestors: ["'none'"],
    objectSrc: ["'none'"],
    upgradeInsecureRequests: []
  }
}
```

## Database Schema

### Core Tables

#### 1. User Profiles
```sql
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
  preferences TEXT, -- JSON string
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  last_login_at INTEGER,
  is_verified BOOLEAN DEFAULT 0,
  verification_level INTEGER DEFAULT 0
);
```

#### 2. Credential Types
```sql
CREATE TABLE credential_types (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  schema_version TEXT NOT NULL,
  schema_definition TEXT NOT NULL, -- JSON schema
  issuer_pattern TEXT, -- Regex for valid issuers
  required_fields TEXT, -- JSON array
  optional_fields TEXT, -- JSON array
  validation_rules TEXT, -- JSON object
  is_active BOOLEAN DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  created_by TEXT NOT NULL
);
```

#### 3. Credentials
```sql
CREATE TABLE credentials (
  id TEXT PRIMARY KEY,
  user_address TEXT NOT NULL,
  credential_type_id TEXT NOT NULL,
  issuer_address TEXT NOT NULL,
  issuer_name TEXT,
  credential_data TEXT NOT NULL, -- Encrypted JSON
  credential_hash TEXT NOT NULL, -- SHA-256 hash
  proof_signature TEXT,
  proof_type TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  issued_at INTEGER NOT NULL,
  expires_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  metadata TEXT, -- JSON string
  FOREIGN KEY (user_address) REFERENCES user_profiles(address),
  FOREIGN KEY (credential_type_id) REFERENCES credential_types(id)
);
```

#### 4. Credential Shares
```sql
CREATE TABLE credential_shares (
  id TEXT PRIMARY KEY,
  credential_id TEXT NOT NULL,
  owner_address TEXT NOT NULL,
  shared_with_address TEXT NOT NULL,
  shared_with_client_id TEXT,
  permissions TEXT NOT NULL, -- JSON array
  access_level TEXT NOT NULL DEFAULT 'read',
  expires_at INTEGER,
  created_at INTEGER NOT NULL,
  created_by TEXT NOT NULL,
  is_active BOOLEAN DEFAULT 1,
  FOREIGN KEY (credential_id) REFERENCES credentials(id)
);
```

#### 5. Credential Verifications
```sql
CREATE TABLE credential_verifications (
  id TEXT PRIMARY KEY,
  credential_id TEXT NOT NULL,
  verifier_address TEXT NOT NULL,
  verification_type TEXT NOT NULL,
  verification_data TEXT, -- JSON string
  verification_signature TEXT,
  status TEXT NOT NULL,
  verified_at INTEGER,
  expires_at INTEGER,
  created_at INTEGER NOT NULL,
  notes TEXT,
  FOREIGN KEY (credential_id) REFERENCES credentials(id)
);
```

## API Reference

### Authentication Endpoints

#### GET /login
Initiates the authentication flow.
```typescript
Query Parameters:
- client_id: string (required) - OAuth client identifier

Response:
- HTML page with Polkadot wallet integration
```

#### GET /challenge
Generates a signing challenge for wallet authentication.
```typescript
Query Parameters:
- address: string (required) - Polkadot address
- client_id: string (required) - OAuth client identifier

Response:
{
  challenge_id: string,
  message: string,
  expires_at: number
}
```

#### GET /verify
Verifies the signed challenge and issues an authorization code.
```typescript
Query Parameters:
- signature: string (required) - Cryptographic signature
- challenge_id: string (required) - Challenge identifier
- address: string (required) - Polkadot address

Response:
{
  code: string,
  expires_at: number
}
```

#### POST /token
Exchanges authorization code for access and refresh tokens.
```typescript
Request Body:
{
  code: string,
  client_id: string,
  client_secret: string
}

Response:
{
  access_token: string,
  refresh_token: string,
  token_type: "Bearer",
  expires_in: number
}
```

### Credential Management Endpoints

#### POST /api/credentials/profiles
Creates a new user profile.
```typescript
Request Body:
{
  display_name: string,
  email?: string,
  bio?: string,
  website?: string,
  verification_level?: number
}

Response:
{
  id: string,
  address: string,
  display_name: string,
  created_at: number,
  // ... other profile fields
}
```

#### POST /api/credentials/types
Creates a new credential type definition.
```typescript
Request Body:
{
  name: string,
  description?: string,
  schema_version: string,
  schema_definition: object,
  issuer_pattern?: string,
  required_fields: string[],
  optional_fields: string[],
  validation_rules: object
}

Response:
{
  id: string,
  name: string,
  created_at: number,
  // ... other type fields
}
```

#### POST /api/credentials/credentials
Issues a new credential.
```typescript
Request Body:
{
  user_address: string,
  credential_type_id: string,
  credential_data: object,
  expires_at?: number,
  metadata?: object
}

Response:
{
  id: string,
  user_address: string,
  credential_type_id: string,
  status: string,
  issued_at: number,
  // ... other credential fields
}
```

#### GET /api/credentials/credentials
Retrieves user's credentials.
```typescript
Headers:
- Authorization: Bearer <access_token>

Response:
[
  {
    id: string,
    credential_type_id: string,
    status: string,
    issued_at: number,
    // ... other credential fields
  }
]
```

#### POST /api/credentials/shares
Shares a credential with another user.
```typescript
Request Body:
{
  credential_id: string,
  shared_with_address: string,
  permissions: string[],
  access_level: string,
  expires_at?: number
}

Response:
{
  id: string,
  credential_id: string,
  shared_with_address: string,
  permissions: string,
  created_at: number
}
```

#### POST /api/credentials/:id/verify
Verifies a credential.
```typescript
Request Body:
{
  verification_type: string,
  verification_data?: object,
  notes?: string
}

Response:
{
  id: string,
  credential_id: string,
  verification_type: string,
  status: string,
  verified_at: number
}
```

## Development Guide

### Environment Setup

#### Secret Management

The system uses a comprehensive secret management approach with automatic validation and generation:

**Required Secrets:**
```typescript
const REQUIRED_SECRETS = [
  {
    name: 'SESSION_SECRET',
    required: true,
    minLength: 32,
    description: 'Secret for session encryption'
  },
  {
    name: 'JWT_SECRET',
    required: true,
    minLength: 32,
    description: 'Secret for JWT token signing'
  },
  {
    name: 'DATABASE_ENCRYPTION_KEY',
    required: true,
    minLength: 32,
    description: 'Key for database field encryption'
  }
];
```

**Secret Generation:**
```bash
# Generate cryptographically secure secrets
npm run generate-secrets
```

This creates a `.env` file with:
- Cryptographically secure random secrets using `crypto.randomBytes()`
- Proper entropy validation
- Minimum length requirements
- Automatic validation on application startup

**Secret Validation:**
```typescript
// Validates secret strength and entropy
export const validateSecret = (secret: string, minLength: number = 32): boolean => {
  if (!secret || secret.length < minLength) {
    return false;
  }
  
  // Check for sufficient entropy (basic check)
  const uniqueChars = new Set(secret).size;
  return uniqueChars >= minLength / 2;
};
```

**Application Configuration:**
```bash
# Application
NODE_ENV=development
PORT=3000
CLIENT_WHITELIST=http://localhost:3001

# Database
DATABASE_PATH=./data/sso.db

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3001

# Cookie Configuration
COOKIE_DOMAIN=localhost

# Redis Configuration (for production)
# REDIS_URL=redis://localhost:6379
```

#### Development Commands
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run credential demo
npm run demo:credentials

# Build client assets
npm run build

# Run tests
npm test

# Lint code
npm run lint
```

### Adding New Credential Types

#### 1. Define Schema
```typescript
const degreeCredentialSchema = {
  type: 'object',
  properties: {
    degree: { type: 'string' },
    field: { type: 'string' },
    institution: { type: 'string' },
    graduation_date: { type: 'string', format: 'date' },
    gpa: { type: 'number', minimum: 0, maximum: 4.0 }
  },
  required: ['degree', 'field', 'institution', 'graduation_date']
};
```

#### 2. Create Credential Type
```typescript
const credentialType = await credentialService.createCredentialType(issuerAddress, {
  name: 'University Degree',
  description: 'Academic degree credential',
  schema_version: '1.0.0',
  schema_definition: JSON.stringify(degreeCredentialSchema),
  required_fields: JSON.stringify(['degree', 'field', 'institution', 'graduation_date']),
  optional_fields: JSON.stringify(['gpa']),
  validation_rules: JSON.stringify({
    gpa: { min: 0, max: 4.0 },
    graduation_date: { format: 'date', max: 'now' }
  }),
  is_active: true
});
```

### Security Best Practices

#### 1. Input Validation
- Always validate input using Zod schemas
- Sanitize all user inputs
- Use parameterized queries for database operations

#### 2. Encryption
- Never store sensitive data in plain text
- Use environment variables for encryption keys
- Rotate encryption keys regularly

#### 3. Rate Limiting
- Implement appropriate rate limits for all endpoints
- Monitor and log rate limit violations
- Adjust limits based on usage patterns

#### 4. Audit Logging
- Log all security-relevant events
- Include request context in audit logs
- Monitor audit logs for suspicious activity

## Deployment

### Production Considerations

#### 1. Database
- Use PostgreSQL or MySQL for production
- Implement database connection pooling
- Set up automated backups
- Configure read replicas for scaling

#### 2. Security
- Use HTTPS in production
- Configure proper CORS origins
- Implement IP whitelisting for admin access
- Set up monitoring and alerting

#### 3. Performance
- Implement caching (Redis)
- Use CDN for static assets
- Configure load balancing
- Monitor application performance

#### 4. Monitoring
- Set up application monitoring 
- Configure error tracking 
- Implement health checks
- Set up log aggregation

### Docker Deployment

#### Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist ./dist
COPY public ./public

EXPOSE 3000

CMD ["node", "dist/app.js"]
```

#### Docker Compose
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_ENCRYPTION_KEY=${DATABASE_ENCRYPTION_KEY}
      - JWT_SECRET=${JWT_SECRET}
    volumes:
      - ./data:/app/data
    restart: unless-stopped
```

### Environment Configuration

#### Production Environment Configuration

**Secret Management in Production:**
```bash
# Generate production secrets
npm run generate-secrets

# Or use secrets management services:
# - AWS Secrets Manager
# - HashiCorp Vault
# - Docker Secrets
# - Kubernetes Secrets
```

**Production Environment Variables:**
```bash
# Application
NODE_ENV=production
PORT=3000

# Security (use secrets management service)
DATABASE_ENCRYPTION_KEY=<from-secrets-service>
JWT_SECRET=<from-secrets-service>
SESSION_SECRET=<from-secrets-service>

# Database
DATABASE_URL=postgresql://user:password@host:port/database

# Redis (for sessions)
REDIS_URL=redis://host:port

# Monitoring
SENTRY_DSN=your-sentry-dsn
NEW_RELIC_LICENSE_KEY=your-new-relic-key

# CORS
CLIENT_WHITELIST=https://yourdomain.com,https://app.yourdomain.com
```

**Secret Rotation:**
```typescript
// The SecretManager supports secret rotation
const secretManager = SecretManager.getInstance();
const newSecret = secretManager.rotateSecret('JWT_SECRET');
```

This technical documentation provides a comprehensive overview of the Polkadot SSO Credential Management System, covering architecture, implementation details, security measures, and deployment considerations. The system is designed to be secure, scalable, and maintainable while providing a robust foundation for digital credential management on the Polkadot blockchain. 