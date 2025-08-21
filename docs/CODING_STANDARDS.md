# 📋 Coding Standards & Best Practices

This document outlines the coding standards and best practices for the Polkadot SSO project.

## 🎯 **Code Quality Standards**

### **1. TypeScript Best Practices**

#### **Type Safety**
```typescript
// ✅ Good: Explicit types
interface UserProfile {
  id: string;
  address: string;
  createdAt: Date;
}

const createUser = (data: UserProfile): Promise<UserProfile> => {
  // Implementation
};

// ❌ Bad: Using 'any'
const createUser = (data: any): any => {
  // Implementation
};
```

#### **Error Handling**
```typescript
// ✅ Good: Proper error handling
try {
  const result = await riskyOperation();
  return result;
} catch (error) {
  logger.error('Operation failed', {
    error: error instanceof Error ? error.message : 'Unknown error',
    context: 'createUser'
  });
  throw new Error('Failed to create user');
}

// ❌ Bad: Generic error handling
try {
  const result = await riskyOperation();
  return result;
} catch (error) {
  console.error(error);
  throw error;
}
```

#### **Null Safety**
```typescript
// ✅ Good: Null-safe operations
const userName = user?.profile?.name ?? 'Unknown User';
const userAge = user?.profile?.age ?? 0;

// ❌ Bad: Unsafe property access
const userName = user.profile.name; // Could throw error
```

### **2. Code Style Guidelines**

#### **Naming Conventions**
```typescript
// ✅ Good: Descriptive names
const MAX_RETRY_ATTEMPTS = 3;
const isValidEmail = (email: string): boolean => { /* ... */ };
const userAuthenticationService = new UserAuthenticationService();

// ❌ Bad: Unclear names
const max = 3;
const check = (email: string): boolean => { /* ... */ };
const service = new Service();
```

#### **Function Design**
```typescript
// ✅ Good: Single responsibility, clear parameters
const validateUserCredentials = (
  email: string,
  password: string,
  options: ValidationOptions = {}
): ValidationResult => {
  // Implementation
};

// ❌ Bad: Too many responsibilities
const processUser = (userData: any): any => {
  // Validates, saves, sends email, updates cache, etc.
};
```

#### **Comments & Documentation**
```typescript
/**
 * Validates user credentials against the authentication system
 * @param email - User's email address
 * @param password - User's password (will be hashed)
 * @param options - Additional validation options
 * @returns Promise resolving to validation result
 * @throws {ValidationError} When credentials are invalid
 */
const validateUserCredentials = async (
  email: string,
  password: string,
  options: ValidationOptions = {}
): Promise<ValidationResult> => {
  // Implementation
};
```

### **3. Security Best Practices**

#### **Input Validation**
```typescript
// ✅ Good: Comprehensive validation
const validateUserInput = (input: unknown): UserInput => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(8).max(128),
    age: z.number().min(13).max(120).optional()
  });

  return schema.parse(input);
};

// ❌ Bad: No validation
const processUserInput = (input: any) => {
  // Directly use input without validation
};
```

#### **Secure Logging**
```typescript
// ✅ Good: Sanitized logging
logger.info('User login attempt', {
  email: sanitizeEmail(email),
  ipAddress: req.ip,
  userAgent: req.get('user-agent'),
  timestamp: new Date().toISOString()
});

// ❌ Bad: Logging sensitive data
logger.info('User login attempt', {
  email: email, // Could contain sensitive data
  password: password, // Never log passwords!
  fullRequest: req.body // Too much information
});
```

### **4. Performance Guidelines**

#### **Async/Await Usage**
```typescript
// ✅ Good: Proper async handling
const processUsers = async (users: User[]): Promise<void> => {
  const results = await Promise.all(
    users.map(user => processUser(user))
  );

  return results;
};

// ❌ Bad: Blocking operations
const processUsers = async (users: User[]): Promise<void> => {
  for (const user of users) {
    await processUser(user); // Sequential processing
  }
};
```

