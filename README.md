# Polkadot Auth Shared

Shared authentication components and utilities for Polkadot SSO.

## Packages

- `@polkadot-auth/core` - Core authentication logic
- `@polkadot-auth/client-sdk` - Client-side SDK
- `@polkadot-auth/ui` - React UI components
- `@polkadot-auth/express` - Express.js adapter
- `@polkadot-auth/next` - Next.js adapter
- `@polkadot-auth/remix` - Remix adapter

## Installation

```bash
npm install @polkadot-auth/core @polkadot-auth/client-sdk @polkadot-auth/ui
```

## Usage

```typescript
import { PolkadotAuthProvider } from '@polkadot-auth/ui';
import { createPolkadotAuth } from '@polkadot-auth/core';

const auth = createPolkadotAuth({
  providers: ['polkadot-js', 'talisman'],
  defaultChain: 'kusama'
});
```

## Development

```bash
npm install
npm run build
```
