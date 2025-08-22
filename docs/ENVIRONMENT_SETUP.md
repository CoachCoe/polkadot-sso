# Environment Configuration Guide

## Required Environment Variables

Create a `.env` file in your project root with these variables:

```bash
# === Core Application ===
NODE_ENV=development
PORT=3000
SESSION_SECRET=your-super-secure-session-secret-minimum-32-characters-long

# === Database Configuration ===
DATABASE_ENCRYPTION_KEY=your-32-character-encryption-key-minimum-required

# === Kusama Blockchain Configuration ===
KUSAMA_ENDPOINT=wss://kusama-rpc.polkadot.io
KUSAMA_ACCOUNT_TYPE=sr25519
KUSAMA_ACCOUNT_SEED=your_64_character_hex_seed_for_kusama_account_operations

# === Security Configuration ===
JWT_ACCESS_TOKEN_EXPIRES_IN=15m
JWT_REFRESH_TOKEN_EXPIRES_IN=7d
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# === Production Flags ===
ENABLE_REAL_KUSAMA_STORAGE=false
KUSAMA_TESTNET_MODE=true
MOCK_KUSAMA_RESPONSES=true
```

## Generating Secure Keys

```bash
# Generate encryption key
node -e "console.log('DATABASE_ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('hex'))"

# Generate session secret
node -e "console.log('SESSION_SECRET=' + require('crypto').randomBytes(32).toString('base64'))"

# Generate Kusama account seed
node -e "console.log('KUSAMA_ACCOUNT_SEED=' + require('crypto').randomBytes(32).toString('hex'))"
```

## Production Deployment

For production, set:
- `NODE_ENV=production`
- `ENABLE_REAL_KUSAMA_STORAGE=true`
- `KUSAMA_TESTNET_MODE=false`
- `MOCK_KUSAMA_RESPONSES=false`
