# Better Auth Polkadot Plugin

A Better Auth plugin for Polkadot wallet authentication, enabling users to sign in with their Polkadot accounts.

## Features

- 🔐 **Polkadot Wallet Authentication**: Support for Polkadot.js, Talisman, and SubWallet
- ⛓️ **Multi-Chain Support**: Works with Polkadot, Kusama, Westend, and Asset Hub
- 🛡️ **Secure Message Signing**: Cryptographically secure challenge-response authentication
- 🔍 **Identity Resolution**: Optional ENS-like identity resolution
- 📱 **React/Next.js Ready**: Full TypeScript support
- 🎯 **Better Auth Integration**: Seamless integration with Better Auth ecosystem

## Installation

```bash
npm install @polkadot-sso/better-auth-polkadot
```

## Quick Start

### Server-Side Setup

```typescript
import { betterAuth } from "better-auth"
import { polkadotAuth } from "@polkadot-sso/better-auth-polkadot"

export const auth = betterAuth({
  plugins: [
    polkadotAuth({
      domain: "example.com",
      appName: "My Polkadot App",
      appVersion: "1.0.0",
      statement: "Sign in with Polkadot to access My Polkadot App",
      chainId: "polkadot"
    })
  ]
})
```

### Client-Side Setup

```typescript
import { polkadotAuthClient } from "@polkadot-sso/better-auth-polkadot"

const polkadotAuth = polkadotAuthClient({
  domain: "example.com",
  appName: "My Polkadot App"
})

await polkadotAuth.init()

const wallets = await polkadotAuth.getAvailableWallets()
const accounts = await polkadotAuth.connectWallet("Polkadot.js")

const result = await polkadotAuth.signIn({
  walletName: "Polkadot.js",
  statement: "Sign in to access your account"
})

if (result.success) {
  console.log("Authentication successful:", result.address)
} else {
  console.error("Authentication failed:", result.error)
}
```

## Configuration Options

```typescript
interface PolkadotAuthConfig {
  domain: string;                    // Required: Your app's domain
  appName?: string;                  // Optional: App name (default: "Polkadot App")
  appVersion?: string;               // Optional: App version (default: "1.0.0")
  statement?: string;                // Optional: Custom statement
  uri?: string;                      // Optional: App URI (default: https://domain)
  chainId?: string;                  // Optional: Chain ID (default: "polkadot")
  generateNonce?: () => string;      // Optional: Custom nonce generation
  verifyMessage?: (message: string, signature: string, address: string) => Promise<boolean>;
  validateAddress?: (address: string) => boolean;
  enableIdentityResolution?: boolean; // Optional: Enable identity resolution
  resolveIdentity?: (address: string) => Promise<string | null>;
}
```

## Supported Wallets

- **Polkadot.js**: The official Polkadot wallet extension
- **Talisman**: Popular multi-chain wallet
- **SubWallet**: Feature-rich Polkadot wallet

## Supported Chains

- **Polkadot**: Main Polkadot network
- **Kusama**: Kusama canary network
- **Westend**: Westend testnet
- **Asset Hub**: Polkadot Asset Hub

## Security Features

- **Cryptographic Verification**: All signatures are cryptographically verified
- **Nonce Protection**: Each authentication attempt uses a unique nonce
- **Address Validation**: Comprehensive address format validation
- **Message Integrity**: Signed messages include domain, timestamp, and nonce
- **Identity Resolution**: Optional identity resolution for enhanced security

## Error Handling

```typescript
const result = await polkadotAuth.signIn()

if (!result.success) {
  switch (result.error) {
    case 'WALLET_NOT_INSTALLED':
      // Show wallet installation instructions
      break
    case 'USER_REJECTED':
      // User rejected the signature request
      break
    case 'NETWORK_ERROR':
      // Network connection error
      break
    default:
      // Generic error
      console.error('Authentication failed:', result.error)
  }
}
```

## Development

```bash
# Install dependencies
npm install

# Build the plugin
npm run build

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run in development mode
npm run dev
```

## Testing

The plugin includes comprehensive unit tests covering:

- Plugin initialization and configuration
- Message creation and formatting
- Address validation
- Wallet detection and connection
- Authentication flow
- Error handling
- Event management

Run tests with:

```bash
npm test
npm run test:coverage
```

## Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests to our GitHub repository.

## License

MIT License - see LICENSE file for details.

## Support

- 📖 [Documentation](https://github.com/CoachCoe/polkadot-sso)
- 🐛 [Issue Tracker](https://github.com/CoachCoe/polkadot-sso/issues)
- 💬 [Discussions](https://github.com/CoachCoe/polkadot-sso/discussions)