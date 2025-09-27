# Polkadot SSO

> 🚀 **Production-Ready SSO Service** for the Polkadot ecosystem

A comprehensive Single Sign-On (SSO) service designed specifically for Polkadot and Substrate applications, providing secure authentication, session management, and wallet integration with enterprise-grade security features.

## ✨ Features

- 🔐 **Polkadot.js Integration**: Secure wallet-based authentication
- 🛡️ **Challenge-Response Authentication**: Secure, standardized authentication flow
- 🔄 **Session Management**: JWT-based session handling with refresh tokens
- 🗄️ **Database Integration**: SQLite with connection pooling
- 📊 **Audit Logging**: Comprehensive security audit trails
- 🔒 **Security Features**: Rate limiting, CSP, encryption, validation
- 🌐 **Production Ready**: Stateless, scalable, and secure

## 🚀 Quick Start

### Installation

```bash
bun install
bun run dev
```

## 📚 API Endpoints

- `GET /api/auth/challenge` - Create authentication challenge
- `GET /api/auth/verify` - Verify signature and create session
- `POST /api/auth/token` - Exchange authorization code for tokens
- `GET /api/auth/session` - Get current session info
- `POST /api/auth/logout` - Sign out and destroy session
- `GET /api/auth/callback` - OAuth callback endpoint
- `GET /health` - Health check endpoint
- `GET /api-docs` - API documentation

## 🔧 Configuration

The SSO service can be configured through environment variables:

```bash
PORT=3001
NODE_ENV=development
JWT_ACCESS_SECRET=your-access-secret-key
JWT_REFRESH_SECRET=your-refresh-secret-key
SESSION_SECRET=your-session-secret-key
DATABASE_ENCRYPTION_KEY=your-32-character-encryption-key
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests to our repository.

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions, please open an issue on our GitHub repository.
