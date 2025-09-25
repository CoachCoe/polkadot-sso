# @polkadot-auth/sso

Secure Single Sign-On (SSO) service for the Polkadot ecosystem.

## 🚀 Quick Start

### Installation

```bash
# Install from local package
npm install ./packages/sso

# Or install from npm (when published)
npm install @polkadot-auth/sso
```

### Basic Usage

```javascript
import { app } from '@polkadot-auth/sso';

// Use as Express middleware
const express = require('express');
const mainApp = express();

mainApp.use('/api/auth', app);

// Or start as standalone server
app.listen(3001, () => {
  console.log('SSO Service running on port 3001');
});
```

## 🔧 Available Services

### Core Services
- ✅ **Logger Service** - Production-ready logging
- ✅ **Express App** - Configured with security middleware
- ✅ **API Routes** - RESTful authentication endpoints
- ✅ **TypeScript Build** - Full type safety

### Authentication Features
- ✅ **Challenge Generation** - Create SIWE-style authentication challenges
- ✅ **Challenge Status** - Check challenge status (pending, expired, used)
- ✅ **Signature Verification** - Verify Polkadot wallet signatures
- ✅ **Token Management** - JWT-based session management
- ✅ **Client Registration** - OAuth-style client management

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
import { app as ssoApp } from '@polkadot-auth/sso';

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
import { app as ssoApp } from '@polkadot-auth/sso';

export default ssoApp;
```

### 3. Standalone Service

```javascript
// server.js
import { app } from '@polkadot-auth/sso';

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 SSO Service running on port ${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
  console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
});
```

### 4. Challenge Status Check

```javascript
// Check challenge status
const response = await fetch('http://localhost:3001/api/auth/status/your-challenge-id');
const status = await response.json();

console.log(status);
// Output: { "status": "pending", "message": "Challenge is pending verification", "expiresAt": 1234567890 }
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

### Authentication
- `GET /api/auth/challenge` - Create authentication challenge
- `GET /api/auth/status/:challengeId` - Check challenge status
- `GET /api/auth/login` - Initiate login flow
- `POST /api/auth/verify` - Verify signature and create session
- `POST /api/auth/token` - Exchange authorization code for tokens
- `POST /api/auth/logout` - Sign out and destroy session
- `GET /api/auth/callback` - OAuth callback handler

### Documentation
- `GET /api-docs` - Swagger API documentation

## 🔒 Security

- **Rate Limiting**: Built-in protection against abuse (30 requests/minute for status endpoint)
- **CORS**: Configurable cross-origin policies
- **Helmet**: Security headers for all responses
- **Input Validation**: Comprehensive data sanitization
- **JWT Tokens**: Secure session management
- **Challenge Expiration**: Time-limited authentication challenges

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
- Authentication API Routes
- Security Middleware
- Challenge Status Endpoint
- Rate Limiting
- Database Integration

### 🚀 Ready for Production
- Core SSO infrastructure
- Security features
- API framework
- Logging system
- Challenge management
- Token management

## 📞 Support

For issues and questions:
- GitHub Issues: [Create an issue](https://github.com/your-repo/issues)
- Documentation: [Full docs](https://docs.polkadot-auth.com)

## 📄 License

MIT License - see LICENSE file for details.
