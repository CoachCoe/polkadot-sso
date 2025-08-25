# @polkadot-auth/next

Next.js adapter for Polkadot authentication with SIWE-style message signing.

## Features

- 🔐 **SIWE-style Authentication** - Sign-in with Ethereum compatible message format
- 🎯 **Next.js Integration** - Built specifically for Next.js 14+
- 🧩 **API Routes** - Pre-built authentication endpoints
- 🛡️ **Middleware** - Route protection and authentication checks
- ⚛️ **React Hooks** - Easy-to-use authentication state management
- 🎨 **UI Components** - Ready-to-use sign-in components
- 🔒 **TypeScript** - Full type safety

## Installation

```bash
npm install @polkadot-auth/next
```

> **Note**: The Next.js adapter provides placeholder React components and hooks that require React to be installed in your application. The actual implementations are provided as templates in the source code for you to customize and use in your project.

## Quick Start

### 1. Setup API Routes

Create your API routes in `pages/api/auth/` or `app/api/auth/`:

```typescript
// pages/api/auth/challenge.ts
import { createAuthApiRoutes } from '@polkadot-auth/next';

const authRoutes = createAuthApiRoutes({
  basePath: '/api/auth',
});

export default authRoutes['/api/auth/challenge'];
```

### 2. Setup Middleware

Create `middleware.ts` in your project root:

```typescript
import { createAuthMiddleware } from '@polkadot-auth/next';

export default createAuthMiddleware({
  basePath: '/api/auth',
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

### 3. Use in Components

The Next.js adapter provides placeholder components and hooks that require React to be installed in your application. You can implement your own components or use the provided templates:

```tsx
// Custom implementation example
import { useState, useEffect } from 'react';

export default function HomePage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Check authentication status
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/session');
        if (response.ok) {
          const session = await response.json();
          setIsAuthenticated(true);
          setUser(session.user);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      }
    };

    checkAuth();
  }, []);

  return (
    <div>
      {isAuthenticated ? (
        <p>Welcome, {user?.address}!</p>
      ) : (
        <button onClick={() => {/* Your sign-in logic */}}>
          Sign In with Polkadot
        </button>
      )}
    </div>
  );
}
```

## API Reference

### Configuration

```typescript
interface NextAuthConfig {
  basePath?: string;           // API route base path (default: '/api/auth')
  providers?: string[];        // Supported wallet providers
  chains?: string[];          // Supported chains
  session?: {
    secret?: string;          // Session secret
    maxAge?: number;          // Session max age
  };
  security?: {
    csrf?: boolean;           // Enable CSRF protection
    rateLimit?: boolean;      // Enable rate limiting
  };
}
```

### API Routes

The adapter provides these endpoints:

- `GET /api/auth/challenge` - Get authentication challenge
- `POST /api/auth/verify` - Verify signature
- `POST /api/auth/signout` - Sign out
- `GET /api/auth/callback` - OAuth callback

### Hooks

#### `useAuthState()`
Placeholder hook with example implementation.

```tsx
// The useAuthState hook is a placeholder that requires React
// See the hook source for a complete implementation example
import { useAuthState } from '@polkadot-auth/next';

const { isAuthenticated, user } = useAuthState();
```

#### `useSignIn()`
Placeholder hook with example implementation.

```tsx
// The useSignIn hook is a placeholder that requires React
// See the hook source for a complete implementation example
import { useSignIn } from '@polkadot-auth/next';

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
import { useSignOut } from '@polkadot-auth/next';

const { signOut, isLoading } = useSignOut();

const handleSignOut = async () => {
  await signOut();
};
```

### Components

#### `SignInButton`
Placeholder component with example implementation.

```tsx
// The SignInButton component is a placeholder that requires React
// See the component source for a complete implementation example
import { SignInButton } from '@polkadot-auth/next';

<SignInButton
  onSuccess={(session) => console.log('Success!', session)}
  onError={(error) => console.error('Error!', error)}
>
  Custom Button Text
</SignInButton>
```

#### `AuthProvider`
Placeholder component with example implementation.

```tsx
// The AuthProvider component is a placeholder that requires React
// See the component source for a complete implementation example
import { AuthProvider } from '@polkadot-auth/next';

function App({ children }) {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
}
```

### Middleware

#### `createAuthMiddleware(config)`
Create authentication middleware for Next.js.

#### `requireAuth()`
Middleware that requires authentication.

#### `optionalAuth()`
Middleware that allows optional authentication.

## Examples

### Protected Page

```tsx
// pages/protected.tsx
import { useAuthState } from '@polkadot-auth/next';

export default function ProtectedPage() {
  const { isAuthenticated, user } = useAuthState();

  if (!isAuthenticated) {
    return <div>Please sign in to access this page.</div>;
  }

  return (
    <div>
      <h1>Protected Content</h1>
      <p>Welcome, {user?.address}!</p>
    </div>
  );
}
```

### Custom Sign-in Flow

```tsx
import { useSignIn } from '@polkadot-auth/next';

export default function CustomSignIn() {
  const { signIn, isLoading, error } = useSignIn();

  const handleCustomSignIn = async () => {
    try {
      const session = await signIn('5EJP9eSB1HpzjpuCJrna8KMcA6mmgaT8W4gSmwHaVDn25gHQ', 'polkadot');
      console.log('Signed in successfully!', session);
    } catch (err) {
      console.error('Sign in failed:', err);
    }
  };

  return (
    <button onClick={handleCustomSignIn} disabled={isLoading}>
      {isLoading ? 'Signing in...' : 'Custom Sign In'}
    </button>
  );
}
```

## Security

- **Nonce-based Replay Protection** - Each challenge includes a unique nonce
- **Domain Binding** - Messages are bound to the requesting domain
- **Expiration Timestamps** - Challenges expire after a configurable time
- **Signature Verification** - Cryptographic verification of wallet signatures

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT
