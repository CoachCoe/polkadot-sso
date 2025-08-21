# Modular Architecture

This document describes the modular architecture of the Polkadot SSO & Credential Management Service.

## Overview

The application is organized into clear, focused modules that handle specific responsibilities:

- **SSO Core**: Authentication and authorization
- **Credentials Core**: Credential management and lifecycle
- **Storage Core**: IPFS and Kusama storage operations
- **Security Core**: Security infrastructure and monitoring
- **API Gateway**: Route definitions and request orchestration

## Module Structure

```
src/modules/
├── sso/                    # SSO Core Module
│   ├── services/          # Authentication services
│   ├── middleware/        # SSO-specific middleware
│   ├── types/            # SSO type definitions
│   ├── utils/            # SSO utilities
│   └── index.ts          # Module exports
├── credentials/           # Credentials Core Module
│   ├── services/         # Credential services
│   ├── types/            # Credential types
│   ├── utils/            # Credential utilities
│   └── index.ts          # Module exports
├── storage/               # Storage Core Module
│   ├── services/         # Storage services
│   ├── types/            # Storage types
│   ├── utils/            # Storage utilities
│   └── index.ts          # Module exports
├── security/              # Security Core Module
│   ├── middleware/       # Security middleware
│   ├── services/         # Security services
│   ├── types/            # Security types
│   ├── utils/            # Security utilities
│   └── index.ts          # Module exports
├── api/                   # API Gateway Module
│   ├── routes/           # Route definitions
│   ├── middleware/       # API middleware
│   ├── types/            # API types
│   └── index.ts          # Module exports
├── config.ts              # Module configuration
├── init.ts                # Module initialization
└── index.ts               # Main module exports
```

## Module Dependencies

```
Security Core (1)
├── SSO Core (2)
├── Storage Core (3)
    └── Credentials Core (4)
        └── API Gateway (5)
```

## Module Initialization

Modules are initialized in dependency order:

1. **Security Core** - No dependencies
2. **SSO Core** - Depends on Security
3. **Storage Core** - Depends on Security
4. **Credentials Core** - Depends on Security + Storage
5. **API Gateway** - Depends on all other modules

## Usage

### Importing from modules:

```typescript
// Import specific module
import { challengeService, tokenService } from './modules/sso';
import { credentialService } from './modules/credentials';
import { ipfsService } from './modules/storage';

// Import from main modules index
import {
  challengeService,
  credentialService,
  ipfsService
} from './modules';
```

### Module initialization:

```typescript
import { moduleManager } from './modules/init';

// Register modules
moduleManager.registerModule(securityModule);
moduleManager.registerModule(ssoModule);
moduleManager.registerModule(storageModule);
moduleManager.registerModule(credentialsModule);
moduleManager.registerModule(apiModule);

// Initialize all modules
await moduleManager.initializeModules();
```

## Benefits

### 1. Clear Separation of Concerns
- Each module has a single, well-defined responsibility
- Easy to understand what each module does
- Clear boundaries between different functionality

### 2. Improved Maintainability
- Changes to one module don't affect others
- Easier to locate and fix issues
- Simpler to add new features

### 3. Better Testing
- Each module can be tested independently
- Clearer test boundaries
- Easier to mock dependencies

### 4. Future Flexibility
- Modules can be extracted to separate packages
- Easy to disable specific modules
- Simple to add new modules

## Module Development Guidelines

### 1. Single Responsibility
Each module should have one clear purpose and responsibility.

### 2. Clear Interfaces
Modules should expose clean, well-documented interfaces.

### 3. Dependency Management
Modules should declare their dependencies clearly.

### 4. Error Handling
Modules should handle their own errors and provide meaningful error messages.

### 5. Logging
Modules should use the centralized logging system for consistency.

## Adding New Modules

1. Create the module directory under `src/modules/`
2. Add module configuration to `config.ts`
3. Implement the `ModuleInitializer` interface
4. Register the module with the `ModuleManager`
5. Update this documentation

## Migration Path

The current codebase maintains backward compatibility while introducing the new modular structure:

1. **Phase 1**: Create module structure (current)
2. **Phase 2**: Gradually move existing code to modules
3. **Phase 3**: Update imports to use new module structure
4. **Phase 4**: Remove old file structure

This approach ensures no breaking changes during the transition.
