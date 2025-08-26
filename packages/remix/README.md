# @polkadot-auth/remix

Remix adapter for Polkadot authentication with SIWE-style message signing.

## Features

- 🔐 **SIWE-style Authentication** - Sign-In with Ethereum compatible message format
- 🎯 **Remix Integration** - Native Remix API routes and middleware
- 🔒 **Session Management** - HTTP-only cookies with secure session handling
- 🛡️ **Type Safety** - Full TypeScript support
- 🎨 **React Components** - Ready-to-use UI components (placeholder templates)
- 🔧 **Middleware Support** - Route protection and authentication helpers
- 🌐 **Multi-Chain** - Support for Polkadot, Kusama, Westend, and Rococo

## Installation

```bash
npm install @polkadot-auth/remix
```

> **Note**: The Remix adapter provides placeholder React components and hooks that require React/Remix to be installed in your application. The actual implementations are provided as templates in the source code for you to customize and use in your project.

## Quick Start

### 1. Setup API Routes

Create your Remix API routes:

```tsx
// app/routes/api.auth.challenge.ts
import { createAuthApiRoutes } from '@polkadot-auth/remix';

const authRoutes = createAuthApiRoutes({
  sessionSecret: process.env.SESSION_SECRET || 'your-secret-key',
  sessionMaxAge: 3600, // 1 hour
});

export async function loader({ request }: LoaderFunctionArgs) {
  return authRoutes.challenge(request);
}
```

```tsx
// app/routes/api.auth.verify.ts
import { createAuthApiRoutes } from '@polkadot-auth/remix';

const authRoutes = createAuthApiRoutes({
  sessionSecret: process.env.SESSION_SECRET || 'your-secret-key',
});

export async function action({ request }: ActionFunctionArgs) {
  return authRoutes.verify(request);
}
```

```tsx
// app/routes/api.auth.signout.ts
import { createAuthApiRoutes } from '@polkadot-auth/remix';

const authRoutes = createAuthApiRoutes({
  sessionSecret: process.env.SESSION_SECRET || 'your-secret-key',
});

export async function action({ request }: ActionFunctionArgs) {
  return authRoutes.signOut(request);
}
```

```tsx
// app/routes/api.auth.session.ts
import { createAuthApiRoutes } from '@polkadot-auth/remix';

const authRoutes = createAuthApiRoutes({
  sessionSecret: process.env.SESSION_SECRET || 'your-secret-key',
});

export async function loader({ request }: LoaderFunctionArgs) {
  return authRoutes.session(request);
}
```

### 2. Use in Components

The Remix adapter provides placeholder components and hooks that require React/Remix to be installed in your application. You can implement your own components or use the provided templates:

```tsx
// Custom implementation example
import { useState, useEffect } from 'react';
import { useFetcher } from '@remix-run/react';

export default function HomePage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const fetcher = useFetcher();

  useEffect(() => {
    // Check authentication status on mount
    fetcher.load('/api/auth/session');
  }, []);

  useEffect(() => {
    if (fetcher.data) {
      setIsAuthenticated(fetcher.data.isAuthenticated);
      setUser(fetcher.data.user);
    }
  }, [fetcher.data]);

  return (
    <div>
      {isAuthenticated ? (
        <div>
          <p>Welcome, {user?.address}!</p>
          <button
            onClick={() => fetcher.submit({}, { method: 'post', action: '/api/auth/signout' })}
          >
            Sign Out
          </button>
        </div>
      ) : (
        <div>
          <p>Please sign in to continue</p>
          <SignInButton />
        </div>
      )}
    </div>
  );
}
```

### 3. Protected Routes

Use middleware to protect routes:

```tsx
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

## API Reference

### Configuration

#### `RemixAuthConfig`

```tsx
interface RemixAuthConfig {
  basePath?: string; // API route base path (default: '/api/auth')
  sessionSecret: string; // Secret for session encryption
  sessionMaxAge?: number; // Session duration in seconds (default: 3600)
  cors?: {
    // CORS configuration
    origin?: string | string[] | boolean;
    credentials?: boolean;
  };
}
```

### API Routes

#### `createAuthApiRoutes(config)`

Creates authentication API route handlers.

```tsx
const authRoutes = createAuthApiRoutes(config);

