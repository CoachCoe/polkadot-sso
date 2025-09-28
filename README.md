# Polkadot SSO

> 🚀 **Production-Ready SSO Service** for the Polkadot ecosystem

A comprehensive Single Sign-On (SSO) service designed specifically for Polkadot and Substrate applications, providing secure authentication, session management, and wallet integration with enterprise-grade security features.

## ✨ Features

- 🔐 **Polkadot.js Integration**: Secure wallet-based authentication
- 📱 **Telegram Authentication**: Bot-based authentication with signature verification
- 🛡️ **Challenge-Response Authentication**: Secure, standardized authentication flow
- 🔄 **Session Management**: JWT-based session handling with refresh tokens
- 🗄️ **Database Integration**: SQLite with connection pooling
- 📊 **Audit Logging**: Comprehensive security audit trails
- 🔒 **Security Features**: Rate limiting, CSP, encryption, validation
- 🌐 **Production Ready**: Stateless, scalable, and secure

## 🚀 Quick Start

### Installation

```bash
npm install
npm run dev
```

### Development Standards

- **TypeScript**: Strict type checking enabled
- **Security**: Comprehensive input validation and sanitization  
- **Architecture**: Modular, stateless design
- **Error Handling**: Consistent error patterns with proper logging
- **Testing**: Unit and integration tests for all components

### Security Features

- **Signature Verification**: Cryptographic signature validation (development mode)
- **Rate Limiting**: Protection against brute force attacks
- **Input Sanitization**: XSS and injection attack prevention
- **CORS**: Configurable cross-origin resource sharing
- **CSP**: Content Security Policy headers
- **Audit Logging**: Comprehensive security event tracking

## 📚 API Endpoints

### Authentication
- `GET /api/auth/select` - **NEW**: Unified authentication method selection page
- `GET /api/auth/challenge` - Create authentication challenge
- `GET /api/auth/verify` - Verify signature and create session
- `POST /api/auth/token` - Exchange authorization code for tokens
- `GET /api/auth/session` - Get current session info
- `POST /api/auth/logout` - Sign out and destroy session
- `GET /api/auth/callback` - OAuth callback endpoint

### Telegram Authentication
- `GET /api/auth/telegram/challenge` - Create Telegram authentication challenge
- `GET /api/auth/telegram/status/:challengeId` - Check Telegram challenge status
- `POST /api/auth/telegram/verify` - Verify Telegram authentication data
- `GET /api/auth/telegram/session` - Get Telegram session info
- `POST /api/auth/telegram/logout` - Logout Telegram session
- `GET /api/auth/telegram/callback` - Telegram login widget callback

### System
- `GET /health` - Health check endpoint
- `GET /api-docs` - API documentation

## 🏆 Recent Improvements

### Code Quality Enhancements
- **Standardized Response Format**: Consistent API response structure across all endpoints
- **Configuration Constants**: Centralized configuration management
- **Enhanced Error Handling**: Comprehensive error patterns with proper logging
- **Modular Architecture**: Clean separation of concerns and reusable components
- **Type Safety**: Full TypeScript coverage with strict type checking

### Security Improvements
- **Cryptographic Utilities**: Comprehensive crypto functions with security warnings
- **Enhanced Security Middleware**: Improved CSP, CORS, and security headers
- **Database Security**: Proper connection management and SQL injection prevention
- **Security Audit Logging**: Suspicious pattern detection and monitoring
- **Input Validation**: Comprehensive sanitization and validation

### Production Readiness
- **Resource Management**: Proper connection cleanup and leak prevention
- **Performance Optimization**: Efficient database connection pooling
- **Monitoring**: Comprehensive logging and error tracking
- **Documentation**: Detailed code review and improvement documentation

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

# Telegram Bot Configuration (optional)
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_BOT_USERNAME=your_bot_username
TELEGRAM_AUTH_TIMEOUT=300
TELEGRAM_ALLOWED_DOMAINS=localhost,yourdomain.com
```

## 🎯 Unified Authentication Experience

The SSO service now provides a unified authentication page that allows users to choose between different authentication methods:

### Authentication Selection Page

Visit `/api/auth/select?client_id=your_client` to access the unified authentication page where users can choose between:

- **🟣 Polkadot.js**: For users with the browser extension
- **📱 Telegram**: For users who prefer social login

This provides a seamless user experience with a modern, responsive interface that works on both desktop and mobile devices.

## 📱 Telegram Authentication Setup

To enable Telegram authentication, you need to create a Telegram bot and configure it:

### 1. Create a Telegram Bot

1. Open Telegram and search for `@BotFather`
2. Start a chat with BotFather and send `/newbot`
3. Follow the instructions to create your bot
4. Save the bot token provided by BotFather
5. Set a username for your bot (e.g., `my_sso_bot`)

### 2. Configure Environment Variables

Add the following environment variables to your `.env` file:

```bash
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_BOT_USERNAME=my_sso_bot
TELEGRAM_AUTH_TIMEOUT=300
TELEGRAM_ALLOWED_DOMAINS=localhost,yourdomain.com
```

### 3. Bot Configuration

Your bot should be configured to:
- Accept messages from users
- Handle the `/start` command with parameters
- Redirect users back to your application

### 4. Authentication Flow

1. User visits `/api/auth/telegram/challenge?client_id=your_client`
2. User is redirected to Telegram bot
3. User clicks "Start" in the bot chat
4. Bot redirects user back with authentication data
5. Server verifies the authentication data and creates a session

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests to our repository.

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions, please open an issue on our GitHub repository.