#### **Memory Management**
```typescript
// ✅ Good: Proper cleanup
class ResourceManager {
  private resources: Set<Resource> = new Set();

  addResource(resource: Resource): void {
    this.resources.add(resource);
  }

  cleanup(): void {
    for (const resource of this.resources) {
      resource.dispose();
    }
    this.resources.clear();
  }
}

// ❌ Bad: Memory leaks
class ResourceManager {
  private resources: Resource[] = [];

  addResource(resource: Resource): void {
    this.resources.push(resource); // Never cleaned up
  }
}
```

## 🔧 **Development Workflow**

### **1. Pre-commit Checks**

The project uses Husky to enforce code quality:

```bash
# Install dependencies
npm install

# Run all checks manually
npm run pre-commit

# Individual checks
npm run lint:check      # ESLint with no warnings
npm run type-check      # TypeScript compilation
npm run test:ci         # Tests with coverage
npm run format:check    # Prettier formatting
```

### **2. Code Review Checklist**

Before submitting a PR, ensure:

- [ ] **TypeScript**: No `any` types, proper interfaces
- [ ] **Linting**: No ESLint errors or warnings
- [ ] **Formatting**: Code follows Prettier standards
- [ ] **Tests**: New code has test coverage
- [ ] **Documentation**: Functions and classes documented
- [ ] **Security**: No sensitive data in logs or errors
- [ ] **Performance**: No obvious performance issues
- [ ] **Error Handling**: Proper try-catch blocks

### **3. File Organization**

```
src/
├── config/          # Configuration files
├── middleware/      # Express middleware
├── routes/          # API route handlers
├── services/        # Business logic
├── types/           # TypeScript type definitions
├── utils/           # Utility functions
└── app.ts          # Application entry point
```

### **4. Import Organization**

```typescript
// 1. Node.js built-ins
import { readFileSync } from 'fs';
import path from 'path';

// 2. Third-party packages
import express from 'express';
import { z } from 'zod';

// 3. Internal modules (absolute paths)
import { UserService } from '@/services/userService';
import { validateUser } from '@/utils/validation';

// 4. Relative imports
import { User } from '../types/user';
```

## 🚨 **Common Anti-patterns to Avoid**

### **1. Type Safety Issues**
```typescript
// ❌ Avoid: Using 'any'
const data: any = getData();

// ✅ Use: Proper typing
const data: UserData = getData();
```

### **2. Console Statements**
```typescript
// ❌ Avoid: Console in production code
console.log('User created:', user);

// ✅ Use: Proper logging
logger.info('User created', { userId: user.id });
```

### **3. Unhandled Promises**
```typescript
// ❌ Avoid: Unhandled promises
someAsyncFunction();

// ✅ Use: Proper error handling
someAsyncFunction().catch(error => {
  logger.error('Async operation failed', { error });
});
```

### **4. Magic Numbers**
```typescript
// ❌ Avoid: Magic numbers
if (retryCount > 3) { /* ... */ }

// ✅ Use: Named constants
const MAX_RETRY_ATTEMPTS = 3;
if (retryCount > MAX_RETRY_ATTEMPTS) { /* ... */ }
```

## 📊 **Quality Metrics**

### **Code Coverage Targets**
- **Unit Tests**: 80% minimum
- **Integration Tests**: 70% minimum
- **Critical Paths**: 95% minimum

### **Performance Targets**
- **Response Time**: < 200ms for API endpoints
- **Memory Usage**: < 100MB for typical operations
- **Database Queries**: < 50ms average

### **Security Targets**
- **Vulnerability Scan**: 0 critical/high issues
- **Dependency Audit**: 0 known vulnerabilities
- **Code Security**: 0 security anti-patterns

## 🔄 **Continuous Improvement**

### **1. Regular Reviews**
- Weekly code quality reviews
- Monthly security audits
- Quarterly performance analysis

### **2. Automated Checks**
- CI/CD pipeline integration
- Automated dependency updates
- Security scanning in pipeline

### **3. Team Training**
- TypeScript best practices
- Security awareness
- Performance optimization

---

**📋 Remember**: These standards ensure code quality, maintainability, and security. Follow them consistently for the best development experience.