// Available methods:
await authRoutes.challenge(request); // GET /api/auth/challenge
await authRoutes.verify(request); // POST /api/auth/verify
await authRoutes.signOut(request); // POST /api/auth/signout
await authRoutes.session(request); // GET /api/auth/session
```

### Middleware

#### `createAuthMiddleware(config)`

Creates authentication middleware.

```tsx
const authMiddleware = createAuthMiddleware(config);

// Available methods:
await authMiddleware.requireAuth(request); // Redirect if not authenticated
await authMiddleware.optionalAuth(request); // Continue regardless of auth status
```

#### `getUserFromRequest(request)`

Extract user data from request.

```tsx
const user = await getUserFromRequest(request);
// Returns: { address, chain, sessionId, authenticatedAt } | null
```

#### `isAuthenticated(request)`

Check if request is authenticated.

```tsx
const authenticated = await isAuthenticated(request);
// Returns: boolean
```

### React Components

#### `SignInButton`

Placeholder component with example implementation.

```tsx
// The SignInButton component is a placeholder that requires React
// See the component source for a complete implementation example
import { SignInButton } from '@polkadot-auth/remix';

<SignInButton
  onSuccess={session => console.log('Success!', session)}
  onError={error => console.error('Error!', error)}
>
  Custom Button Text
</SignInButton>;
```

#### `useAuthState()`

Placeholder hook with example implementation.

```tsx
// The useAuthState hook is a placeholder that requires React
// See the hook source for a complete implementation example
import { useAuthState } from '@polkadot-auth/remix';

const { isAuthenticated, user } = useAuthState();
```

#### `useSignIn()`

Placeholder hook with example implementation.

```tsx
// The useSignIn hook is a placeholder that requires React
// See the hook source for a complete implementation example
import { useSignIn } from '@polkadot-auth/remix';

const { signIn, isLoading, error } = useSignIn();

const handleSignIn = async () => {
  await signIn('5EJP9eSB1HpzjpuCJrna8KMcA6mmgaT8W4gSmwHaVDn25gHQ', 'polkadot');
};
```

#### `useSignOut()`

Placeholder hook with example implementation.

```tsx
// The useSignOut hook is a placeholder that requires React
// See the hook source for a complete implementation example
import { useSignOut } from '@polkadot-auth/remix';

const { signOut, isLoading } = useSignOut();

const handleSignOut = async () => {
  await signOut();
};
```

#### `AuthProvider`

Placeholder component with example implementation.

```tsx
// The AuthProvider component is a placeholder that requires React
// See the component source for a complete implementation example
import { AuthProvider } from '@polkadot-auth/remix';

function App({ children }) {
  return <AuthProvider>{children}</AuthProvider>;
}
```

## Examples

### Basic Authentication Flow

```tsx
// app/routes/login.tsx
import { useState } from 'react';
import { useFetcher } from '@remix-run/react';

export default function LoginPage() {
  const [address, setAddress] = useState('');
  const [chain, setChain] = useState('polkadot');
  const fetcher = useFetcher();

  const handleSignIn = async () => {
    // 1. Get challenge
    const challengeResponse = await fetch(
      `/api/auth/challenge?client_id=remix-app&address=${address}&chain_id=${chain}`
    );
    const challengeData = await challengeResponse.json();

    // 2. Sign with wallet (implement actual wallet integration)
    const signature = '0x' + Math.random().toString(16).substring(2, 66);

    // 3. Verify signature
    fetcher.submit(
      {
        signature,
        challenge_id: challengeData.challenge_id,
        address,
        message: challengeData.challenge,
      },
      { method: 'post', action: '/api/auth/verify' }
    );
  };

  return (
    <div>
      <h1>Sign In with Polkadot</h1>
      <input
        type='text'
        value={address}
        onChange={e => setAddress(e.target.value)}
        placeholder='Enter your address'
      />
      <select value={chain} onChange={e => setChain(e.target.value)}>
        <option value='polkadot'>Polkadot</option>
        <option value='kusama'>Kusama</option>
      </select>
      <button onClick={handleSignIn}>Sign In</button>
    </div>
  );
}
```

## Security

- **Session Management**: Uses HTTP-only cookies for session storage
- **CSRF Protection**: Implements proper CSRF protection measures
- **Input Validation**: Validates all input parameters
- **Error Handling**: Secure error responses without information leakage

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT
