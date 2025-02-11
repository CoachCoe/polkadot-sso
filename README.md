# Polkadot SSO Service

A secure Single Sign-On (SSO) service that uses Polkadot wallet signatures for authentication. Implements OAuth 2.0 with PKCE (Proof Key for Code Exchange) for enhanced security.

## Features

- Polkadot wallet-based authentication
- OAuth 2.0 with PKCE flow
- Message signing with Polkadot.js extension
- Secure token exchange
- Rate limiting and security headers
- SQLite database for persistence

## Security Features

- PKCE challenge-response verification
- State parameter validation
- Authorization code flow (no tokens in URLs)
- Rate limiting on authentication endpoints
- Content Security Policy (CSP) headers
- CORS protection
- Secure session management

## Prerequisites

- Node.js (v14 or higher)
- Polkadot{.js} extension installed in browser
- SQLite3

## Installation
Clone the repository
git clone https://github.com/yourusername/polkadot-sso.git

Install dependencies
cd polkadot-sso
npm install

Build the project
npm run build

Start the server
npm start

## Configuration

Create a `.env` file in the root directory with the following variables:

## Usage

### 1. Client Registration
Register your application to get client credentials:

curl -X POST http://localhost:3000/api/clients/register \
-H "Content-Type: application/json" \
-d '{
"name": "My App",
"redirect_urls": ["http://localhost:3001/callback"],
"allowed_origins": ["http://localhost:3001"]
}'


### 2. Authentication Flow

1. Redirect users to the login endpoint:
http://localhost:3000/login?client_id=your-client-id

2. User connects their Polkadot wallet

3. User signs the challenge message

4. Service redirects back with authorization code:
http://your-redirect-url?code=auth-code&state=state-value

5. Exchange code for tokens:
curl -X POST http://localhost:3000/token \
-H "Content-Type: application/json" \
-d '{
"code": "auth-code",
"client_id": "your-client-id",
"client_secret": "your-client-secret"
}'

## Database Schema

## API Endpoints

### 1. Client Registration
- Challenges table for PKCE authentication
CREATE TABLE challenges (
id TEXT PRIMARY KEY,
message TEXT NOT NULL,
client_id TEXT NOT NULL,
created_at INTEGER NOT NULL,
expires_at INTEGER NOT NULL,
code_verifier TEXT NOT NULL,
code_challenge TEXT NOT NULL,
state TEXT NOT NULL,
used BOOLEAN NOT NULL DEFAULT 0
);
-- Authorization codes for token exchange
CREATE TABLE auth_codes (
code TEXT PRIMARY KEY,
address TEXT NOT NULL,
client_id TEXT NOT NULL,
created_at INTEGER NOT NULL,
expires_at INTEGER NOT NULL,
used BOOLEAN NOT NULL DEFAULT 0
);

## Development
Run in development mode with hot reload
npm run dev

Build client-side TypeScript
npx tsc -p tsconfig.client.json
Build server-side TypeScript
npx tsc

## Security Considerations
kens are never exposed in URLs
- PKCE prevents authorization code interception attacks
- State parameter prevents CSRF attacks
- Rate limiting prevents brute force attempts
- CSP headers prevent XSS attacks
- CORS protects against unauthorized origins

## License
MIT
