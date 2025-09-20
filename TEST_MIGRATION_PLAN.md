# Test Migration Plan - Repository Split

## Current Test Coverage Analysis

### Test Files by Functionality

#### SSO-Specific Tests (Move to polkadot-sso)
- `src/__tests__/routes/auth.test.ts` - Authentication route testing
- `src/__tests__/services/challengeService.test.ts` - Challenge service testing
- `src/__tests__/services/token.test.ts` - Token service testing
- `src/__tests__/services/auditService.test.ts` - Audit service testing

#### Password Manager Tests (Move to polkadot-password-manager)
- `src/__tests__/credentials.test.ts` - Credential service testing
- `src/__tests__/services/credentialService.test.ts` - Credential service unit tests

#### Shared Infrastructure Tests (Duplicate in both repos)
- `src/__tests__/services/cacheService.test.ts` - Cache service testing
- `src/__tests__/basic.test.ts` - Basic test suite

## Test Migration Strategy

### Phase 1: SSO Repository Tests
```bash
# Files to move to polkadot-sso/src/__tests__/
- routes/auth.test.ts
- services/challengeService.test.ts
- services/token.test.ts
- services/auditService.test.ts
- services/cacheService.test.ts (duplicated)
- basic.test.ts (duplicated)
```

### Phase 2: Password Manager Repository Tests
```bash
# Files to move to polkadot-password-manager/src/__tests__/
- credentials.test.ts
- services/credentialService.test.ts
- services/cacheService.test.ts (duplicated)
- basic.test.ts (duplicated)
```

### Phase 3: Test Configuration Updates

#### SSO Repository Test Config
```json
{
  "jest": {
    "testMatch": [
      "**/__tests__/**/*.test.ts",
      "**/__tests__/**/*.test.tsx"
    ],
    "testPathIgnorePatterns": [
      "/node_modules/",
      "/dist/"
    ],
    "setupFilesAfterEnv": ["<rootDir>/src/__tests__/setup.ts"]
  }
}
```

#### Password Manager Repository Test Config
```json
{
  "jest": {
    "testMatch": [
      "**/__tests__/**/*.test.ts",
      "**/__tests__/**/*.test.tsx"
    ],
    "testPathIgnorePatterns": [
      "/node_modules/",
      "/dist/"
    ],
    "setupFilesAfterEnv": ["<rootDir>/src/__tests__/setup.ts"]
  }
}
```

## Test Dependencies Analysis

### SSO Test Dependencies
- `supertest` - HTTP testing
- `jest` - Test framework
- `@types/jest` - Jest types
- `@types/supertest` - Supertest types

### Password Manager Test Dependencies
- `jest` - Test framework
- `@types/jest` - Jest types
- `sqlite3` - Database testing
- `redis` - Cache testing

### Shared Test Dependencies
- `jest` - Test framework
- `@types/jest` - Jest types

## Mock Strategy

### SSO Repository Mocks
```typescript
// Mock external dependencies
jest.mock('@polkadot/api');
jest.mock('@polkadot/util-crypto');
jest.mock('jsonwebtoken');
jest.mock('express-session');

// Mock internal services
jest.mock('../services/cacheService');
jest.mock('../config/db');
```

### Password Manager Repository Mocks
```typescript
// Mock external dependencies
jest.mock('crypto-js');
jest.mock('sqlite3');
jest.mock('redis');

// Mock internal services
jest.mock('../services/cacheService');
jest.mock('../config/db');
```

## Integration Testing Strategy

### Cross-Service Communication
```typescript
// Mock interfaces for cross-service communication
interface MockSSOService {
  validateToken(token: string): Promise<boolean>;
  getUserProfile(address: string): Promise<UserProfile>;
}

interface MockPasswordManagerService {
  storeCredential(credential: Credential): Promise<void>;
  getCredentials(userId: string): Promise<Credential[]>;
}
```

### Contract Testing
```typescript
// API contract tests
describe('SSO API Contracts', () => {
  it('should maintain authentication endpoint compatibility', () => {
    // Test that auth endpoints remain stable
  });
});

describe('Password Manager API Contracts', () => {
  it('should maintain credential endpoint compatibility', () => {
    // Test that credential endpoints remain stable
  });
});
```

## Test Coverage Validation

### Pre-Split Coverage
- Run current test suite to establish baseline
- Document coverage percentages for each module
- Identify any untested critical paths

### Post-Split Coverage
- Ensure all tests pass in both repositories
- Maintain or improve coverage percentages
- Add integration tests for cross-service communication

## Test Execution Strategy

### Independent Test Suites
```bash
# SSO Repository
cd polkadot-sso
npm test

# Password Manager Repository  
cd polkadot-password-manager
npm test
```

### CI/CD Test Configuration
```yaml
# GitHub Actions for both repositories
name: Test Suite
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm test
      - run: npm run test:coverage
```

## Migration Checklist

### Pre-Migration
- [ ] Document current test coverage
- [ ] Identify test dependencies
- [ ] Create mock strategies
- [ ] Plan integration testing approach

### Migration Execution
- [ ] Move SSO tests to polkadot-sso repository
- [ ] Move password manager tests to polkadot-password-manager repository
- [ ] Duplicate shared tests in both repositories
- [ ] Update test configurations
- [ ] Update import statements in tests
- [ ] Update mock configurations

### Post-Migration Validation
- [ ] All tests pass in SSO repository
- [ ] All tests pass in password manager repository
- [ ] Test coverage maintained or improved
- [ ] Integration tests working
- [ ] CI/CD pipelines configured
