# API Surface Documentation - Pre-Split

## Current Repository Structure Analysis

### SSO Public API Surface

#### Main Exports (`src/index.ts`)
```typescript
// Application
export { app };

// Types
export type { Challenge, Client, Credential } from './types';

// Services
export { 
  AuditService, 
  ChallengeService, 
  TokenService, 
  WalletBasedKusamaService 
} from './services';

// Password Manager Service (to be moved)
export { CredentialService } from './modules/credentials';

// Routes
export { 
  createAuthRouter, 
  createClientRouter, 
  createTokenRouter 
} from './routes';

// Password Manager Routes (to be moved)
export { createCredentialRouter } from './modules/credentials';

// Utilities
export { createLogger } from './utils';

// Configuration
export { 
  corsConfig, 
  initializeDatabase, 
  sessionConfig 
} from './config';
```

#### SSO-Specific Services
- **ChallengeService**: Challenge generation and validation
- **TokenService**: JWT token management
- **AuditService**: Security auditing and logging
- **WalletBasedKusamaService**: Kusama wallet integration

#### SSO-Specific Routes
- **createAuthRouter**: Authentication endpoints
- **createClientRouter**: Client management
- **createTokenRouter**: Token management

### Password Manager Public API Surface

#### Credential Module Exports (`src/modules/credentials/index.ts`)
```typescript
// Services
export { CredentialService } from './services/credentialService';

// Routes
export { createCredentialRouter } from './routes/credentials';

// Types
export * from './types/credential';

// Utils
export * from './utils/credentialUtils';

// Configuration
export const CREDENTIAL_MODULE_CONFIG = {
  name: 'Credentials Core',
  dependencies: ['security', 'storage'],
  initOrder: 4,
  enabled: true,
  description: 'Credential and password management functionality'
};
```

#### Password Manager Types
- **UserProfile**: User profile management
- **CredentialType**: Credential type definitions
- **Credential**: Individual credential storage
- **CredentialShare**: Credential sharing functionality
- **CredentialVerification**: Verification workflows
- **CredentialTemplate**: Template management
- **IssuanceRequest**: Credential issuance requests
- **CredentialRevocation**: Revocation management

### Shared Infrastructure API Surface

#### Security Module (`src/modules/security/index.ts`)
```typescript
export { createBruteForceProtection } from '../../middleware/bruteForce';
export { createRateLimiters } from '../../middleware/rateLimit';
export { sanitizeRequest, sanitizeRequestParams, validateBody } from '../../middleware/validation';
export { AuditService } from '../../services/auditService';
export { decryptData, encryptData } from '../../utils/encryption';
export { enhancedEncryption } from '../../utils/enhancedEncryption';
export { createQueryProtectionMiddleware, QueryProtection } from '../../utils/queryProtection';
export { SecretManager } from '../../utils/secrets';
```

#### Storage Module (`src/modules/storage/index.ts`)
```typescript
export {
  KusamaIntegrationService,
  kusamaIntegrationService,
} from '../../services/kusamaIntegrationService';
```

#### Common Utilities (`src/utils/index.ts`)
```typescript
export * from './logger';
export * from './db';
export * from './encryption';
export * from './queryProtection';
export * from './nonce';
export * from './sanitization';
export * from './secrets';
export * from './validation';
export * from './envValidation';
export * from './schemas';
```

## Post-Split API Design

### polkadot-sso Repository
```typescript
// Main exports
export { app } from './app';
export { createLogger } from './utils/logger';

// Types
export type { Challenge, Client } from './types';

// Services
export { 
  AuditService, 
  ChallengeService, 
  TokenService, 
  WalletBasedKusamaService 
} from './services';

// Routes
export { 
  createAuthRouter, 
  createClientRouter, 
  createTokenRouter 
} from './routes';

// Configuration
export { 
  corsConfig, 
  initializeDatabase, 
  sessionConfig 
} from './config';

// Shared utilities (duplicated)
export * from './utils';
export * from './types';
```

### polkadot-password-manager Repository
```typescript
// Main exports
export { CredentialService } from './services/credentialService';
export { createCredentialRouter } from './routes/credentials';

// Types
export * from './types/credential';

// Utils
export * from './utils/credentialUtils';

// Shared utilities (duplicated)
export * from './utils';
export * from './types';
```

## Migration Impact Analysis

### Breaking Changes
1. **Package Name**: `polkadot-sso` → `@polkadot-auth/sso` + `@polkadot-auth/password-manager`
2. **Import Paths**: Credential-related imports will move to separate package
3. **Configuration**: Separate configuration for each service

### Migration Examples

#### Before (Combined)
```typescript
import { 
  signIn, 
  createVault, 
  storeCredential 
} from 'polkadot-sso';
```

#### After (Split)
```typescript
import { signIn } from '@polkadot-auth/sso';
import { createVault, storeCredential } from '@polkadot-auth/password-manager';
```

## Dependencies Analysis

### SSO-Only Dependencies
- `@polkadot/api`: ^10.11.3
- `@polkadot/util-crypto`: ^12.6.2
- `jsonwebtoken`: ^9.0.2
- `express-session`: ^1.17.3
- `express-rate-limit`: ^7.1.5
- `helmet`: ^7.1.0
- `csurf`: ^1.11.0

### Password Manager Dependencies
- `crypto-js`: ^4.2.0
- `sqlite3`: ^5.1.6
- `redis`: ^4.6.10
- `connect-redis`: ^7.1.0

### Shared Dependencies
- `express`: ^4.18.2
- `cors`: ^2.8.5
- `compression`: ^1.7.4
- `dotenv`: ^16.3.1
- `winston`: ^3.11.0
- `zod`: ^3.22.4
- `cookie-parser`: ^1.4.6
