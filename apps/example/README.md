# Polkadot SSO - Vue/Nuxt Example

This is a Vue/Nuxt implementation of the Polkadot SSO authentication system, demonstrating wallet-based authentication for the Polkadot ecosystem.

## Features

- 🔐 **Wallet Authentication** - Sign in with Polkadot.js, Talisman, SubWallet, and other compatible wallets
- 🚀 **Vue 3 & Nuxt 4** - Built with the latest Vue and Nuxt frameworks
- 📦 **Pinia State Management** - Centralized authentication state
- 🎨 **Nuxt UI Components** - Beautiful, accessible UI components
- 🔒 **Protected Routes** - Route middleware for authentication
- 🌙 **Dark Mode** - Automatic dark mode support
- 📱 **Responsive Design** - Works on desktop and mobile

## Prerequisites

- Node.js 20+ or Bun 1.2.22+
- A Polkadot wallet extension (e.g., Polkadot.js)
- The SSO server running (see `/apps/sso`)

## Installation

1. Install dependencies:

```bash
pnpm install
# or
bun install
```

2. Copy the environment variables:

```bash
cp .env.example .env
```

3. Update `.env` with your configuration:

```env
NUXT_PUBLIC_SSO_SERVER_URL=http://localhost:3001
NUXT_PUBLIC_SSO_CLIENT_ID=demo-client
NUXT_PUBLIC_SSO_CLIENT_SECRET=default-client-secret-for-development-only
NUXT_PUBLIC_SSO_REDIRECT_URL=http://localhost:3000/callback
NUXT_PUBLIC_DEFAULT_CHAIN=westend
```

## Running the Application

### Development

```bash
# Start the SSO server first (in apps/sso directory)
cd ../sso
bun run dev

# In another terminal, start the Vue/Nuxt app
cd apps/example
pnpm dev
# or
bun dev
```

The application will be available at `http://localhost:3000`

### Production Build

```bash
# Build the application
pnpm build

# Preview the production build
pnpm preview
```

## Project Structure

```
app/
├── assets/           # CSS and static assets
├── components/       # Vue components
│   ├── AppLayout.vue
│   ├── LoginCard.vue
│   └── ...
├── composables/      # Vue composables
│   └── useWallet.ts
├── middleware/       # Route middleware
│   ├── auth.ts
│   └── guest.ts
├── pages/           # Application pages
│   ├── index.vue
│   ├── login.vue
│   ├── dashboard.vue
│   └── callback.vue
├── services/        # Business logic
│   └── authService.ts
├── stores/          # Pinia stores
│   └── auth.ts
└── app.vue          # Root component
```

## Authentication Flow

1. **Connect Wallet**: User connects their Polkadot wallet extension
2. **Select Account**: User selects which account to authenticate with
3. **Sign Challenge**: User signs a cryptographic challenge with their wallet
4. **Verify Signature**: Server verifies the signature and issues JWT tokens
5. **Access Protected Routes**: User can access authenticated areas of the app

## Key Components

### AuthService (`services/authService.ts`)
Handles all authentication API calls:
- Creating challenges
- Verifying signatures
- Managing tokens
- Session management

### Auth Store (`stores/auth.ts`)
Pinia store for authentication state:
- Current session
- Authentication status
- Loading states
- Error handling

### useWallet Composable (`composables/useWallet.ts`)
Vue composable for wallet interactions:
- Connecting to wallet extensions
- Getting available accounts
- Signing messages
- Managing wallet state

### LoginCard Component (`components/LoginCard.vue`)
Complete login UI with:
- Wallet connection
- Account selection
- Chain selection
- Sign in flow

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NUXT_PUBLIC_SSO_SERVER_URL` | SSO server URL | `http://localhost:3001` |
| `NUXT_PUBLIC_SSO_CLIENT_ID` | Client identifier | `demo-client` |
| `NUXT_PUBLIC_SSO_CLIENT_SECRET` | Client secret (dev only) | `default-client-secret...` |
| `NUXT_PUBLIC_SSO_REDIRECT_URL` | OAuth callback URL | `http://localhost:3000/callback` |
| `NUXT_PUBLIC_DEFAULT_CHAIN` | Default blockchain | `westend` |

## Security Considerations

- **Client Secret**: Never expose the client secret in production frontend code
- **Token Storage**: Consider using httpOnly cookies instead of localStorage for production
- **HTTPS**: Always use HTTPS in production
- **CORS**: Configure proper CORS settings on the SSO server

## Troubleshooting

### No wallet found
- Install Polkadot.js extension from [polkadot.js.org/extension](https://polkadot.js.org/extension/)
- Refresh the page after installation
- Ensure the extension is enabled for the site

### Signature verification fails
- Make sure the SSO server is running
- Check that the address format matches
- Verify the challenge hasn't expired (5 minute TTL)

### CORS errors
- Update `ALLOWED_ORIGINS` in the SSO server `.env`
- Ensure the client URL is whitelisted

## Contributing

Feel free to submit issues and pull requests.

## License

MIT