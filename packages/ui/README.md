# @polkadot-auth/ui

React UI components for Polkadot authentication with browser compatibility.

## Features

- **Browser Compatible**: Works in both Node.js and browser environments
- **Modern Crypto**: Uses crypto-js and Web Crypto API for secure operations
- **TypeScript Support**: Full type safety and IntelliSense
- **Responsive Design**: Mobile-friendly components
- **Customizable**: Easy to style and extend

## Installation

```bash
npm install @polkadot-auth/ui
```

## Quick Start

### Basic Usage

```tsx
import React from 'react';
import { PolkadotAuthProvider, PolkadotSignInButton, PolkadotProfile } from '@polkadot-auth/ui';

function App() {
  return (
    <PolkadotAuthProvider>
      <div className='app'>
        <h1>My Polkadot App</h1>
        <PolkadotSignInButton />
        <PolkadotProfile address='5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY' />
      </div>
    </PolkadotAuthProvider>
  );
}

export default App;
```

### Advanced Usage

```tsx
import React from 'react';
import {
  PolkadotAuthProvider,
  PolkadotSignInButton,
  WalletSelector,
  usePolkadotAuth,
} from '@polkadot-auth/ui';

function AuthComponent() {
  const { isConnected, address, connect, disconnect, signMessage, isLoading, error } =
    usePolkadotAuth();

  const handleSignIn = (address: string, session: any) => {
    console.log('User signed in:', address, session);
  };

  const handleError = (error: string) => {
    console.error('Auth error:', error);
  };

  const handleSignMessage = async () => {
    try {
      const signature = await signMessage('Hello from Polkadot!');
      console.log('Signature:', signature);
    } catch (err) {
      console.error('Failed to sign message:', err);
    }
  };

  if (isConnected) {
    return (
      <div>
        <h2>Welcome, {address}!</h2>
        <button onClick={handleSignMessage}>Sign Message</button>
        <button onClick={disconnect}>Disconnect</button>
      </div>
    );
  }

  return (
    <div>
      <PolkadotSignInButton
        onSignIn={handleSignIn}
        onError={handleError}
        className='custom-signin-button'
      />
      {error && <div className='error'>{error}</div>}
    </div>
  );
}

function App() {
  return (
    <PolkadotAuthProvider
      config={{
        defaultChain: 'kusama',
        providers: ['polkadot-js', 'talisman'],
        autoConnect: true,
      }}
    >
      <AuthComponent />
    </PolkadotAuthProvider>
  );
}

export default App;
```

## Components

### PolkadotAuthProvider

The main provider component that manages authentication state.

**Props:**

- `children`: React children
- `config`: Optional configuration object
  - `defaultChain`: Default chain ID (default: 'polkadot')
  - `providers`: Array of wallet provider IDs
  - `autoConnect`: Whether to auto-connect on mount

### PolkadotSignInButton

A button component for initiating wallet connection.

**Props:**

- `onSignIn`: Callback when user successfully signs in
- `onError`: Callback when an error occurs
- `className`: Custom CSS class
- `children`: Custom button content
- `disabled`: Whether the button is disabled

### WalletSelector

A component for selecting from available wallet providers.

**Props:**

- `providers`: Array of wallet providers
- `onSelect`: Callback when a provider is selected
- `className`: Custom CSS class
- `disabled`: Whether the selector is disabled

### PolkadotProfile

A component for displaying user profile information.

**Props:**

- `address`: User's Polkadot address
- `session`: Optional session object
- `onDisconnect`: Callback when user disconnects
- `className`: Custom CSS class
- `showBalance`: Whether to show balance (default: false)
- `showChain`: Whether to show chain info (default: false)

## Hooks

### usePolkadotAuth

A hook for accessing authentication state and methods.

**Returns:**

- `isConnected`: Whether user is connected
- `address`: User's address (null if not connected)
- `session`: Current session object
- `providers`: Available wallet providers
- `chains`: Available chains
- `connect`: Function to connect a wallet
- `disconnect`: Function to disconnect
- `signMessage`: Function to sign a message
- `isLoading`: Whether an operation is in progress
- `error`: Current error message
- `clearError`: Function to clear errors

## Styling

The components come with default styles that can be customized using CSS classes:

```css
.polkadot-auth-signin-button {
  /* Customize the sign-in button */
  background: linear-gradient(135deg, #e6007a, #ff6b35);
  border-radius: 8px;
  padding: 12px 24px;
}

.polkadot-auth-profile {
  /* Customize the profile component */
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 24px;
}
```

## Browser Compatibility

This package is designed to work in both Node.js and browser environments:

- **Node.js**: Uses the built-in `crypto` module
- **Browser**: Uses `crypto-js` and Web Crypto API
- **Fallbacks**: Graceful degradation for older browsers

## TypeScript Support

Full TypeScript support with exported types:

```tsx
import type {
  PolkadotAuthContextType,
  PolkadotSignInButtonProps,
  UsePolkadotAuthReturn,
} from '@polkadot-auth/ui';
```

## License

MIT
