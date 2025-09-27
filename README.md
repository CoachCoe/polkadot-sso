# Polkadot SSO

> 🚀 **Production-Ready SSO Service** for the Polkadot ecosystem

A comprehensive Single Sign-On (SSO) service designed specifically for Polkadot and Substrate applications, providing secure authentication, session management, and wallet integration with enterprise-grade security features.

## ✨ Features

- 🔐 **Multiple Provider Support**: Polkadot.js Extension, Google OAuth2
- 🛡️ **SIWE-Style Authentication**: Secure, standardized authentication flow
- 📱 **Mobile Support**: QR code authentication for mobile wallets
- 🔄 **Session Management**: JWT-based session handling with refresh tokens
- 🗄️ **Database Integration**: SQLite and Redis support
- 📊 **Audit Logging**: Comprehensive security audit trails
- ⚡ **PAPI Integration**: Alternative blockchain client with light client support
- 🔗 **Deep Linking**: Native mobile wallet integration
- 🔒 **Security Features**: Rate limiting, CSRF protection, encryption
- 🌐 **Framework Adapters**: Express, Next.js, Remix support

## 🔐 Supported Authentication Providers

### 1. **Polkadot.js Extension** (Browser)
- **Type**: Browser extension wallet
- **Flow**: Challenge-response with message signing
- **Use Case**: Desktop web applications
- **Setup**: Users install Polkadot.js extension

### 2. **Google OAuth2** (Web)
- **Type**: OAuth2 provider
- **Flow**: OAuth2 authorization code flow
- **Use Case**: Web applications, zero setup for users
- **Setup**: Configure Google OAuth2 credentials


### 4. **PAPI Integration** (Blockchain)
- **Type**: Alternative blockchain client
- **Flow**: Enhanced signature verification
- **Use Case**: Production applications requiring better performance
- **Setup**: Configure PAPI endpoints

## 🚀 Quick Start

### Installation

```bash
bun install
bun run dev
```

## 📚 API Endpoints

### Core Authentication
- `GET /api/auth/challenge` - Create authentication challenge
- `GET /api/auth/status/:challengeId` - Check challenge status
- `POST /api/auth/verify` - Verify signature and create session
- `POST /api/auth/token` - Exchange authorization code for tokens
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Sign out and destroy session
- `GET /api/auth/session` - Get current session info

### Google OAuth2
- `GET /api/auth/google/challenge` - Generate Google OAuth2 challenge
- `GET /api/auth/google/callback` - Handle Google OAuth2 callback
- `POST /api/auth/google/verify` - Verify Google OAuth2 authorization code


### PAPI Integration
- `POST /api/auth/papi/verify` - Verify signature using PAPI
- `GET /api/auth/papi/account/:address` - Get account info using PAPI
- `GET /api/auth/papi/status` - Get PAPI service status
- `GET /api/auth/papi/chains` - Get available chains

### System
- `GET /health` - Health check endpoint
- `GET /api-docs` - API documentation

## 🔧 Configuration

The SSO service can be configured through environment variables:

### Core Configuration
```bash
PORT=3001
NODE_ENV=development
JWT_SECRET=your-secret-key
DATABASE_URL=sqlite:./data/sso.db
REDIS_URL=redis://localhost:6379
```

### Google OAuth2 Configuration
```bash
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3001/api/auth/google/callback
```


### PAPI Configuration
```bash
PAPI_POLKADOT_RPC=wss://polkadot-rpc.polkadot.io
PAPI_KUSAMA_RPC=wss://kusama-rpc.polkadot.io
PAPI_LIGHT_CLIENT_ENABLED=true
PAPI_FALLBACK_TO_POLKADOT_JS=true
```

## 📖 Usage Examples

### Google OAuth2 Authentication
```javascript
// Generate Google OAuth2 challenge
const response = await fetch('/api/auth/google/challenge?client_id=demo-client');
const { auth_url, challenge_id } = await response.json();

// Redirect user to Google OAuth2
window.location.href = auth_url;

// Handle callback (automatic redirect)
// User will be redirected to /api/auth/google/callback with authorization code
```


### PAPI Signature Verification
```javascript
// Verify signature using PAPI
const response = await fetch('/api/auth/papi/verify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: 'Sign in to Polkadot SSO',
    signature: '0x...',
    address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
    chain: 'polkadot'
  })
});

const { isValid, method } = await response.json();
console.log(`Signature verification: ${isValid} (method: ${method})`);
```

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests to our repository.

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions, please open an issue on our GitHub repository.
