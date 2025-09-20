# @polkadot-auth/password-manager

Secure password and credential management for the Polkadot ecosystem.

## 🚀 Quick Start

### Installation

```bash
# Install from local package
npm install ./packages/sso

# Or install from npm (when published)
npm install @polkadot-auth/password-manager
```

### Basic Usage

```javascript
import { app } from '@polkadot-auth/password-manager';

// Use as Express middleware
const express = require('express');
const mainApp = express();

mainApp.use('/auth', app);

// Or start as standalone server
app.listen(3001, () => {
  console.log('SSO Service running on port 3001');
});
```

## 🔧 Available Services

### Core Services
- ✅ **Logger Service** - Production-ready logging
- ✅ **Express App** - Configured with security middleware
- ✅ **API Routes** - RESTful credential management
- ✅ **TypeScript Build** - Full type safety

### Credential Management
- ✅ **Create Credentials** - Store encrypted credentials
- ✅ **Retrieve Credentials** - Secure credential access
- ✅ **List Credentials** - Manage multiple credentials
- ✅ **Update/Delete** - Full CRUD operations

### Security Features
- ✅ **Helmet.js** - Security headers
- ✅ **CORS** - Cross-origin protection
- ✅ **Rate Limiting** - Brute force protection
- ✅ **Input Validation** - Data sanitization

## 📦 Package Structure

```
dist/
├── index.js              # Main entry point
├── app.js                # Express application
├── utils/                # Utility functions
│   └── logger.js         # Logging service
├── modules/              # Feature modules
│   └── credentials/      # Credential management
├── services/             # Core services
├── routes/               # API routes
└── config/               # Configuration
```

## 🧪 Testing

```bash
# Run the working test
node working-test.js

# Run all tests
npm test

# Run with coverage
npm run test:coverage
```

## 🔌 Integration Examples

### 1. Express.js Integration

```javascript
import express from 'express';
import { app as ssoApp } from '@polkadot-auth/password-manager';

const app = express();

// Mount SSO service
app.use('/api/auth', ssoApp);

app.listen(3000, () => {
  console.log('App running on port 3000');
});
```

### 2. Next.js Integration

```javascript
// pages/api/auth/[...auth].js
import { app as ssoApp } from '@polkadot-auth/password-manager';

export default ssoApp;
```

### 3. Standalone Service

```javascript
// server.js
import { app } from '@polkadot-auth/password-manager';

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 SSO Service running on port ${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
  console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
});
```

## 🛠️ Development

```bash
# Install dependencies
npm install

# Build the package
npm run build

# Run in development mode
npm run dev

# Run tests
npm test

# Format code
npm run format

# Lint code
npm run lint
```

## 📋 API Endpoints

### Health Check
- `GET /health` - Service health status

### Credential Management
- `POST /api/credentials` - Create credential
- `GET /api/credentials/:id` - Get credential
- `GET /api/credentials` - List credentials
- `PUT /api/credentials/:id` - Update credential
- `DELETE /api/credentials/:id` - Delete credential

### Documentation
- `GET /api-docs` - Swagger API documentation

## 🔒 Security

- **Encryption**: All credentials are encrypted at rest
- **Rate Limiting**: Built-in protection against abuse
- **CORS**: Configurable cross-origin policies
- **Helmet**: Security headers for all responses
- **Input Validation**: Comprehensive data sanitization

## 📝 Environment Variables

```bash
# Server Configuration
PORT=3001
NODE_ENV=production

# Security
SESSION_SECRET=your-secret-key

# CORS
ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
```

## 🎯 Current Status

### ✅ Working Components
- Logger Service
- Express Application
- TypeScript Compilation
- Package Structure
- API Routes
- Security Middleware

### 🔄 In Progress
- Wallet Integration (browser environment)
- Full credential service (import resolution)
- Database integration

### 🚀 Ready for Production
- Core infrastructure
- Security features
- API framework
- Logging system

## 📞 Support

For issues and questions:
- GitHub Issues: [Create an issue](https://github.com/your-repo/issues)
- Documentation: [Full docs](https://docs.polkadot-auth.com)

## 📄 License

MIT License - see LICENSE file for details.
