# Polkadot SSO Demo

A simple Single Sign-On (SSO) implementation using Polkadot wallet authentication. This demo shows how web applications can authenticate users using their Polkadot wallet addresses instead of traditional username/password combinations.

## Features
- Wallet-based authentication using Polkadot.js extension
- Challenge-response authentication pattern with expiration
- Secure JWT token issuance with proper signing and fingerprinting
- Enhanced session management and tracking
- Basic demo client application
- SQLite storage for challenges and sessions
- Rate limiting and security headers
- Content Security Policy (CSP) implementation

## Prerequisites
- Node.js installed
- Polkadot{.js} extension installed in your browser ([Get it here](https://polkadot.js.org/extension/))
- At least one account created in your Polkadot.js extension

## Project Structure
polkadot-sso/
├── package.json
├── sso-service.js    # Main SSO service
├── demo-app.js       # Demo client application
├── .env             # Environment configuration
├── public/          # Static files
│   ├── login.js     # Wallet connection logic
│   └── challenge.js # Challenge signing logic
└── sso.db           # SQLite database (created automatically)

## Installation

git clone https://github.com/CoachCoe/polkadot-sso.git
cd polkadot-sso

# Install dependencies:
npm init -y
npm install express @polkadot/util-crypto jsonwebtoken sqlite3 sqlite cors helmet express-rate-limit dotenv crypto

# Create a .env file:
JWT_SECRET=<your-generated-secret> (for now this is just require('crypto').randomBytes(64).toString('hex')) 
CLIENT_WHITELIST=http://localhost:3001
DATABASE_PATH=./sso.db
NODE_ENV=development

## Start the services:
node sso-service.js

# In another terminal, start the demo app
node demo-app.js

Security Features
Challenge Security

5-minute challenge expiration
Single-use challenges
Cryptographic nonce generation
UUID-based challenge tracking

Enhanced Token Security
JWT tokens with HS512 algorithm signing
Token fingerprinting for enhanced security
Access tokens (15 minutes) and refresh tokens (7 days)
Token type enforcement and verification
Session-bound token tracking
Token ID (jti) claim for uniqueness
Token replay attack prevention

Session Management
Comprehensive session tracking
Fingerprint validation
Last activity tracking
Active session status monitoring
Token refresh management
Session cleanup and expiration

API Protection
Rate limiting (5 attempts/15 minutes)
CORS configuration
Helmet.js security headers
Content Security Policy (CSP)

Database Security
Prepared statements (SQL injection prevention)
Indexed queries
Enhanced session and token tracking
Comprehensive error handling and logging
Token status tracking

Current Implementation Details
SSO Service (Port 3000)

/login - Initiates the wallet connection
/challenge - Generates a challenge for signing
/verify - Verifies the signature and issues JWT with fingerprinting
/refresh - Handles secure token refresh with validation

Demo App (Port 3001)

/ - Home page with SSO login link
/callback - Receives and displays the JWT token with refresh capability

Next Steps
Add single sign-out capability
Implement scope-based access control
Add user profile management
Add account linking capabilities
Implement token blacklisting
Add session revocation capabilities

Contributing
This is a basic implementation meant for demonstration purposes. Feel free to extend it with additional features or security improvements.
License
Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at:
http://www.apache.org/licenses/LICENSE-2.0
Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.