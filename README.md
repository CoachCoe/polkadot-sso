# Polkadot SSO

> 🚀 **Production-Ready Better Auth Plugin** for the Polkadot ecosystem

A comprehensive Better Auth plugin for Polkadot wallet authentication, providing secure SIWE-style authentication with multi-chain support and enterprise-grade security features.

## ✨ Features

- 🔐 **Polkadot.js Integration**: Secure wallet-based authentication
- ⛓️ **Multi-Chain Support**: Polkadot, Kusama, Westend, Asset Hub
- 🛡️ **Better Auth Integration**: Seamless plugin architecture
- 📱 **React/Next.js Ready**: Full TypeScript support with hooks
- 🧪 **Comprehensive Testing**: 80%+ test coverage
- 🔒 **Enterprise Security**: Cryptographic signature verification
- 🌐 **Production Ready**: Stateless, scalable, and secure

## 🚀 Quick Start

### Installation

```bash
npm install @polkadot-sso/better-auth-polkadot
```

### Server Setup

```typescript
import { betterAuth } from "better-auth"
import { polkadotPlugin } from "@polkadot-sso/better-auth-polkadot"

const auth = betterAuth({
  database: {
    provider: "sqlite",
    url: "file:./data/auth.db"
  },
  secret: process.env.SESSION_SECRET,
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

## 🏗️ Architecture

### Better Auth Plugin System

The plugin follows the Better Auth architecture with:

- **Stateless Authentication**: JWT-based sessions
- **Plugin Architecture**: Modular and extensible
- **Type Safety**: Full TypeScript support
- **Security First**: Cryptographic verification

### Authentication Flow

1. **Wallet Connection**: User connects their Polkadot wallet
2. **Account Selection**: User selects an account and chain
3. **Challenge Generation**: Server generates a cryptographic challenge
4. **Message Signing**: User signs the challenge with their wallet
5. **Signature Verification**: Server verifies the signature
6. **Session Creation**: Server creates a JWT session
7. **Authentication Complete**: User is authenticated

## 🔧 Configuration

### Environment Variables

```bash
# Required
SESSION_SECRET=your-32-character-session-secret

# Optional - Chain RPC URLs
POLKADOT_RPC_URL=wss://rpc.polkadot.io
KUSAMA_RPC_URL=wss://kusama-rpc.polkadot.io
WESTEND_RPC_URL=wss://westend-rpc.polkadot.io

# Optional - Database
DATABASE_URL=file:./data/auth.db
```

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

## 🛡️ Security Features

- **Cryptographic Verification**: All signatures are cryptographically verified
- **Challenge-Response**: Prevents replay attacks
- **JWT Tokens**: Secure session management
- **Address Validation**: SS58 format validation
- **Rate Limiting**: Built-in protection against abuse

## 📦 Packages

### Core Plugin
- **Location**: `packages/better-auth-polkadot/`
- **Package**: `@polkadot-sso/better-auth-polkadot`
- **Status**: ✅ Production Ready

### Example App
- **Location**: `apps/example/`
- **Framework**: Nuxt.js
- **Status**: ✅ Updated for Better Auth

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

The plugin includes comprehensive unit tests with 80%+ coverage.

## 🚀 Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## 📚 API Reference

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

### PolkadotWalletSelector Component

```typescript
interface PolkadotWalletSelectorProps {
  appName: string
  ssoUrl: string
  onSuccess?: (user: any) => void
  onError?: (error: string) => void
}
```

## 🌟 Supported Chains

- **Polkadot**: Main network (ss58: 0)
- **Kusama**: Canary network (ss58: 2)
- **Westend**: Test network (ss58: 42)
- **Asset Hub**: Asset parachain

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🆘 Support

- GitHub Issues: [Report bugs and request features](https://github.com/CoachCoe/polkadot-sso/issues)
- Documentation: [Full API documentation](https://github.com/CoachCoe/polkadot-sso/tree/main/packages/better-auth-polkadot)
- Discord: [Join our community](https://discord.gg/polkadot-sso)

---

**Built with ❤️ for the Polkadot ecosystem**