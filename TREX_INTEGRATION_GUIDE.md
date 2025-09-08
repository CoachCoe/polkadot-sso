# T-REX Demo dApp Integration Guide

This guide shows how to integrate the Polkadot SSO library into the [T-REX Demo dApp](https://github.com/corey-hathaway/trex-demo-dapp) for real wallet authentication.

## 🚀 Quick Start

### 1. Install Dependencies

In the T-REX dApp's `frontend` directory:

```bash
cd frontend
npm install @polkadot-auth/ui @polkadot-auth/core @polkadot-auth/client-sdk
```

### 2. Update package.json

Add these dependencies to `frontend/package.json`:

```json
{
  "dependencies": {
    "@polkadot-auth/ui": "file:../../packages/ui",
    "@polkadot-auth/core": "file:../../packages/core",
    "@polkadot-auth/client-sdk": "file:../../packages/client-sdk",
    // ... your existing dependencies
  }
}
```

## 📁 File Updates

### 1. Update App.tsx

Replace `frontend/src/App.tsx`:

```tsx
import React from 'react';
import { PolkadotAuthProvider } from '@polkadot-auth/ui';
import Navigation from './components/Navigation';
import Dashboard from './components/Dashboard';
import DeploymentWizard from './components/DeploymentWizard';
import './App.css';

function App() {
  return (
    <PolkadotAuthProvider
      domain="trex-demo-dapp.com"
      uri="https://trex-demo-dapp.com"
      defaultChain="polkadot"
    >
      <div className="min-h-screen bg-gray-900 text-white">
        <Navigation />
        <main className="container mx-auto px-4 py-8">
          <Dashboard />
          <DeploymentWizard />
        </main>
      </div>
    </PolkadotAuthProvider>
  );
}

export default App;
```

### 2. Update Navigation.tsx

Replace `frontend/src/components/Navigation.tsx`:

```tsx
import React from 'react';
import { usePolkadotAuth } from '@polkadot-auth/ui';

const Navigation = () => {
  const {
    isConnected,
    address,
    connect,
    disconnect,
    isLoading,
    error
  } = usePolkadotAuth();

  return (
    <nav className="bg-gray-800 shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          {/* T-REX Logo */}
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">T</span>
            </div>
            <span className="text-xl font-bold">T-REX Demo</span>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex space-x-6">
            <a href="#dashboard" className="hover:text-blue-400 transition-colors">
              Asset Dashboard
            </a>
            <a href="#deploy" className="hover:text-blue-400 transition-colors">
              Deploy Contracts
            </a>
          </div>

          {/* Wallet Connection */}
          <div className="flex items-center space-x-4">
            {isConnected ? (
              <div className="flex items-center space-x-3">
                <div className="text-sm">
                  <div className="text-gray-300">Connected</div>
                  <div className="font-mono text-xs">
                    {address?.slice(0, 6)}...{address?.slice(-4)}
                  </div>
                </div>
                <button
                  onClick={disconnect}
                  className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm transition-colors"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <div className="flex space-x-2">
                <button
                  onClick={() => connect('polkadot-js')}
                  disabled={isLoading}
                  className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm transition-colors disabled:opacity-50"
                >
                  {isLoading ? 'Connecting...' : 'Connect Wallet'}
                </button>
                {error && (
                  <div className="text-red-400 text-xs">
                    {error.message}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
```

### 3. Create WalletSelector.tsx

Create `frontend/src/components/WalletSelector.tsx`:

```tsx
import React from 'react';
import { usePolkadotAuth } from '@polkadot-auth/ui';
import { getAvailableWallets } from '@polkadot-auth/client-sdk';

const WalletSelector = () => {
  const { connect, isLoading, error } = usePolkadotAuth();
  const availableWallets = getAvailableWallets();

  const walletIcons = {
    'polkadot-js': '🔴',
    'talisman': '🟣',
    'subwallet': '🔵',
    'nova-wallet': '🟠'
  };

  const walletNames = {
    'polkadot-js': 'Polkadot.js',
    'talisman': 'Talisman',
    'subwallet': 'SubWallet',
    'nova-wallet': 'Nova Wallet'
  };

  const walletDescriptions = {
    'polkadot-js': 'Browser Extension',
    'talisman': 'Browser Extension',
    'subwallet': 'Browser Extension',
    'nova-wallet': 'Mobile App + QR Code'
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 max-w-md mx-auto">
      <h3 className="text-xl font-bold mb-4 text-center">
        Connect Your Wallet
      </h3>
      <p className="text-gray-400 text-sm mb-6 text-center">
        Choose from {availableWallets.length} available wallets to deploy T-REX tokens
      </p>

      <div className="space-y-3">
        {availableWallets.map(wallet => (
          <button
            key={wallet.name}
            onClick={() => connect(wallet.name)}
            disabled={isLoading}
            className="w-full flex items-center space-x-3 p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
          >
            <span className="text-2xl">{walletIcons[wallet.name] || '🔗'}</span>
            <div className="flex-1 text-left">
              <div className="font-medium">
                {walletNames[wallet.name] || wallet.name}
              </div>
              <div className="text-xs text-gray-400">
                {walletDescriptions[wallet.name] || 'Wallet'}
              </div>
            </div>
            {isLoading && (
              <div className="ml-auto">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
              </div>
            )}
          </button>
        ))}
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-900/50 border border-red-500 rounded-lg">
          <p className="text-red-400 text-sm">❌ {error.message}</p>
        </div>
      )}
    </div>
  );
};

export default WalletSelector;
```

### 4. Update Dashboard.tsx

Replace `frontend/src/components/Dashboard.tsx`:

```tsx
import React from 'react';
import { usePolkadotAuth } from '@polkadot-auth/ui';
import WalletSelector from './WalletSelector';

const Dashboard = () => {
  const { isConnected, address, session } = usePolkadotAuth();

  if (!isConnected) {
    return (
      <div className="text-center py-12">
        <h2 className="text-3xl font-bold mb-4">T-REX Asset Dashboard</h2>
        <p className="text-gray-400 mb-8">
          Connect your wallet to view and manage your deployed tokens
        </p>
        <WalletSelector />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-4">Welcome to T-REX Dashboard</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-700 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Connected Wallet</h3>
            <p className="font-mono text-sm text-blue-400">{address}</p>
          </div>
          <div className="bg-gray-700 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Session ID</h3>
            <p className="font-mono text-sm text-green-400">{session?.id}</p>
          </div>
          <div className="bg-gray-700 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Status</h3>
            <p className="text-green-400">✅ Authenticated</p>
          </div>
        </div>
      </div>

      {/* Your existing T-REX dashboard content */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-xl font-bold mb-4">Deployed Tokens</h3>
        <p className="text-gray-400">
          Your deployed ERC-3643 tokens will appear here...
        </p>
      </div>
    </div>
  );
};

export default Dashboard;
```

### 5. Update DeploymentWizard.tsx

Replace `frontend/src/components/DeploymentWizard.tsx`:

```tsx
import React, { useState } from 'react';
import { usePolkadotAuth } from '@polkadot-auth/ui';
import WalletSelector from './WalletSelector';

const DeploymentWizard = () => {
  const { isConnected, address } = usePolkadotAuth();
  const [currentStep, setCurrentStep] = useState(1);

  if (!isConnected) {
    return (
      <div className="text-center py-12">
        <h2 className="text-3xl font-bold mb-4">Deploy T-REX Contracts</h2>
        <p className="text-gray-400 mb-8">
          Connect your wallet to start deploying ERC-3643 compliant tokens
        </p>
        <WalletSelector />
      </div>
    );
  }

  const steps = [
    'TrustedIssuers Registry',
    'ClaimTopics Registry',
    'Identity Storage',
    'Identity Registry',
    'Default Compliance',
    'Token Contract'
  ];

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h2 className="text-2xl font-bold mb-6">T-REX Deployment Wizard</h2>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between text-sm text-gray-400 mb-2">
          <span>Step {currentStep} of {steps.length}</span>
          <span>{Math.round((currentStep / steps.length) * 100)}% Complete</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(currentStep / steps.length) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Current Step */}
      <div className="bg-gray-700 rounded-lg p-6 mb-6">
        <h3 className="text-xl font-semibold mb-4">
          Step {currentStep}: {steps[currentStep - 1]}
        </h3>
        <p className="text-gray-300 mb-4">
          Deploying from wallet: <span className="font-mono text-blue-400">{address}</span>
        </p>

        {/* Your existing deployment logic here */}
        <div className="space-y-4">
          <p className="text-gray-400">
            Contract deployment logic for {steps[currentStep - 1]}...
          </p>

          <div className="flex space-x-4">
            {currentStep > 1 && (
              <button
                onClick={() => setCurrentStep(currentStep - 1)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded transition-colors"
              >
                Previous
              </button>
            )}

            {currentStep < steps.length ? (
              <button
                onClick={() => setCurrentStep(currentStep + 1)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition-colors"
              >
                Next Step
              </button>
            ) : (
              <button
                onClick={() => alert('Deployment Complete!')}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded transition-colors"
              >
                Complete Deployment
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeploymentWizard;
```

## 🚀 Installation & Testing

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Start Development Server

```bash
npm run dev
```

### 3. Test Wallet Integration

1. Open `http://localhost:5173`
2. Click "Connect Wallet" in the navigation
3. Choose from available wallets:
   - 🔴 Polkadot.js Extension
   - 🟣 Talisman
   - 🔵 SubWallet
   - 🟠 Nova Wallet
4. Test the deployment wizard with real wallet authentication

## 🎯 Supported Wallets

| Wallet | Icon | Status | Mobile Support |
|--------|------|---------|----------------|
| Polkadot.js | 🔴 | ✅ Full Support | ❌ Browser Only |
| Talisman | 🟣 | ✅ Full Support | ❌ Browser Only |
| SubWallet | 🔵 | ✅ Full Support | ❌ Browser Only |
| Nova Wallet | 🟠 | ✅ Full Support | ✅ **QR Code Authentication** |

## 📱 Nova Wallet QR Code Authentication

Nova Wallet is mobile-only, so we provide QR code authentication for seamless mobile integration:

### Using Nova Wallet QR Authentication

```tsx
import React from 'react';
import { NovaWalletSignInButton } from '@polkadot-auth/ui';

const NovaWalletExample = () => {
  const handleSuccess = (address: string, session: any) => {
    console.log('Nova Wallet connected:', address);
    console.log('Session:', session);
  };

  const handleError = (error: Error) => {
    console.error('Nova Wallet connection failed:', error);
  };

  return (
    <NovaWalletSignInButton
      onSuccess={handleSuccess}
      onError={handleError}
      baseUrl="https://your-sso-server.com"
    >
      Connect Nova Wallet
    </NovaWalletSignInButton>
  );
};
```

### QR Code Authentication Flow

1. **User clicks "Connect Nova Wallet"**
2. **QR code is generated** with authentication challenge
3. **User scans QR code** with Nova Wallet mobile app
4. **User approves** the authentication request in Nova Wallet
5. **Authentication completes** and user is signed in

### Custom QR Code Component

For more control, use the `NovaQrAuth` component directly:

```tsx
import React, { useState } from 'react';
import { NovaQrAuth, NovaQrAuthService, createNovaQrAuthService } from '@polkadot-auth/ui';

const CustomNovaAuth = () => {
  const [qrData, setQrData] = useState(null);
  const [waitForCompletion, setWaitForCompletion] = useState(null);

  const handleStartAuth = async () => {
    const qrAuthService = createNovaQrAuthService({
      baseUrl: 'https://your-sso-server.com'
    });

    const { qrData, waitForCompletion } = await qrAuthService.generateQrAuth(
      'challenge_123',
      'Sign this message to authenticate',
      '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'
    );

    setQrData(qrData);
    setWaitForCompletion(() => waitForCompletion);
  };

  if (qrData && waitForCompletion) {
    return (
      <NovaQrAuth
        qrData={qrData}
        onSuccess={() => console.log('Authentication successful!')}
        onError={(error) => console.error('Authentication failed:', error)}
        onCancel={() => {
          setQrData(null);
          setWaitForCompletion(null);
        }}
        waitForCompletion={waitForCompletion}
      />
    );
  }

  return (
    <button onClick={handleStartAuth}>
      Start Nova Wallet Authentication
    </button>
  );
};
```

## 🔧 Customization Options

### Wallet-Specific Branding

You can customize wallet icons and names in `WalletSelector.tsx`:

```tsx
const walletIcons = {
  'polkadot-js': '🔴',
  'talisman': '🟣',
  'subwallet': '🔵',
  'nova-wallet': '🟠'
};

const walletNames = {
  'polkadot-js': 'Polkadot.js',
  'talisman': 'Talisman',
  'subwallet': 'SubWallet',
  'nova-wallet': 'Nova Wallet'
};
```

### Chain Configuration

Update the `PolkadotAuthProvider` in `App.tsx` for different chains:

```tsx
<PolkadotAuthProvider
  domain="trex-demo-dapp.com"
  uri="https://trex-demo-dapp.com"
  defaultChain="kusama"  // or "polkadot", "westend", etc.
>
```

### Account Selection

For multi-account wallets, you can implement account selection:

```tsx
const { connect, session } = usePolkadotAuth();

// Access all accounts from the session
const accounts = session?.accounts || [];
```

## 🐛 Troubleshooting

### Common Issues

1. **Wallet not detected**: Ensure the wallet extension is installed and enabled
2. **Connection fails**: Check browser console for error messages
3. **Build errors**: Ensure all dependencies are properly installed

### Debug Mode

Enable debug logging by adding to your component:

```tsx
const { connect, error } = usePolkadotAuth();

// Log errors for debugging
useEffect(() => {
  if (error) {
    console.error('Wallet connection error:', error);
  }
}, [error]);
```

## 🔌 SSO Server QR Authentication Endpoints

The Polkadot SSO server provides these endpoints for Nova Wallet QR authentication:

### Generate QR Authentication Data
```http
POST /auth/qr/generate
Content-Type: application/json

{
  "address": "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
  "client_id": "trex-demo-dapp"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "challengeId": "challenge_123456789",
    "message": "Sign this message to authenticate...",
    "address": "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
    "expiresAt": 1703123456789,
    "qrData": {
      "challengeId": "challenge_123456789",
      "message": "Sign this message to authenticate...",
      "address": "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
      "deepLink": "nova://auth?challenge_id=challenge_123456789&message=..."
    }
  }
}
```

### Check Authentication Status
```http
GET /auth/qr/status?challenge_id=challenge_123456789
```

**Response:**
```json
{
  "success": true,
  "data": {
    "challengeId": "challenge_123456789",
    "completed": false,
    "expiresAt": 1703123456789,
    "timeRemaining": 240000
  }
}
```

### Get Authentication Result
```http
GET /auth/qr/result?challenge_id=challenge_123456789
```

**Response (when completed):**
```json
{
  "success": true,
  "data": {
    "challengeId": "challenge_123456789",
    "completed": true,
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "accessTokenId": "token_123456789",
      "refreshTokenId": "refresh_123456789",
      "accessTokenExpiresAt": 1703124356789,
      "refreshTokenExpiresAt": 1703729156789
    },
    "session": {
      "id": "challenge_123456789",
      "address": "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
      "clientId": "nova-wallet-qr-auth",
      "fingerprint": "challenge_123456789",
      "createdAt": 1703123456789,
      "lastUsedAt": 1703123456789,
      "isActive": true,
      "accessTokenId": "token_123456789",
      "refreshTokenId": "refresh_123456789",
      "accessTokenExpiresAt": 1703124356789,
      "refreshTokenExpiresAt": 1703729156789
    }
  }
}
```

## 📚 Additional Resources

- [Polkadot SSO Documentation](../README.md)
- [T-REX Framework Documentation](https://github.com/corey-hathaway/trex-demo-dapp)
- [Polkadot.js Extension](https://polkadot.js.org/extension/)
- [Talisman Wallet](https://talisman.xyz/)
- [SubWallet](https://subwallet.app/)
- [Nova Wallet](https://novawallet.io/)

## ✅ Integration Checklist

- [ ] Install Polkadot SSO packages
- [ ] Update App.tsx with PolkadotAuthProvider
- [ ] Update Navigation.tsx with wallet connection
- [ ] Create WalletSelector.tsx component
- [ ] Update Dashboard.tsx with authentication
- [ ] Update DeploymentWizard.tsx with wallet integration
- [ ] Test with all supported wallets
- [ ] Customize branding and styling
- [ ] Deploy and test in production

---

**🎉 Congratulations!** Your T-REX Demo dApp now has production-ready wallet authentication supporting all major Polkadot wallets!
