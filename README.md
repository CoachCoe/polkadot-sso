# Polkadot SSO

> 🚀 **Production-Ready SSO Service** for the Polkadot ecosystem

A comprehensive Single Sign-On (SSO) service designed specifically for Polkadot and Substrate applications, providing secure authentication, session management, and wallet integration with enterprise-grade security features.

## ✨ Features

- 🔐 **Multiple Wallet Support**: Polkadot.js, Talisman, SubWallet, Nova Wallet, Telegram
- 🛡️ **SIWE-Style Authentication**: Secure, standardized authentication flow
- 📱 **Mobile Support**: QR code authentication for mobile wallets
- 🔄 **Session Management**: JWT-based session handling with refresh tokens
- 🗄️ **Database Integration**: SQLite and Redis support
- 📊 **Audit Logging**: Comprehensive security audit trails
- 🔒 **Security Features**: Rate limiting, CSRF protection, encryption
- 🌐 **Framework Adapters**: Express, Next.js, Remix support

## 🚀 Quick Start

### Installation

```bash
npm install @polkadot-auth/sso
```

### Basic Usage

```typescript
import { createSSOServer } from '@polkadot-auth/sso';

const ssoServer = createSSOServer({
  port: 3001,
  cors: { origin: ['http://localhost:3000'] },
  database: { type: 'sqlite', path: './data/sso.db' },
});

ssoServer.start();
```

## 📦 Packages

- **`@polkadot-auth/sso`** - Main SSO server implementation
- **`@polkadot-auth/core`** - Core authentication logic and types
- **`@polkadot-auth/telegram`** - Telegram authentication provider

## 🔗 Related Projects

- **`@polkadot-auth/password-manager`** - Separate password management system
- **`@polkadot-auth/shared`** - Shared authentication components

## 📚 API Endpoints

- `POST /api/auth/challenge` - Create authentication challenge
- `GET /api/auth/status/:challengeId` - Check challenge status
- `POST /api/auth/verify` - Verify signature and create session
- `POST /api/auth/signout` - Sign out and destroy session
- `GET /api/auth/session` - Get current session info
- `GET /health` - Health check endpoint
- `GET /api-docs` - API documentation

## 🛠️ Development

```bash
# Install dependencies
npm install

# Build all packages
npm run build

# Run tests
npm test

# Start development server
npm run sso:dev
```

## 🔧 Configuration

The SSO service can be configured through environment variables:

```bash
PORT=3001
NODE_ENV=development
JWT_SECRET=your-secret-key
DATABASE_URL=sqlite:./data/sso.db
REDIS_URL=redis://localhost:6379
```

## 📖 Documentation

- [API Documentation](http://localhost:3001/api-docs) - Interactive API docs
- [Security Guide](docs/SECURITY.md) - Security best practices
- [Deployment Guide](docs/PRODUCTION_DEPLOYMENT.md) - Production deployment
- [Integration Examples](examples/) - Framework integration examples

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests to our repository.

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions, please open an issue on our GitHub repository.
