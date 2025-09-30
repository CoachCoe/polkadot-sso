# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Polkadot SSO is a production-ready Better Auth plugin for Polkadot wallet authentication. It provides secure SIWE-style (Sign-In with Ethereum adapted for Polkadot) authentication with multi-chain support.

## Technology Stack

- **Package Manager**: Bun (v1.2.22) - Use `bun` commands, not `npm` or `pnpm`
- **Monorepo**: Turborepo with workspaces (apps/*, packages/*)
- **Runtime**: Node.js >= 20
- **Language**: TypeScript
- **Testing**: Jest for package testing
- **Authentication**: Better Auth (v0.7.0) plugin architecture

## Common Commands

### Development
```bash
bun run dev          # Start all workspace dev servers
bun run build        # Build all workspaces
bun run test         # Run all tests
bun run lint         # Lint all code
bun run check-types  # Type-check all workspaces
bun run format       # Format code with Prettier
bun run clean        # Clean build artifacts
```

### Package-Specific Commands
```bash
# Better Auth Plugin (packages/better-auth-polkadot/)
bun run build           # Compile TypeScript
bun run dev             # Watch mode compilation
bun run test            # Run Jest tests
bun run test:watch      # Watch mode testing
bun run test:coverage   # Generate coverage report

# SSO Server (apps/sso/)
bun run dev             # Start development server with tsx watch
bun run build           # Build server
bun run start           # Run production server
bun run check-types     # Type-check without emitting

# Example App (apps/example/)
bun run dev             # Start Nuxt dev server
bun run build           # Build for production
bun run preview         # Preview production build
```

## Architecture

### Monorepo Structure
- **packages/better-auth-polkadot/** - Core Better Auth plugin (main deliverable)
- **packages/better-auth-github/** - GitHub OAuth integration plugin
- **packages/core/** - Shared core utilities
- **packages/config-eslint/** - Shared ESLint configuration
- **packages/config-typescript/** - Shared TypeScript configuration
- **apps/sso/** - Minimal Better Auth server implementation
- **apps/example/** - Nuxt.js example application
- **apps/docs/** - Documentation site

### Better Auth Plugin Architecture

The core plugin follows Better Auth's plugin pattern:

1. **Plugin Entry Point** (`packages/better-auth-polkadot/src/plugin.ts`)
   - Exports `polkadotPlugin()` function that returns a Better Auth plugin
   - Implements challenge-response authentication flow
   - Handles cryptographic signature verification
   - Manages multi-chain provider configuration

2. **Client-Side Logic** (`packages/better-auth-polkadot/src/client.ts`)
   - `createPolkadotAuthClient()` - Core authentication client
   - Wallet connection via @polkadot/extension-dapp
   - Challenge generation and signature handling
   - Session management with JWT tokens

3. **React Integration** (`packages/better-auth-polkadot/src/hooks/`)
   - `usePolkadotAuth()` - Main React hook for authentication
   - `PolkadotWalletSelector` - Pre-built UI component
   - Manages wallet connection, account selection, sign in/out

4. **Cryptographic Utilities** (`packages/better-auth-polkadot/src/crypto.ts`)
   - Signature verification using @polkadot/util-crypto
   - Challenge generation (timestamp + nonce + address)
   - SS58 address format validation

### Authentication Flow

1. User connects Polkadot wallet → Client fetches accounts
2. User selects account/chain → Client requests challenge from server
3. Server generates cryptographic challenge → Returns to client
4. User signs challenge with wallet → Client sends signature to server
5. Server verifies signature → Creates JWT session
6. Client stores JWT → User is authenticated

### Database Schema

Minimal schema managed by Better Auth:
- `user` - Core user records
- `session` - JWT session management
- `polkadot_account` - Polkadot-specific account data (address, chain, provider)

## Key Implementation Details

### Multi-Chain Support
- Configure providers in `polkadotPlugin()` options
- Each provider specifies: id, name, chain, rpcUrl, ss58Format, decimals, tokenSymbol
- Supported chains: Polkadot (ss58: 0), Kusama (ss58: 2), Westend (ss58: 42)

### Security Features
- Challenge-response prevents replay attacks
- 5-minute challenge expiration
- Cryptographic signature verification
- JWT-based stateless sessions
- SS58 address validation

### Testing Strategy
- Unit tests in `packages/better-auth-polkadot/src/__tests__/`
- 80%+ test coverage requirement
- Jest configuration with TypeScript support
- Mock Polkadot wallet interactions for testing

## Environment Variables

```bash
# Required for SSO server
SESSION_SECRET=your-32-character-secret

# Optional - Chain RPC URLs
POLKADOT_RPC_URL=wss://rpc.polkadot.io
KUSAMA_RPC_URL=wss://kusama-rpc.polkadot.io
WESTEND_RPC_URL=wss://westend-rpc.polkadot.io

# Optional - Database
DATABASE_URL=file:./data/auth.db
```

## Git Workflow

- Main development branch: `shawn`
- Clean working directory maintained
- Husky pre-commit hooks enabled
- Recent work focused on Better Auth plugin refactor (completed)

## Important Notes

1. **Use Bun**: This project uses Bun as the package manager. Always use `bun` commands.
2. **Turborepo**: Commands run across all workspaces. Use `--filter` for specific packages.
3. **Better Auth Plugins**: Follow Better Auth plugin patterns for new authentication providers.
4. **Stateless Design**: Architecture is designed for horizontal scaling with JWT sessions.
5. **Cryptographic Security**: All authentication relies on signature verification - never skip this.
6. **Test Coverage**: Maintain 80%+ test coverage for core plugin functionality.

## Recent Refactor

The project was recently refactored from a monolithic Express.js architecture to a modern Better Auth plugin:
- Removed 20+ route files, 20+ database tables, custom middleware
- Added Better Auth plugin, React hooks, comprehensive tests
- 90% reduction in code complexity
- Production-ready with enhanced security and scalability