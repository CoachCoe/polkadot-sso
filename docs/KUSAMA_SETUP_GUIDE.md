# Kusama Integration Setup Guide

## 🎯 Overview

This guide will help you set up Kusama integration for your hybrid credential storage system. Kusama provides immutable verification and tamper-proof timestamps for your credentials.

## 🚀 Step-by-Step Setup

### **Step 1: Create a Kusama Account**

#### **Option A: Polkadot.js Extension (Recommended)**

1. **Install Extension**
   - Go to [Polkadot.js Extension](https://polkadot.js.org/extension/)
   - Install for your browser (Chrome, Firefox, Edge)

2. **Create Account**
   - Open the extension
   - Click "Create new account"
   - Choose "Kusama" network
   - Save your seed phrase securely (12 or 24 words)
   - Set a password for the extension

3. **Get Account Details**
   - Copy your account address (starts with `5`)
   - Export your account seed (32-byte hex string)

#### **Option B: Polkadot.js Apps**

1. **Visit Kusama Apps**
   - Go to [Kusama Apps](https://kusama.polkadot.io/)
   - Click "Accounts" → "Create account"

2. **Create Account**
   - Generate a new seed phrase
   - Save it securely
   - Set a password
   - Copy your account address

### **Step 2: Get KSM for Transaction Fees**

You'll need a small amount of KSM for transaction fees (~0.001 KSM per credential).

#### **For Development/Testing**

**Option A: Use Testnet (Westend)**
```bash
# Use Westend testnet instead of mainnet
KUSAMA_ENDPOINT=wss://westend-rpc.polkadot.io
```
- Get test KSM from [Westend Faucet](https://wiki.polkadot.network/docs/learn-DOT#getting-westies)
- No real money needed

**Option B: Use Local Test Network**
```bash
# Run your own Kusama test node
KUSAMA_ENDPOINT=ws://localhost:9944
```

#### **For Production**

**Option A: Purchase KSM**
- Buy KSM from exchanges (Kraken, Binance, etc.)
- Transfer to your Kusama account

**Option B: Community Faucet**
- Some community faucets provide small amounts for development

### **Step 3: Configure Environment Variables**

Add these to your `.env` file:

```bash
# Kusama Configuration
KUSAMA_ENDPOINT=wss://kusama-rpc.polkadot.io
KUSAMA_ACCOUNT_SEED=your-32-byte-account-seed-hex-here
KUSAMA_ACCOUNT_TYPE=sr25519

# For testnet (development)
# KUSAMA_ENDPOINT=wss://westend-rpc.polkadot.io
```

### **Step 4: Get Your Account Seed**

#### **From Polkadot.js Extension**
1. Open the extension
2. Right-click your account
3. Select "Export account"
4. Enter your password
5. Copy the "Secret seed" (32-byte hex string)

#### **From Polkadot.js Apps**
1. Go to your account
2. Click "Export account"
3. Copy the seed phrase or hex seed

### **Step 5: Test the Integration**

#### **Run the Demo**
```bash
npm run demo:hybrid
```

#### **Check Connection**
```bash
# Test Kusama connection
curl -X GET http://localhost:3000/api/hybrid-credentials/storage/kusama/test
```

## 🔧 Configuration Options

### **Network Endpoints**

#### **Mainnet (Production)**
```bash
KUSAMA_ENDPOINT=wss://kusama-rpc.polkadot.io
```

#### **Testnet (Development)**
```bash
KUSAMA_ENDPOINT=wss://westend-rpc.polkadot.io
```

#### **Custom Node**
```bash
KUSAMA_ENDPOINT=wss://your-kusama-node:9944
```

### **Account Types**

#### **sr25519 (Recommended)**
```bash
KUSAMA_ACCOUNT_TYPE=sr25519
```
- Most secure
- Recommended for production

#### **ed25519**
```bash
KUSAMA_ACCOUNT_TYPE=ed25519
```
- Good security
- Compatible with many tools

#### **ecdsa**
```bash
KUSAMA_ACCOUNT_TYPE=ecdsa
```
- Ethereum-compatible
- Use if integrating with Ethereum tools

## 💰 Cost Analysis

### **Transaction Costs**
- **Remark transaction**: ~0.001 KSM (~$0.01 USD)
- **Storage fees**: Minimal for small reference data
- **Network fees**: Varies with congestion

### **Cost Optimization**
```typescript
// Batch multiple credentials in one transaction
const batchCredentials = [
  { user: 'user1', ipfsHash: 'hash1', credentialHash: 'hash1' },
  { user: 'user2', ipfsHash: 'hash2', credentialHash: 'hash2' }
];

// Store batch reference on Kusama
await kusamaService.storeBatchReference(batchCredentials);
```

## 🛡 Security Best Practices

### **Account Security**
1. **Use dedicated account**: Don't use your main Kusama account
2. **Secure seed storage**: Store seed phrase offline, encrypted
3. **Regular rotation**: Rotate account keys periodically
4. **Monitor transactions**: Track all Kusama transactions

### **Environment Security**
```bash
# Use secrets management in production
# Don't store seeds in plain text
KUSAMA_ACCOUNT_SEED_FILE=/run/secrets/kusama_seed
```

### **Network Security**
```bash
# Use secure WebSocket connections
KUSAMA_ENDPOINT=wss://your-secure-node:9944

# Verify node authenticity
# Use trusted RPC providers
```

## 🧪 Testing

### **Test Credential Creation**
```typescript
// Create credential with Kusama integration
const credential = await hybridService.createCredential(issuerAddress, userAddress, {
  credential_type_id: 'test-type',
  credential_data: { test: 'data' },
  storage_preference: 'hybrid',
  pin_to_ipfs: true,
  store_on_kusama: true
});

console.log('Kusama reference:', credential.kusama_reference);
```

### **Test Verification**
```typescript
// Verify credential on Kusama
const verified = await kusamaService.verifyCredentialReference(
  credential.ipfs_hash,
  credential.credential_hash
);

console.log('Kusama verification:', verified);
```

### **Test Retrieval**
```typescript
// Get credential references from Kusama
const references = await kusamaService.getCredentialReferences(userAddress);
console.log('Kusama references:', references);
```

## 🔍 Monitoring

### **Transaction Monitoring**
```typescript
// Monitor Kusama transactions
const networkInfo = await kusamaService.getNetworkInfo();
console.log('Network info:', networkInfo);
```

### **Error Handling**
```typescript
try {
  await kusamaService.storeCredentialReference(userAddress, ipfsHash, credentialHash);
} catch (error) {
  if (error.message.includes('Insufficient balance')) {
    console.log('Need more KSM for transaction fees');
  } else if (error.message.includes('Network error')) {
    console.log('Kusama network connection issue');
  }
}
```

## 🚀 Production Deployment

### **Recommended Setup**
```bash
# Production environment
NODE_ENV=production
KUSAMA_ENDPOINT=wss://your-kusama-node:9944
KUSAMA_ACCOUNT_SEED=your-production-seed
KUSAMA_ACCOUNT_TYPE=sr25519

# Use secrets management
KUSAMA_ACCOUNT_SEED_FILE=/run/secrets/kusama_seed
```

### **Monitoring Setup**
- Monitor Kusama transaction success rates
- Alert on insufficient balance
- Track network connectivity
- Monitor transaction costs

### **Backup Strategy**
- Backup Kusama account seed securely
- Monitor account balance
- Have fallback accounts ready
- Document recovery procedures

## 🔧 Troubleshooting

### **Common Issues**

#### **Insufficient Balance**
```
Error: Kusama transaction failed: Insufficient balance
```
**Solution**: Add more KSM to your account

#### **Network Connection**
```
Error: Kusama initialization failed: Connection timeout
```
**Solution**: Check network connectivity and endpoint URL

#### **Invalid Account**
```
Error: Invalid account seed
```
**Solution**: Verify your account seed is correct (32-byte hex)

#### **Transaction Failed**
```
Error: Transaction failed: 1014: Priority is too low
```
**Solution**: Increase transaction priority or wait for less congestion

### **Debug Commands**
```bash
# Test Kusama connection
curl -H "Content-Type: application/json" \
  -d '{"id":1, "jsonrpc":"2.0", "method": "system_chain"}' \
  https://kusama-rpc.polkadot.io

# Check account balance
curl -H "Content-Type: application/json" \
  -d '{"id":1, "jsonrpc":"2.0", "method": "system_account", "params":["YOUR_ADDRESS"]}' \
  https://kusama-rpc.polkadot.io
```

## 📚 Additional Resources

- [Kusama Network](https://kusama.network/)
- [Polkadot.js API](https://polkadot.js.org/docs/api/)
- [Kusama Apps](https://kusama.polkadot.io/)
- [Polkadot.js Extension](https://polkadot.js.org/extension/)
- [Kusama Wiki](https://wiki.polkadot.network/docs/learn-kusama)

## 🎉 Next Steps

1. **Set up your Kusama account**
2. **Configure environment variables**
3. **Test with small amounts**
4. **Monitor transactions**
5. **Scale up gradually**

Once you're comfortable with the setup, you'll have a fully decentralized credential verification system! 🚀
