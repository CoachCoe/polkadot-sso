# Polkadot SSO

> 🚀 **Production-Ready SSO Service** for the Polkadot ecosystem

A comprehensive Single Sign-On (SSO) service designed specifically for Polkadot and Substrate applications, providing secure authentication, session management, and wallet integration with enterprise-grade security features.

## ✨ Features

- 🔐 **Polkadot.js Integration**: Secure wallet-based authentication
- 📱 **Telegram Authentication**: Bot-based authentication with signature verification
- 🔍 **Google OAuth 2.0**: Standard OAuth 2.0 authentication with PKCE security
- ⛓️ **PAPI Integration**: Polkadot API connectivity for multi-chain operations
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

### Google OAuth 2.0 Authentication
- `GET /api/auth/google/challenge` - Create Google OAuth challenge with PKCE
- `POST /api/auth/google/challenge` - Create Google OAuth challenge (JSON response)
- `GET /api/auth/google/callback` - Handle Google OAuth callback
- `POST /api/auth/google/verify` - Alternative verification endpoint
- `GET /api/auth/google/status/:challengeId` - Check Google OAuth challenge status

### PAPI (Polkadot API) Integration
- `GET /api/papi/status` - Get PAPI service status
- `GET /api/papi/chains` - List all available chains
- `GET /api/papi/chains/:chainName` - Get specific chain information
- `GET /api/papi/chains/:chainName/balance/:address` - Get account balance
- `GET /api/papi/chains/:chainName/account/:address` - Get account information

### System
- `GET /health` - Health check endpoint
- `GET /api-docs` - API documentation

## 🏆 Recent Improvements

### PAPI Integration
- **Multi-Chain Support**: Full Polkadot ecosystem connectivity (Kusama, Polkadot, Westend, Asset Hub)
- **Real Blockchain Data**: Live account balances, nonce, and chain information
- **WebSocket Connections**: Efficient connection pooling with automatic reconnection
- **Database Integration**: Persistent storage of chain data and account information
- **Security**: Rate limiting and audit logging for all blockchain operations

### Code Quality Enhancements
- **Standardized Response Format**: Consistent API response structure across all endpoints
- **Configuration Constants**: Centralized configuration management
- **Enhanced Error Handling**: Comprehensive error patterns with proper logging
- **Modular Architecture**: Clean separation of concerns and reusable components
- **Type Safety**: Full TypeScript coverage with strict type checking
- **Stateless Design**: No server-side session storage, JWT-based authentication

### Security Improvements
- **Cryptographic Utilities**: Comprehensive crypto functions with security warnings
- **Enhanced Security Middleware**: Improved CSP, CORS, and security headers
- **Database Security**: Proper connection management and SQL injection prevention
- **Security Audit Logging**: Suspicious pattern detection and monitoring
- **Input Validation**: Comprehensive sanitization and validation
- **Blockchain Security**: Secure WebSocket connections with proper error handling

### Production Readiness
- **Resource Management**: Proper connection cleanup and leak prevention
- **Performance Optimization**: Efficient database connection pooling
- **Monitoring**: Comprehensive logging and error tracking
- **Documentation**: Detailed code review and improvement documentation
- **Real Implementation**: 100% production-ready code with no mocks or stubs

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

# Google OAuth Configuration (optional)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3001/api/auth/google/callback
GOOGLE_AUTH_TIMEOUT=300
GOOGLE_SCOPES=openid,email,profile
```

## 🎯 Unified Authentication Experience

The SSO service now provides a unified authentication page that allows users to choose between different authentication methods:

### Authentication Selection Page

Visit `/api/auth/select?client_id=your_client` to access the unified authentication page where users can choose between:

- **🟣 Polkadot.js**: For users with the browser extension
- **📱 Telegram**: For users who prefer social login
- **🔍 Google**: For users who want standard OAuth 2.0 authentication

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

## 🔍 Google OAuth 2.0 Setup

To enable Google OAuth authentication, you need to create a Google Cloud project and configure OAuth 2.0 credentials:

### 1. Create Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API or Google Identity services
4. Go to "Credentials" in the API & Services section

### 2. Create OAuth 2.0 Credentials

1. Click "Create Credentials" → "OAuth 2.0 Client IDs"
2. Choose "Web application" as the application type
3. Add authorized redirect URIs:
   - `http://localhost:3001/api/auth/google/callback` (for development)
   - `https://yourdomain.com/api/auth/google/callback` (for production)
4. Save the client ID and client secret

### 3. Configure Environment Variables

Add the following environment variables to your `.env` file:

```bash
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3001/api/auth/google/callback
GOOGLE_AUTH_TIMEOUT=300
GOOGLE_SCOPES=openid,email,profile
```

### 4. Google OAuth Flow

The Google OAuth authentication flow works as follows:

1. User visits `/api/auth/google/challenge?client_id=your_client`
2. User is redirected to Google OAuth consent screen
3. User grants permissions to your application
4. Google redirects back with authorization code
5. Server exchanges code for tokens and creates a session

### 5. Security Features

- **PKCE (Proof Key for Code Exchange)**: Enhanced security for public clients
- **State Parameter**: CSRF protection with random state tokens
- **Nonce Validation**: Replay attack prevention
- **Token Verification**: Proper validation of Google ID tokens using official Google Auth Library
- **Scope Management**: Minimal required scopes (openid, email, profile)
- **Database Connection Pooling**: Efficient database operations with proper connection management
- **Stateless Design**: No server-side session storage, JWT-based authentication

## ⛓️ PAPI (Polkadot API) Integration

The PAPI integration provides blockchain connectivity and data access for multiple Polkadot ecosystem chains.

### Supported Chains

- **Kusama**: Kusama Relay Chain
- **Polkadot**: Polkadot Relay Chain  
- **Westend**: Westend Testnet
- **Asset Hub**: Polkadot Asset Hub

### PAPI Configuration

Add the following environment variables to enable PAPI integration:

```bash
# Enable PAPI integration
PAPI_ENABLED=true

# PAPI service configuration
PAPI_DEFAULT_TIMEOUT=30000
PAPI_MAX_RETRIES=3
PAPI_CONNECTION_POOL_SIZE=5
PAPI_ENABLE_EVENT_STREAMING=false
PAPI_ENABLE_TRANSACTION_TRACKING=true

# Chain-specific RPC endpoints
KUSAMA_RPC_URL=wss://kusama-rpc.polkadot.io
POLKADOT_RPC_URL=wss://rpc.polkadot.io
WESTEND_RPC_URL=wss://westend-rpc.polkadot.io
ASSET_HUB_RPC_URL=wss://polkadot-asset-hub-rpc.polkadot.io
```

### PAPI Features

- **Multi-Chain Support**: Connect to multiple Polkadot ecosystem chains
- **Account Information**: Retrieve account balances, nonce, and metadata
- **Chain Information**: Get chain details, version, and connection status
- **Database Integration**: Store chain data and account information
- **Connection Pooling**: Efficient WebSocket connection management
- **Error Handling**: Comprehensive error handling with proper logging
- **Security**: Rate limiting and audit logging for all PAPI requests

### PAPI Usage Examples

```bash
# Get service status
curl "http://localhost:3001/api/papi/status?client_id=demo-client"

# List available chains
curl "http://localhost:3001/api/papi/chains?client_id=demo-client"

# Get chain information
curl "http://localhost:3001/api/papi/chains/kusama?client_id=demo-client"

# Get account balance
curl "http://localhost:3001/api/papi/chains/kusama/balance/5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY?client_id=demo-client"

# Get account information
curl "http://localhost:3001/api/papi/chains/kusama/account/5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY?client_id=demo-client"
```

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests to our repository.

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions, please open an issue on our GitHub repository.
