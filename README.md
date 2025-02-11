# Polkadot SSO Service

A secure Single Sign-On (SSO) service using Polkadot wallets for authentication.

## Features

- 🔐 Secure authentication using Polkadot wallets
- 🔑 OAuth2 PKCE flow for secure authorization
- 🛡️ Advanced security features (CSP, CORS, Rate Limiting)
- 📝 Comprehensive audit logging
- 🔄 Session management with Redis (Production) / Memory Store (Development)
- 🎯 TypeScript for type safety

## Prerequisites

- Node.js (v16 or higher)
- SQLite3
- Redis (for production)

## Installation

1. Clone the repository:
git clone https://github.com/yourusername/polkadot-sso.git
cd polkadot-sso

2. Install dependencies:
npm install

3. Create `.env` file:
Required
SESSION_SECRET=your-secret-here
NODE_ENV=development
JWT_SECRET=your-jwt-secret
DATABASE_ENCRYPTION_KEY=your-db-encryption-key
Optional
PORT=3000
LOG_LEVEL=info
COOKIE_DOMAIN=localhost
CLIENT_WHITELIST=http://localhost:3001
ALLOWED_ORIGINS=http://localhost:3001
Redis (only needed in production)
REDIS_URL=redis://localhost:6379

4. Start the development server:
npm run dev

## Project Structure
public/
├── js/
│   └── client/
│       ├── login.js      # Compiled from src/client/login.ts
│       └── challenge.js  # Compiled from src/client/challenge.ts
├── styles/
│   └── main.css          # Styles for the login/challenge pages
└── favicon.ico           # Optional favicon
src/
├── config/ # Configuration files
├── middleware/ # Express middleware
├── routes/ # API routes
├── services/ # Business logic
├── types/ # TypeScript types
├── utils/ # Utility functions
└── app.ts # Application entry point

## Security Features

- Content Security Policy (CSP)
- CORS protection
- Rate limiting
- Session security
- Input validation and sanitization
- SQL injection protection
- Audit logging

## API Endpoints

### Authentication Flow
- `GET /login` - Initiates login flow
- `GET /challenge` - Generates signing challenge
- `GET /verify` - Verifies signature
- `POST /token` - Exchanges auth code for tokens

### Token Management
- `POST /api/tokens/refresh` - Refresh access token

## Development
Run in development mode
npm run dev
Build the project
npm run build
Run tests
npm test

## Production Deployment
1. Set environment variables
2. Build the project: `npm run build`
3. Start the server: `npm start`

## Contributing
1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License
MIT