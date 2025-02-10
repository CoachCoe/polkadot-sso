# Polkadot SSO Demo

A simple Single Sign-On (SSO) implementation using Polkadot wallet authentication. This demo shows how web applications can authenticate users using their Polkadot wallet addresses instead of traditional username/password combinations.

## Features
- Wallet-based authentication using Polkadot.js extension
- Challenge-response authentication pattern with expiration
- Secure JWT token issuance with proper signing
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

## Install dependencies:
npm init -y
npm install express @polkadot/util-crypto jsonwebtoken sqlite3 sqlite cors helmet express-rate-limit dotenv crypto

## Create a .env file:
JWT_SECRET=<your-generated-secret>
CLIENT_WHITELIST=http://localhost:3001
DATABASE_PATH=./sso.db
NODE_ENV=development

## Start the services:
# Start the SSO service
node sso-service.js

# In another terminal, start the demo app
node demo-app.js

## Usage
Visit http://localhost:3001 in your browser
Click "Login with Polkadot"
Connect your wallet when prompted
Sign the challenge message
You'll receive a JWT token upon successful authentication

## Security Features

### Challenge Security
5-minute challenge expiration
Single-use challenges
Cryptographic nonce generation
UUID-based challenge tracking

### Token Security
JWT tokens with proper signing
1-hour token expiration
Client ID and address binding
Session tracking

### API Protection
Rate limiting (5 attempts/15 minutes)
CORS configuration
Helmet.js security headers
Content Security Policy (CSP)

### Database Security
Prepared statements (SQL injection prevention)
Indexed queries
Session and challenge tracking
Error handling and logging

## Current Implementation Details
### SSO Service (Port 3000)
/login - Initiates the wallet connection
/challenge - Generates a challenge for signing
/verify - Verifies the signature and issues JWT

### Demo App (Port 3001)
/ - Home page with SSO login link
/callback - Receives and displays the JWT token

## Next Steps
- Enhance session management
- Add single sign-out capability
- Implement scope-based access control
- Add user profile management
- Add account linking capabilities

## Contributing
This is a basic implementation meant for demonstration purposes. Feel free to extend it with additional features or security improvements.

## License
Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at: 
http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.