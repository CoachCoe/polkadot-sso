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
bun install
bun run dev
```

## 📚 API Endpoints

- `POST /api/auth/challenge` - Create authentication challenge
- `GET /api/auth/status/:challengeId` - Check challenge status
- `POST /api/auth/verify` - Verify signature and create session
- `POST /api/auth/signout` - Sign out and destroy session
- `GET /api/auth/session` - Get current session info
- `GET /health` - Health check endpoint
- `GET /api-docs` - API documentation

## 🔧 Configuration

The SSO service can be configured through environment variables:

```bash
PORT=3001
NODE_ENV=development
JWT_SECRET=your-secret-key
DATABASE_URL=sqlite:./data/sso.db
REDIS_URL=redis://localhost:6379
```

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests to our repository.

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions, please open an issue on our GitHub repository.
