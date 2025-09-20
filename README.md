# Polkadot SSO

> 🚀 **Currently in Beta** - See [BETA_STATUS.md](BETA_STATUS.md) for current status and limitations

**Polkadot SSO server for authentication and wallet management**

A production-ready SSO server for Polkadot ecosystem applications, providing secure authentication, session management, and wallet integration with enterprise-grade security features.

## Features

- 🔐 **Multiple Wallet Support**: Polkadot.js, Talisman, SubWallet, Nova Wallet, Telegram
- 🛡️ **SIWE-Style Authentication**: Secure, standardized authentication flow
- 📱 **Mobile Support**: QR code authentication for mobile wallets
- 🔄 **Session Management**: JWT-based session handling
- 🗄️ **Database Integration**: SQLite and Redis support
- 📊 **Audit Logging**: Comprehensive security audit trails
- 🔒 **Security Features**: Rate limiting, CSRF protection, encryption

## Quick Start

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

## Packages

- **`@polkadot-auth/sso`** - SSO server implementation
- **`@polkadot-auth/telegram`** - Telegram authentication provider

## Dependencies

This package depends on the shared components from `@polkadot-auth/shared`:

- **`@polkadot-auth/core`** - Core authentication logic and types

## API Endpoints

- `POST /auth/challenge` - Create authentication challenge
- `GET /auth/status/:challengeId` - Check challenge status
- `POST /auth/verify` - Verify signature and create session
- `POST /auth/signout` - Sign out and destroy session
- `GET /auth/session` - Get current session info

## Development

```bash
npm install
npm run build
npm run test
npm run sso:dev
```

## License

MIT License
