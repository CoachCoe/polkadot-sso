# 🚀 Polkadot SSO Integration Guide for T-REX Demo dApp

This guide shows how to integrate Polkadot SSO authentication into the [T-REX Demo dApp](https://github.com/corey-hathaway/trex-demo-dapp).

## 📋 Integration Options

### Option 1: Direct React Component Integration (Recommended)

Use the pre-built React components from `@polkadot-auth/ui`.

### Option 2: API Integration

Use the SSO API endpoints directly with your existing wallet integration.

### Option 3: Custom Integration

Build a custom integration using the core authentication logic.

## 🛠️ Option 1: React Component Integration

### Step 1: Install Dependencies

```bash
cd frontend
npm install @polkadot-auth/ui @polkadot-auth/core
```

### Step 2: Update Your App Component

```tsx
// src/App.tsx
import React from 'react';
import { PolkadotAuthProvider, PolkadotSignInButton } from '@polkadot-auth/ui';
import { Dashboard } from './components/Dashboard';
import { DeploymentWizard } from './components/DeploymentWizard';

function App() {
  const handleSignIn = (address: string, session: any) => {
    console.log('User authenticated:', address);
    // Store session in your app state
    localStorage.setItem('polkadot-session', JSON.stringify(session));
  };

  const handleError = (error: string) => {
    console.error('Authentication error:', error);
  };

  return (
    <PolkadotAuthProvider
      config={{
        defaultChain: 'polkadot',
        providers: ['polkadot-js', 'talisman'],
        autoConnect: true,
        ssoEndpoint: 'http://localhost:3001', // Your SSO server
      }}
    >
      <div className='app'>
        <Navigation />
        <main>
          <PolkadotSignInButton
            onSignIn={handleSignIn}
            onError={handleError}
            className='trex-signin-button'
          >
            Connect Wallet to Deploy Tokens
          </PolkadotSignInButton>

          {/* Your existing components */}
          <Dashboard />
          <DeploymentWizard />
        </main>
      </div>
    </PolkadotAuthProvider>
  );
}

export default App;
```

### Step 3: Add Custom Styling

```css
/* src/styles/auth.css */
.trex-signin-button {
  background: linear-gradient(135deg, #e6007a, #ff6b35);
  border: none;
  border-radius: 12px;
  padding: 16px 32px;
  color: white;
  font-weight: 600;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(230, 0, 122, 0.3);
}

.trex-signin-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(230, 0, 122, 0.4);
}

.polkadot-auth-connected {
  background: #f8fafc;
  border: 2px solid #e6007a;
  border-radius: 12px;
  padding: 16px;
  text-align: center;
}

.polkadot-auth-address {
  font-family: 'Courier New', monospace;
  font-weight: 600;
  color: #1a202c;
}
```

## 🔌 Option 2: API Integration

### Step 1: Create Authentication Service

```typescript
// src/services/authService.ts
export class PolkadotAuthService {
  private ssoEndpoint: string;
  private clientId: string;

  constructor(ssoEndpoint: string, clientId: string) {
    this.ssoEndpoint = ssoEndpoint;
    this.clientId = clientId;
  }

  async initiateLogin(address: string): Promise<{
    challengeId: string;
    message: string;
    codeVerifier: string;
    state: string;
  }> {
    const response = await fetch(
      `${this.ssoEndpoint}/login?client_id=${this.clientId}&address=${address}`
    );

    if (!response.ok) {
      throw new Error('Failed to initiate login');
    }

    return response.json();
  }

  async verifySignature(
    signature: string,
    challengeId: string,
    address: string,
    codeVerifier: string,
    state: string
  ): Promise<string> {
    const response = await fetch(`${this.ssoEndpoint}/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        signature,
        challenge_id: challengeId,
        address,
        code_verifier: codeVerifier,
        state,
      }),
    });

    if (!response.ok) {
      throw new Error('Signature verification failed');
    }

    const result = await response.text();
    // Extract auth code from response
    const url = new URL(result);
    return url.searchParams.get('code') || '';
  }

  async exchangeCodeForTokens(authCode: string): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }> {
    const response = await fetch(`${this.ssoEndpoint}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code: authCode,
        client_id: this.clientId,
        client_secret: 'your-client-secret', // In production, use env var
        redirect_uri: window.location.origin + '/callback',
      }),
    });

    if (!response.ok) {
      throw new Error('Token exchange failed');
    }

    return response.json();
  }
}
```

### Step 2: Integrate with Your Wallet Connection

```typescript
// src/hooks/usePolkadotAuth.ts
import { useState } from 'react';
import { PolkadotAuthService } from '../services/authService';

export function usePolkadotAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const authService = new PolkadotAuthService('http://localhost:3001', 'trex-demo-app');

  const authenticate = async (
    address: string,
    signMessage: (message: string) => Promise<string>
  ) => {
    setIsLoading(true);

    try {
      // Step 1: Get challenge from SSO server
      const challenge = await authService.initiateLogin(address);

      // Step 2: Sign the message with wallet
      const signature = await signMessage(challenge.message);

      // Step 3: Verify signature with SSO server
      const authCode = await authService.verifySignature(
        signature,
        challenge.challengeId,
        address,
        challenge.codeVerifier,
        challenge.state
      );

      // Step 4: Exchange auth code for tokens
      const tokens = await authService.exchangeCodeForTokens(authCode);

      // Step 5: Store session
      const userSession = {
        address,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: Date.now() + tokens.expires_in * 1000,
      };

      setSession(userSession);
      setIsAuthenticated(true);
      localStorage.setItem('trex-session', JSON.stringify(userSession));
    } catch (error) {
      console.error('Authentication failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setSession(null);
    setIsAuthenticated(false);
    localStorage.removeItem('trex-session');
  };

  return {
    isAuthenticated,
    session,
    isLoading,
    authenticate,
    logout,
  };
}
```

## 🎨 Option 3: Custom Integration with Existing Components

### Update Your Existing Wallet Connection

```typescript
// src/components/WalletConnection.tsx
import React, { useState } from 'react';
import { usePolkadotAuth } from '../hooks/usePolkadotAuth';

export function WalletConnection() {
  const [address, setAddress] = useState<string | null>(null);
  const { isAuthenticated, session, authenticate, logout, isLoading } = usePolkadotAuth();

  const connectWallet = async () => {
    try {
      // Your existing wallet connection logic
      const accounts = await window.polkadotExtensionDapp.web3Enable('T-REX Demo');
      const account = accounts[0];
      setAddress(account.address);

      // Get signer
      const injector = await window.polkadotExtensionDapp.web3FromAddress(account.address);

      // Authenticate with SSO
      await authenticate(account.address, async (message: string) => {
        const { signature } = await injector.signer.signRaw({
          address: account.address,
          data: message,
          type: 'bytes',
        });
        return signature;
      });

    } catch (error) {
      console.error('Connection failed:', error);
    }
  };

  if (isAuthenticated && session) {
    return (
      <div className="wallet-connected">
        <div className="user-info">
          <span className="address">
            {session.address.slice(0, 8)}...{session.address.slice(-8)}
          </span>
          <button onClick={logout} className="logout-btn">
            Disconnect
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={connectWallet}
      disabled={isLoading}
      className="connect-wallet-btn"
    >
      {isLoading ? 'Connecting...' : 'Connect Wallet & Authenticate'}
    </button>
  );
}
```

## 🔧 Setup Instructions

### 1. Start the SSO Server

```bash
# In your polkadot-sso directory
cd packages/sso
npm run dev
# Server will run on http://localhost:3001
```

### 2. Register Your T-REX App as a Client

Add your app to the SSO server's client registry:

```typescript
// In packages/sso/src/app.ts, add to clients Map:
clients.set('trex-demo-app', {
  id: 'trex-demo-app',
  name: 'T-REX Demo dApp',
  redirectUri: 'http://localhost:5173/callback',
  clientSecret: 'your-secret-key',
  allowedWallets: ['polkadot-js', 'talisman', 'subwallet'],
});
```

### 3. Environment Variables

Create `.env.local` in your T-REX dApp:

```env
VITE_SSO_ENDPOINT=http://localhost:3001
VITE_SSO_CLIENT_ID=trex-demo-app
VITE_SSO_CLIENT_SECRET=your-secret-key
```

## 🎯 Benefits of Integration

1. **Seamless Authentication**: Users authenticate once with their Polkadot wallet
2. **Secure Token Management**: JWT tokens with proper expiration
3. **Audit Trail**: All authentication events are logged
4. **Multi-Wallet Support**: Works with any Polkadot-compatible wallet
5. **OAuth 2.0 Compliance**: Standard authentication flow
6. **Session Management**: Automatic token refresh and session handling

## 🔒 Security Considerations

1. **HTTPS in Production**: Always use HTTPS for production deployments
2. **Client Secret**: Store client secrets securely (environment variables)
3. **Token Storage**: Consider using httpOnly cookies for token storage
4. **CORS Configuration**: Configure CORS properly for your domain
5. **Rate Limiting**: The SSO server includes rate limiting for security

## 📚 Next Steps

1. Choose your integration approach (React components recommended)
2. Install the required packages
3. Update your app components
4. Test the authentication flow
5. Deploy with proper environment configuration

## 🆘 Support

For issues or questions:

- Check the [API Documentation](http://localhost:3001/docs)
- Review the [Technical Documentation](../docs/TECHNICAL_DOCUMENTATION.md)
- Open an issue on [GitHub](https://github.com/CoachCoe/polkadot-sso)
