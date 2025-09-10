# @polkadot-auth/telegram

Telegram authentication provider for Polkadot SSO, enabling Web2 users to authenticate with Polkadot applications using QR codes and bot interactions.

## Features

- 🔐 **Secure Authentication**: SIWE-style challenge-response authentication
- 📱 **QR Code Flow**: Easy mobile authentication via QR code scanning
- 🤖 **Telegram Bot**: Interactive bot for wallet management and authentication
- 🔒 **Encrypted Storage**: Secure wallet key storage with user-specific encryption
- ⚡ **Real-time**: Live authentication status updates and polling
- 🛡️ **Security First**: Rate limiting, challenge expiration, and secure key management

## Installation

```bash
npm install @polkadot-auth/telegram
```

## Quick Start

### 1. Create a Telegram Bot

1. Message [@BotFather](https://t.me/BotFather) on Telegram
2. Use `/newbot` command to create a new bot
3. Save the bot token and username

### 2. Basic Setup

```typescript
import { createPolkadotAuth } from '@polkadot-auth/core';
import { createTelegramProvider } from '@polkadot-auth/telegram';

// Create Telegram provider
const telegramProvider = createTelegramProvider({
  botToken: process.env.TELEGRAM_BOT_TOKEN!,
  botUsername: process.env.TELEGRAM_BOT_USERNAME!,
  ssoServerUrl: process.env.SSO_SERVER_URL!,
  autoCreateWallet: true,
});

// Initialize Polkadot Auth with Telegram
const auth = createPolkadotAuth({
  providers: ['polkadot-js', 'talisman', 'telegram'],
  customProviders: [telegramProvider],
  defaultChain: 'kusama',
});

// Start the bot
await telegramProvider.startBot();
```

### 3. Environment Variables

```bash
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_BOT_USERNAME=YourPolkadotAuthBot
SSO_SERVER_URL=http://localhost:3001
```

## Configuration

```typescript
interface TelegramProviderConfig {
  botToken: string; // Required: Bot token from @BotFather
  botUsername: string; // Required: Bot username (without @)
  ssoServerUrl: string; // Required: SSO server URL for callbacks
  qrCodeSize?: number; // Optional: QR code size (default: 256)
  autoCreateWallet?: boolean; // Optional: Auto-create wallets (default: true)
  challengeExpiration?: number; // Optional: Challenge expiration in ms (default: 5min)
  encryptionKey?: string; // Optional: Custom encryption key
}
```

## Usage

### Authentication Flow

```typescript
// 1. Generate QR code for authentication
const qrData = await telegramProvider.generateQRCode(challengeId, message);

// 2. Display QR code to user
console.log('QR Code:', qrData.qrCode);
console.log('Deep Link:', qrData.deepLink);

// 3. Poll for authentication status
const checkStatus = async () => {
  const challenge = await telegramProvider.checkAuthStatus(challengeId);

  if (challenge?.status === 'completed') {
    console.log('Authentication successful!');
    console.log('User ID:', challenge.userId);
    console.log('Wallet Address:', challenge.walletAddress);
  } else if (challenge?.status === 'failed') {
    console.log('Authentication failed');
  } else {
    // Still pending, check again later
    setTimeout(checkStatus, 1000);
  }
};

checkStatus();
```

### Wallet Management

```typescript
// Create wallet for user
const wallet = await telegramProvider.createWallet(userId);

// Get user's wallet
const userWallet = await telegramProvider.getWallet(userId);

// Sign message
const signature = await telegramProvider.signMessage(userId, message);

// Verify signature
const isValid = await telegramProvider.verifySignature(userId, message, signature);
```

### Event Handling

```typescript
// Listen to provider events
telegramProvider.on('auth:success', ({ challengeId, userId, address }) => {
  console.log(`User ${userId} authenticated with wallet ${address}`);
});

telegramProvider.on('wallet:created', ({ userId, address }) => {
  console.log(`Wallet created for user ${userId}: ${address}`);
});

telegramProvider.on('auth:failure', ({ challengeId, error }) => {
  console.log(`Authentication failed for ${challengeId}: ${error}`);
});
```

## Telegram Bot Commands

Users can interact with the bot using these commands:

- `/start` - Start the bot and see welcome message
- `/help` - Show help information
- `/wallet` - Create or manage your Polkadot wallet
- `/auth` - Start authentication process
- `/status` - Check your authentication status

## Security Features

- **Encrypted Key Storage**: Private keys are encrypted with user-specific keys
- **Challenge Expiration**: Authentication challenges expire after 5 minutes
- **Rate Limiting**: Built-in rate limiting for bot interactions
- **Secure Signing**: All message signing uses secure cryptographic methods
- **Session Management**: Secure session handling with automatic cleanup

## API Reference

### TelegramProvider

#### Methods

- `generateQRCode(challengeId: string, message: string): Promise<TelegramQRData>`
- `checkAuthStatus(challengeId: string): Promise<TelegramChallenge | null>`
- `createWallet(userId: number): Promise<TelegramWallet>`
- `getWallet(userId: number): Promise<TelegramWallet | null>`
- `signMessage(userId: number, message: string): Promise<string>`
- `verifySignature(userId: number, message: string, signature: string): Promise<boolean>`
- `startBot(): Promise<void>`
- `stopBot(): Promise<void>`

#### Events

- `auth:start` - Authentication started
- `auth:success` - Authentication completed successfully
- `auth:failure` - Authentication failed
- `auth:expired` - Authentication challenge expired
- `wallet:created` - New wallet created
- `wallet:error` - Wallet operation failed

## Development

### Building

```bash
npm run build
```

### Testing

```bash
npm test
```

### Type Checking

```bash
npm run type-check
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

- GitHub Issues: [Report bugs or request features](https://github.com/CoachCoe/polkadot-sso/issues)
- Documentation: [Full documentation](https://github.com/CoachCoe/polkadot-sso/tree/main/docs)
- Telegram: [Join our community](https://t.me/polkadot_auth)
