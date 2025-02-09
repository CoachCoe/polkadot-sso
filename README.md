 # Polkadot SSO Demo

A simple Single Sign-On (SSO) implementation using Polkadot wallet authentication. This demo shows how web applications can authenticate users using their Polkadot wallet addresses instead of traditional username/password combinations.

## Features
- Wallet-based authentication using Polkadot.js extension
- Challenge-response authentication pattern
- JWT token issuance
- Basic demo client application
- SQLite storage for challenges and sessions

## Prerequisites
- Node.js installed
- Polkadot{.js} extension installed in your browser ([Get it here](https://polkadot.js.org/extension/))
- At least one account created in your Polkadot.js extension

## Project Structure
polkadot-sso/
├── package.json
├── sso-service.js    # Main SSO service
├── demo-app.js       # Demo client application
└── sso.db           # SQLite database (created automatically)

## Sequence Diagram
    participant User as User+Wallet
    participant App as Demo App
    participant SSO as SSO Service
    participant DB as SQLite
    
    App->>SSO: 1. GET /login?client_id=demo-app
    SSO->>User: 2. Display wallet connect button
    User->>SSO: 3. Connect Polkadot wallet
    SSO->>DB: 4. Generate & store challenge
    SSO->>User: 5. Display challenge for signing
    User->>SSO: 6. Sign challenge with wallet
    SSO->>DB: 7. Store session
    SSO->>App: 8. Redirect with JWT token
    App->>User: 9. Display success with token

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd polkadot-sso

npm init -y
npm install express @polkadot/util-crypto jsonwebtoken sqlite3 sqlite cors

Usage

Visit http://localhost:3001 in your browser
Click "Login with Polkadot"
Connect your wallet when prompted
Sign the challenge message
You'll receive a JWT token upon successful authentication

Current Implementation Details
SSO Service (Port 3000)

/login - Initiates the wallet connection
/challenge - Generates a challenge for signing
/verify - Verifies the signature and issues JWT

Demo App (Port 3001)

/ - Home page with SSO login link
/callback - Receives and displays the JWT token

Security Notes

This is a demonstration implementation
Uses basic JWT without refresh tokens
Stores data in SQLite for simplicity
Challenge messages have no expiration
No rate limiting implemented

Next Steps

Implement proper session management
Add token expiration and refresh
Add client application registration
Implement proper signature verification
Add rate limiting
Add security headers
Add proper error handling

Contributing
This is a basic implementation meant for demonstration purposes. Feel free to extend it with additional features or security improvements.

## License

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.