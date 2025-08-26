# @polkadot-auth/core

Framework-agnostic core for Polkadot authentication with SIWE-style messages.

## 🚀 Features

- **SIWE-Style Authentication**: EIP-4361 compliant authentication messages
- **Multi-Wallet Support**: Polkadot.js, Talisman, SubWallet, Nova Wallet
- **Multi-Chain Support**: Polkadot, Kusama, Westend, Rococo
- **Security Features**: Nonce-based replay protection, domain binding, request tracking
- **TypeScript First**: Full type safety and IntelliSense support
- **Framework Agnostic**: Use with any JavaScript/TypeScript framework

## 📦 Installation

```bash
npm install @polkadot-auth/core
```

## 🎯 Quick Start

### Basic Usage

```typescript
import { createPolkadotAuth } from '@polkadot-auth/core';

// Create auth instance with default configuration
const auth = createPolkadotAuth();

// Create a challenge
const challenge = await auth.createChallenge('my-app');

console.log(challenge.message);
// Output:
// polkadot-auth.localhost wants you to sign in with your Polkadot account:
// 0x...
//
// Sign this message to authenticate with Polkadot SSO
//
// URI: http://localhost:3000
// Version: 1
// Chain ID: polkadot
// Nonce: a1b2c3d4e5f6...
// Issued At: 2025-01-24T18:30:00.000Z
// Expiration Time: 2025-01-24T18:35:00.000Z
// Request ID: 12345678-1234-1234-1234-123456789abc
// Resources:
// - https://polkadot-auth.localhost/credentials
// - https://polkadot-auth.localhost/profile
```

### Custom Configuration

```typescript
import { createPolkadotAuth } from '@polkadot-auth/core';

const auth = createPolkadotAuth({
  defaultChain: 'kusama',
  providers: ['polkadot-js', 'talisman'],
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  security: {
    enableNonce: true,
    enableDomainBinding: true,
    challengeExpiration: 5 * 60, // 5 minutes
  },
});
```

## 🔧 Configuration

### PolkadotAuthConfig

```typescript
interface PolkadotAuthConfig {
  defaultChain?: string; // Default chain (default: 'polkadot')
  chains?: ChainConfig[]; // Custom chains
  providers?: string[]; // Enabled wallet providers
  customProviders?: WalletProvider[]; // Custom wallet providers
  session?: SessionConfig; // Session configuration
  database?: DatabaseConfig; // Database configuration
  security?: SecurityConfig; // Security settings
  ui?: UIConfig; // UI configuration
}
```

### Chain Configuration

```typescript
interface ChainConfig {
  id: string; // Chain identifier
  name: string; // Display name
  rpcUrl: string; // RPC endpoint
  ss58Format: number; // Address format
  decimals?: number; // Token decimals
  symbol?: string; // Token symbol
  isTestnet?: boolean; // Is testnet
}
```

### Security Configuration

```typescript
interface SecurityConfig {
  enableNonce?: boolean; // Enable nonce-based replay protection
  enableDomainBinding?: boolean; // Enable domain binding
  enableRequestTracking?: boolean; // Enable request ID tracking
  challengeExpiration?: number; // Challenge expiration in seconds
  allowedDomains?: string[]; // Allowed domains for binding
}
```

## 🏗️ Architecture

### Core Components

1. **SIWEAuthService**: Handles SIWE-style message generation and verification
2. **Wallet Providers**: Interface for different wallet implementations
3. **Chain Management**: Multi-chain support and configuration
4. **Session Management**: Session creation, validation, and refresh

### Default Chains

- **Polkadot**: `wss://rpc.polkadot.io` (ss58: 0)
- **Kusama**: `wss://kusama-rpc.polkadot.io` (ss58: 2)
- **Westend**: `wss://westend-rpc.polkadot.io` (ss58: 42)
- **Rococo**: `wss://rococo-rpc.polkadot.io` (ss58: 42)

### Default Providers

- **Polkadot.js Extension**: Official browser extension
- **Talisman**: Popular wallet extension
- **SubWallet**: Feature-rich wallet
- **Nova Wallet**: Mobile wallet with browser bridge

## 🔐 Security Features

### SIWE-Style Messages

Messages follow the EIP-4361 standard with Polkadot-specific adaptations:

```
polkadot-auth.localhost wants you to sign in with your Polkadot account:
5EJP9eSB1HpzjpuCJrna8KMcA6mmgaT8W4gSmwHaVDn25gHQ

Sign this message to authenticate with Polkadot SSO

URI: http://localhost:3000
Version: 1
Chain ID: kusama
Nonce: a1b2c3d4e5f6...
Issued At: 2025-01-24T18:30:00.000Z
Expiration Time: 2025-01-24T18:35:00.000Z
Request ID: 12345678-1234-1234-1234-123456789abc
Resources:
- https://polkadot-auth.localhost/credentials
- https://polkadot-auth.localhost/profile
```

### Security Validations

- **Nonce Verification**: Prevents replay attacks
- **Domain Binding**: Ensures messages are for the correct domain
- **Expiration Checking**: Prevents use of expired challenges
- **Address Validation**: Validates Polkadot address format
- **Request Tracking**: Unique request IDs for audit trails

## 🔌 Extending

### Custom Wallet Provider

```typescript
import { createCustomProvider } from '@polkadot-auth/core';

const customProvider = createCustomProvider({
  id: 'my-wallet',
  name: 'My Custom Wallet',
  description: 'A custom wallet implementation',
  connect: async () => {
    // Implement wallet connection logic
    return {
      provider: customProvider,
      accounts: [],
      signMessage: async message => {
        // Implement message signing
        return 'signed-message';
      },
      disconnect: async () => {
        // Implement disconnect logic
      },
    };
  },
  isAvailable: () => {
    // Check if wallet is available
    return true;
  },
});

const auth = createPolkadotAuth({
  customProviders: [customProvider],
});
```

### Custom Chain

```typescript
const customChain = {
  id: 'my-parachain',
  name: 'My Parachain',
  rpcUrl: 'wss://my-parachain-rpc.com',
  ss58Format: 42,
  decimals: 12,
  symbol: 'MYT',
  isTestnet: false,
};

const auth = createPolkadotAuth({
  chains: [customChain],
  defaultChain: 'my-parachain',
});
```

## 📚 API Reference

### createPolkadotAuth(config?)

Creates a new Polkadot Auth instance.

**Parameters:**

- `config` (optional): Configuration object

**Returns:** `PolkadotAuthInstance`

### PolkadotAuthInstance Methods

#### createChallenge(clientId, userAddress?, chainId?)

Creates a new authentication challenge.

**Parameters:**

- `clientId`: Client identifier
- `userAddress` (optional): User's address
- `chainId` (optional): Chain identifier

**Returns:** `Promise<Challenge>`

#### verifySignature(signature, challenge)

Verifies a signed message against a challenge.

**Parameters:**

- `signature`: SIWESignature object
- `challenge`: Challenge object

**Returns:** `Promise<AuthResult>`

#### getProviders()

Returns available wallet providers.

**Returns:** `WalletProvider[]`

#### getChains()

Returns available chains.

**Returns:** `ChainConfig[]`

## 🧪 Testing

```bash
npm test
```

## 📄 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 🔗 Related Packages

- `@polkadot-auth/express` - Express.js adapter
- `@polkadot-auth/next` - Next.js adapter
- `@polkadot-auth/ui` - React UI components
