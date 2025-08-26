# Kusama Integration Quick Start

## 🚀 Get Started in 5 Minutes

### **Step 1: Create Kusama Account**

1. **Install Polkadot.js Extension**
   - Go to [Polkadot.js Extension](https://polkadot.js.org/extension/)
   - Install for your browser

2. **Create Account**
   - Open extension
   - Click "Create new account"
   - Choose "Kusama" network
   - Save your seed phrase securely
   - Copy your account address (starts with `5`)

3. **Export Account Seed**
   - Right-click your account in extension
   - Select "Export account"
   - Copy the "Secret seed" (32-byte hex string)

### **Step 2: Get Test KSM (Development)**

For testing, use the **Westend testnet** (free):

1. **Get Test KSM**
   - Go to [Westend Faucet](https://wiki.polkadot.network/docs/learn-DOT#getting-westies)
   - Request test KSM (free)

2. **Or use our setup script**

   ```bash
   npm run setup:kusama
   ```

   - Choose "y" for testnet
   - Enter your account seed
   - The script will configure everything automatically

### **Step 3: Configure Environment**

Add to your `.env` file:

```bash
# For testnet (development - free)
KUSAMA_ENDPOINT=wss://westend-rpc.polkadot.io
KUSAMA_ACCOUNT_SEED=your-32-byte-account-seed-hex
KUSAMA_ACCOUNT_TYPE=sr25519

# For mainnet (production - requires real KSM)
# KUSAMA_ENDPOINT=wss://kusama-rpc.polkadot.io
# KUSAMA_ACCOUNT_SEED=your-32-byte-account-seed-hex
# KUSAMA_ACCOUNT_TYPE=sr25519
```

### **Step 4: Test the Integration**

```bash
# Start the application
npm run dev

# Run the hybrid demo
npm run demo:hybrid

# Test Kusama connection
curl -X GET http://localhost:3000/api/hybrid-credentials/storage/kusama/test
```

### **Step 5: Create Your First Credential**

```bash
# Create credential with Kusama integration
curl -X POST http://localhost:3000/api/hybrid-credentials/credentials \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "user_address": "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
    "credential_type_id": "your-credential-type-id",
    "credential_data": {
      "degree": "PhD",
      "field": "Computer Science",
      "institution": "MIT"
    },
    "storage_preference": "hybrid",
    "pin_to_ipfs": true,
    "store_on_kusama": true
  }'
```

## 🎯 What You Get

✅ **Immutable Verification**: Credentials verified on Kusama blockchain  
✅ **Tamper-Proof Timestamps**: Permanent record of credential issuance  
✅ **Decentralized Storage**: IPFS for censorship-resistant storage  
✅ **Fast Access**: Local storage for performance  
✅ **Migration Support**: Upgrade storage types over time

## 💰 Costs

### **Testnet (Development)**

- **Free**: No real money needed
- **Test KSM**: Available from faucet
- **Perfect**: For development and testing

### **Mainnet (Production)**

- **Transaction Fee**: ~0.001 KSM per credential (~$0.01 USD)
- **Storage**: Minimal for reference data
- **Total Cost**: Very low for most use cases

## 🔧 Troubleshooting

### **Common Issues**

#### **"Insufficient balance"**

```bash
# Get test KSM from faucet
# Or add real KSM to your account
```

#### **"Connection failed"**

```bash
# Check your internet connection
# Verify endpoint URL is correct
# Try different RPC endpoint
```

#### **"Invalid account seed"**

```bash
# Ensure seed is 32-byte hex (64 characters)
# Copy from Polkadot.js Extension export
```

### **Quick Fixes**

```bash
# Test connection
npm run setup:kusama

# Check balance (replace with your address)
curl -H "Content-Type: application/json" \
  -d '{"id":1, "jsonrpc":"2.0", "method": "system_account", "params":["YOUR_ADDRESS"]}' \
  https://kusama-rpc.polkadot.io
```

## 🚀 Next Steps

1. **Test thoroughly** with testnet
2. **Monitor transactions** and balance
3. **Scale up gradually** to mainnet
4. **Implement monitoring** for production
5. **Document procedures** for your team

## 📚 Resources

- **Setup Guide**: `docs/KUSAMA_SETUP_GUIDE.md`
- **Hybrid Storage**: `docs/HYBRID_STORAGE_GUIDE.md`
- **Kusama Network**: https://kusama.network/
- **Polkadot.js Apps**: https://kusama.polkadot.io/

---

**🎉 You're now ready to use Kusama for immutable credential verification!**
