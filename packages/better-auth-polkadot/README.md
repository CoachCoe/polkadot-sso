# Better Auth Polkadot Plugin

A comprehensive Better Auth plugin for Polkadot wallet authentication, providing secure SIWE-style authentication for the Polkadot ecosystem.

## Features

- 🔐 **Multi-Wallet Support**: Polkadot.js, Talisman, SubWallet
- ⛓️ **Multi-Chain Support**: Polkadot, Kusama, Westend, Asset Hub
- 🛡️ **Secure Authentication**: Cryptographic signature verification
- 📱 **React/Next.js Ready**: Full TypeScript support with hooks
- 🎯 **Better Auth Integration**: Seamless plugin architecture
- 🧪 **Comprehensive Testing**: 80%+ test coverage

## Installation

```bash
npm install @polkadot-sso/better-auth-polkadot
```

## Quick Start

### Server Setup

```typescript
import { betterAuth } from "better-auth"
import { polkadotPlugin } from "@polkadot-sso/better-auth-polkadot"

const auth = betterAuth({
  plugins: [
    polkadotPlugin({
      providers: [
        {
          id: "polkadot",
          name: "Polkadot",
          chain: "polkadot",
          rpcUrl: "wss://rpc.polkadot.io",
          ss58Format: 0,
          decimals: 10,
          tokenSymbol: "DOT"
        },
        {
          id: "kusama",
          name: "Kusama",
          chain: "kusama",
          rpcUrl: "wss://kusama-rpc.polkadot.io",
          ss58Format: 2,
          decimals: 12,
          tokenSymbol: "KSM"
        }
      ]
    })
  ]
})
```

### Client Usage

```typescript
import { usePolkadotAuth } from "@polkadot-sso/better-auth-polkadot"

function LoginComponent() {
  const { 
    accounts, 
    user, 
    loading, 
    error, 
    connectWallet, 
    signIn, 
    signOut 
  } = usePolkadotAuth({
    appName: "My App",
    ssoUrl: "http://localhost:3000"
  })

  if (user) {
    return (
      <div>
        <p>Welcome, {user.address}!</p>
        <button onClick={signOut}>Sign Out</button>
      </div>
    )
  }

  return (
    <div>
      {accounts.length === 0 ? (
        <button onClick={connectWallet}>
          Connect Polkadot Wallet
        </button>
      ) : (
        <div>
          {accounts.map(account => (
            <button 
              key={account.address}
              onClick={() => signIn(account.address, account.chain)}
            >
              Sign in with {account.name || account.address}
            </button>
          ))}
        </div>
      )}
      {error && <p>Error: {error}</p>}
    </div>
  )
}
```

### Component Usage

```typescript
import { PolkadotWalletSelector } from "@polkadot-sso/better-auth-polkadot"

function App() {
  return (
    <PolkadotWalletSelector
      appName="My App"
      ssoUrl="http://localhost:3000"
      onSuccess={(user) => console.log("Authenticated:", user)}
      onError={(error) => console.error("Auth error:", error)}
    />
  )
}
```

## API Reference

### Plugin Options

```typescript
interface PolkadotPluginOptions {
  providers: PolkadotProvider[]
  chains?: {
    polkadot?: string
    kusama?: string
    westend?: string
  }
  rpcUrls?: {
    polkadot?: string
    kusama?: string
    westend?: string
  }
}
```

### PolkadotProvider

```typescript
interface PolkadotProvider {
  id: string
  name: string
  chain: string
  rpcUrl: string
  ss58Format: number
  decimals: number
  tokenSymbol: string
}
```

### usePolkadotAuth Hook

```typescript
interface UsePolkadotAuthReturn {
  accounts: PolkadotAccount[]
  user: PolkadotUser | null
  session: PolkadotSession | null
  loading: boolean
  error: string | null
  connectWallet: () => Promise<void>
  signIn: (address: string, chain: string) => Promise<void>
  signOut: () => Promise<void>
  refreshSession: () => Promise<void>
}
```

## Authentication Flow

1. **Wallet Connection**: User connects their Polkadot wallet
2. **Account Selection**: User selects an account and chain
3. **Challenge Generation**: Server generates a cryptographic challenge
4. **Message Signing**: User signs the challenge with their wallet
5. **Signature Verification**: Server verifies the signature
6. **Session Creation**: Server creates a JWT session
7. **Authentication Complete**: User is authenticated

## Security Features

- **Cryptographic Verification**: All signatures are cryptographically verified
- **Challenge-Response**: Prevents replay attacks
- **JWT Tokens**: Secure session management
- **Address Validation**: SS58 format validation
- **Rate Limiting**: Built-in protection against abuse

## Supported Chains

- **Polkadot**: Main network (ss58: 0)
- **Kusama**: Canary network (ss58: 2)
- **Westend**: Test network (ss58: 42)
- **Asset Hub**: Asset parachain

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Build
npm run build

# Development mode
npm run dev
```

## Testing

The plugin includes comprehensive unit tests with 80%+ coverage:

```bash
npm test                    # Run all tests
npm run test:watch         # Watch mode
npm run test:coverage      # Coverage report
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

- GitHub Issues: [Report bugs and request features](https://github.com/CoachCoe/polkadot-sso/issues)
- Documentation: [Full API documentation](https://github.com/CoachCoe/polkadot-sso/tree/main/packages/better-auth-polkadot)
- Discord: [Join our community](https://discord.gg/polkadot-sso)