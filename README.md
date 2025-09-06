# Polkadot Auth

**Framework-agnostic Polkadot authentication with SIWE-style messages**

A plug-and-play authentication solution for Polkadot ecosystem, inspired by [Better Auth](https://www.better-auth.com/). Zero configuration, multiple framework support, and enterprise-grade security.

## 🎯 Inspiration & Vision

This project was inspired by several key developments in the authentication space:

### 🔐 **Sign in with Ethereum (SIWE)**

Following the [EIP-4361 standard](https://docs.siwe.xyz/), we've implemented SIWE-style authentication for Polkadot. This provides:

- **Standardized message format** for consistent user experience
- **Nonce-based replay protection** for enhanced security
- **Domain binding** to prevent cross-site attacks
- **Request ID tracking** for audit trails
- **Resource specification** for granular permissions

### 🏗️ **Better Auth Architecture**

Inspired by [Better Auth](https://www.better-auth.com/)'s comprehensive approach to authentication infrastructure, we've built:

- **Framework-agnostic core** that works with any web framework
- **Zero-configuration setup** for rapid development
- **Plugin architecture** for extensibility
- **TypeScript-first design** with full type safety
- **Enterprise-ready features** out of the box

### 🌐 **Web3 Authentication Evolution**

As noted by [Brantly Millegan](https://x.com/BrantlyMillegan/status/1956389297461899533), the future of authentication is moving toward self-sovereign identity and blockchain-based solutions. Polkadot Auth represents our contribution to this evolution, bringing the benefits of:

- **Self-sovereign identity** - users control their credentials
- **Cross-chain compatibility** - works across the Polkadot ecosystem
- **Decentralized authentication** - no central authority required
- **Enhanced privacy** - minimal data collection

## 🚀 Quick Start

### Express.js (Zero Config)

```bash
npm install @polkadot-auth/express
```

```typescript
import express from 'express';
import { polkadotAuth } from '@polkadot-auth/express';

const app = express();

// Zero config - works immediately
app.use('/auth', polkadotAuth());

app.listen(3000);
```

### Next.js

```bash
npm install @polkadot-auth/next
```

```typescript
// pages/api/auth/[...polkadot].ts
import { polkadotAuth } from '@polkadot-auth/next';

export default polkadotAuth({
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
});
```

### Core Package

```bash
npm install @polkadot-auth/core
```

```typescript
import { createPolkadotAuth, createPapiClient } from '@polkadot-auth/core';

const auth = createPolkadotAuth({
  defaultChain: 'kusama',
  providers: ['polkadot-js', 'talisman', 'subwallet'],
});

// PAPI client for direct blockchain interaction
const papiClient = createPapiClient({
  chain: 'kusama',
  endpoint: 'wss://kusama-rpc.polkadot.io',
});

await papiClient.connect();
const latestBlock = await papiClient.getLatestBlock();
```

## ✨ Features

### 🔐 SIWE-Style Authentication

- **EIP-4361 Compliant**: Standard authentication messages
- **Nonce Protection**: Replay attack prevention
- **Domain Binding**: Enhanced security
- **Request Tracking**: Audit trails
- **Resource Scoping**: Granular permissions

### 🏗️ Framework Agnostic

- **Express.js**: Full middleware support
- **Next.js**: API routes and pages
- **Remix**: Loader/action integration
- **Fastify**: Plugin architecture
- **Custom**: Use core package directly

### 💼 Multi-Wallet Support

- **Polkadot.js Extension**: Official browser extension
- **Talisman**: Popular wallet extension
- **SubWallet**: Feature-rich wallet
- **Nova Wallet**: Mobile with browser bridge
- **Custom Providers**: Extensible architecture

### ⛓️ Multi-Chain Support

- **Polkadot**: Main network
- **Kusama**: Canary network
- **Westend**: Test network
- **Rococo**: Parachain testnet
- **Custom Chains**: Any Substrate-based chain

### 🔒 Enterprise Security

- **JWT Sessions**: Stateless authentication
- **Database Sessions**: Persistent sessions
- **Rate Limiting**: Built-in protection
- **CORS Support**: Cross-origin security
- **TypeScript**: Full type safety

### ⚡ Modern Blockchain Integration

- **PAPI Integration**: Powered by Polkadot API for optimal performance
- **Type-Safe Blockchain Calls**: Generated type descriptors for Polkadot/Kusama
- **Light Client Support**: Smoldot integration for browser compatibility
- **WebSocket Providers**: High-performance blockchain connections
- **Real-time Updates**: Live blockchain data subscriptions

### 🌐 Browser Compatibility

- **Universal Crypto**: Works in both Node.js and browser environments
- **Web Crypto API**: Modern browser crypto support with fallbacks
- **React Components**: Ready-to-use UI components for React applications
- **TypeScript First**: Full type safety across all environments
- **Zero Config**: Works out of the box with sensible defaults

### 📦 Module System Support

- **ES Modules**: Native ES module support for modern bundlers (Vite, Webpack 5+)
- **CommonJS**: Full CommonJS support for Node.js and legacy bundlers
- **Dual Build**: Both module formats built automatically
- **Tree Shaking**: Optimized for modern bundlers with tree shaking support
- **TypeScript**: Full type definitions for both module systems

## 📦 Packages

| Package                  | Description             | Status   |
| ------------------------ | ----------------------- | -------- |
| `@polkadot-auth/core`    | Framework-agnostic core | ✅ Ready |
| `@polkadot-auth/express` | Express.js adapter      | ✅ Ready |
| `@polkadot-auth/next`    | Next.js adapter         | ✅ Ready |
| `@polkadot-auth/remix`   | Remix adapter           | ✅ Ready |
| `@polkadot-auth/ui`      | React UI components     | ✅ Ready |

## 🎯 Examples

### Express.js Example

```typescript
import express from 'express';
import { polkadotAuth, requireAuth } from '@polkadot-auth/express';

const app = express();

// Initialize auth with custom config
const auth = polkadotAuth({
  defaultChain: 'kusama',
  providers: ['polkadot-js', 'talisman'],
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
});

// Mount auth routes
app.use('/auth', auth);
```

### Next.js Example

```typescript
// middleware.ts
import { createAuthMiddleware } from '@polkadot-auth/next';

export default createAuthMiddleware({
  basePath: '/api/auth',
});

// app/api/auth/challenge/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const client_id = searchParams.get('client_id');
  const address = searchParams.get('address');
  const chain_id = searchParams.get('chain_id');

  // Your challenge logic here
  return NextResponse.json({
    challenge: `Sign this message...`,
    challenge_id: '...',
    nonce: '...',
    expires_at: '...',
  });
}
```

// Protected route
app.get('/protected', requireAuth(), (req, res) => {
res.json({ user: req.user });
});

app.listen(3000);

````

```typescript
// pages/api/auth/[...polkadot].ts
import { polkadotAuth } from '@polkadot-auth/next';

export default polkadotAuth({
  defaultChain: 'polkadot',
  providers: ['polkadot-js', 'talisman'],
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
});

// pages/protected.tsx
import { useSession } from '@polkadot-auth/next/client';

export default function ProtectedPage() {
  const { data: session } = useSession();

  if (!session) {
    return <div>Please sign in</div>;
  }

  return <div>Welcome, {session.address}!</div>;
}
````

### Remix Example

```tsx
// app/routes/api.auth.challenge.ts
import { createAuthApiRoutes } from '@polkadot-auth/remix';
import type { LoaderFunctionArgs } from '@remix-run/node';

const authRoutes = createAuthApiRoutes({
  sessionSecret: process.env.SESSION_SECRET || 'your-secret-key',
  sessionMaxAge: 3600, // 1 hour
});

export async function loader({ request }: LoaderFunctionArgs) {
  return authRoutes.challenge(request);
}

// app/routes/protected.tsx
import { createAuthMiddleware, getUserFromRequest } from '@polkadot-auth/remix';

const authMiddleware = createAuthMiddleware({
  sessionSecret: process.env.SESSION_SECRET || 'your-secret-key',
});

export async function loader({ request }: LoaderFunctionArgs) {
  // Check authentication
  const authResponse = await authMiddleware.requireAuth(request);
  if (authResponse) {
    return authResponse; // Redirect to login
  }

  // Get user data
  const user = await getUserFromRequest(request);

  return json({ user });
}

export default function ProtectedPage() {
  const { user } = useLoaderData<typeof loader>();

  return (
    <div>
      <h1>Protected Page</h1>
      <p>Welcome, {user?.address}!</p>
    </div>
  );
}
```

```tsx
// app/routes/api.auth.challenge.ts
import { createAuthApiRoutes } from '@polkadot-auth/remix';
import type { LoaderFunctionArgs } from '@remix-run/node';

const authRoutes = createAuthApiRoutes({
  sessionSecret: process.env.SESSION_SECRET || 'your-secret-key',
  sessionMaxAge: 3600, // 1 hour
});

export async function loader({ request }: LoaderFunctionArgs) {
  return authRoutes.challenge(request);
}

// app/routes/protected.tsx
import { createAuthMiddleware, getUserFromRequest } from '@polkadot-auth/remix';

const authMiddleware = createAuthMiddleware({
  sessionSecret: process.env.SESSION_SECRET || 'your-secret-key',
});

export async function loader({ request }: LoaderFunctionArgs) {
  // Check authentication
  const authResponse = await authMiddleware.requireAuth(request);
  if (authResponse) {
    return authResponse; // Redirect to login
  }

  // Get user data
  const user = await getUserFromRequest(request);

  return json({ user });
}

export default function ProtectedPage() {
  const { user } = useLoaderData<typeof loader>();

  return (
    <div>
      <h1>Protected Page</h1>
      <p>Welcome, {user?.address}!</p>
    </div>
  );
}
```

```tsx
// app/routes/api.auth.challenge.ts
import { createAuthApiRoutes } from '@polkadot-auth/remix';
import type { LoaderFunctionArgs } from '@remix-run/node';

const authRoutes = createAuthApiRoutes({
  sessionSecret: process.env.SESSION_SECRET || 'your-secret-key',
  sessionMaxAge: 3600, // 1 hour
});

export async function loader({ request }: LoaderFunctionArgs) {
  return authRoutes.challenge(request);
}

// app/routes/protected.tsx
import { createAuthMiddleware, getUserFromRequest } from '@polkadot-auth/remix';

const authMiddleware = createAuthMiddleware({
  sessionSecret: process.env.SESSION_SECRET || 'your-secret-key',
});

export async function loader({ request }: LoaderFunctionArgs) {
  // Check authentication
  const authResponse = await authMiddleware.requireAuth(request);
  if (authResponse) {
    return authResponse; // Redirect to login
  }

  // Get user data
  const user = await getUserFromRequest(request);

  return json({ user });
}

export default function ProtectedPage() {
  const { user } = useLoaderData<typeof loader>();

  return (
    <div>
      <h1>Protected Page</h1>
      <p>Welcome, {user?.address}!</p>
    </div>
  );
}
```

### Remix Example

```tsx
// app/routes/api.auth.challenge.ts
import { createAuthApiRoutes } from '@polkadot-auth/remix';
import type { LoaderFunctionArgs } from '@remix-run/node';

const authRoutes = createAuthApiRoutes({
  sessionSecret: process.env.SESSION_SECRET || 'your-secret-key',
  sessionMaxAge: 3600, // 1 hour
});

export async function loader({ request }: LoaderFunctionArgs) {
  return authRoutes.challenge(request);
}

// app/routes/protected.tsx
import { createAuthMiddleware, getUserFromRequest } from '@polkadot-auth/remix';

const authMiddleware = createAuthMiddleware({
  sessionSecret: process.env.SESSION_SECRET || 'your-secret-key',
});

export async function loader({ request }: LoaderFunctionArgs) {
  // Check authentication
  const authResponse = await authMiddleware.requireAuth(request);
  if (authResponse) {
    return authResponse; // Redirect to login
  }

  // Get user data
  const user = await getUserFromRequest(request);

  return json({ user });
}

export default function ProtectedPage() {
  const { user } = useLoaderData<typeof loader>();

  return (
    <div>
      <h1>Protected Page</h1>
      <p>Welcome, {user?.address}!</p>
    </div>
  );
}
```

### React Components

```tsx
import React from 'react';
import {
  PolkadotAuthProvider,
  PolkadotSignInButton,
  WalletSelector,
  PolkadotProfile,
  usePolkadotAuth,
} from '@polkadot-auth/ui';

function AuthComponent() {
  const { isConnected, address, connect, disconnect } = usePolkadotAuth();

  if (isConnected) {
    return (
      <div>
        <h2>Welcome, {address}!</h2>
        <PolkadotProfile address={address} onDisconnect={disconnect} />
      </div>
    );
  }

  return (
    <div>
      <PolkadotSignInButton
        onSignIn={(address, session) => console.log('Signed in:', address)}
        onError={error => console.error('Auth error:', error)}
      />
      <WalletSelector providers={['polkadot-js', 'talisman']} onSelect={connect} />
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

### Module System Usage

#### ES Modules (Recommended for Vite, Webpack 5+)

```typescript
// ES module import
import { createPolkadotAuth } from '@polkadot-auth/core';
import { PolkadotAuthProvider } from '@polkadot-auth/ui';

// Vite will automatically use the ES module version
const auth = createPolkadotAuth({
  defaultChain: 'kusama',
  providers: ['polkadot-js', 'talisman'],
});
```

#### CommonJS (Node.js, Webpack 4)

```typescript
// CommonJS require
const { createPolkadotAuth } = require('@polkadot-auth/core');
const { PolkadotAuthProvider } = require('@polkadot-auth/ui');

// Node.js will automatically use the CommonJS version
const auth = createPolkadotAuth({
  defaultChain: 'kusama',
  providers: ['polkadot-js', 'talisman'],
});
```

## 🔧 Configuration

### Environment Variables

```env
# Optional - uses defaults if not provided
POLKADOT_AUTH_SECRET=your-secret
POLKADOT_AUTH_URL=http://localhost:3000
POLKADOT_DEFAULT_CHAIN=kusama
```

### Advanced Configuration

```typescript
const auth = createPolkadotAuth({
  // Chain configuration
  defaultChain: 'kusama',
  chains: [
    {
      id: 'my-parachain',
      name: 'My Parachain',
      rpcUrl: 'wss://my-parachain-rpc.com',
      ss58Format: 42,
    },
  ],

  // Wallet providers
  providers: ['polkadot-js', 'talisman'],
  customProviders: [myCustomProvider],

  // Session management
  session: {
    strategy: 'database', // 'jwt' or 'database'
    maxAge: 7 * 24 * 60 * 60, // 7 days
    databaseUrl: 'postgresql://...',
  },

  // Security settings
  security: {
    enableNonce: true,
    enableDomainBinding: true,
    enableRequestTracking: true,
    challengeExpiration: 5 * 60, // 5 minutes
    allowedDomains: ['myapp.com'],
  },

  // UI configuration
  ui: {
    signInUrl: '/custom-signin',
    signOutUrl: '/custom-signout',
    errorUrl: '/custom-error',
  },
});
```

## 🔌 Extending

### Custom Wallet Provider

```typescript
import { createCustomProvider } from '@polkadot-auth/core';

const customProvider = createCustomProvider({
  id: 'my-wallet',
  name: 'My Custom Wallet',
  connect: async () => {
    // Implement connection logic
    return {
      provider: customProvider,
      accounts: [],
      signMessage: async message => 'signed-message',
      disconnect: async () => {},
    };
  },
  isAvailable: () => true,
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
};
```

## 🏗️ Architecture

### Core Components

1. **SIWEAuthService**: SIWE-style message generation and verification
2. **Wallet Providers**: Interface for different wallet implementations
3. **Chain Management**: Multi-chain support and configuration
4. **Session Management**: Session creation, validation, and refresh
5. **Database Adapters**: Support for multiple databases
6. **Framework Adapters**: Framework-specific integrations

### Message Format

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

## 🚀 Roadmap

### Phase 1: Core & Express ✅

- [x] Framework-agnostic core
- [x] Express.js adapter
- [x] SIWE-style authentication
- [x] Multi-wallet support
- [x] Multi-chain support
- [x] PAPI integration for optimal performance

### Phase 2: Framework Support 🚧

- [x] Next.js adapter
- [x] Remix adapter
- [ ] Fastify adapter
- [ ] Koa adapter

### Phase 3: UI Components ✅

- [x] React components
- [ ] Vue components
- [ ] Vanilla JS components
- [ ] Styling themes

### Phase 4: Enterprise Features 📋

- [ ] OpenID Connect provider
- [ ] Advanced audit trails
- [ ] Rate limiting
- [ ] Professional support

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🔗 Links

- [Documentation](https://polkadot-auth.dev)
- [Examples](https://github.com/polkadot-auth/examples)
- [Discord](https://discord.gg/polkadot-auth)
- [Twitter](https://twitter.com/polkadot_auth)

---

**Built with ❤️ for the Polkadot ecosystem**
