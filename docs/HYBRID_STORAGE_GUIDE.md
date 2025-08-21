# Hybrid Credential Storage Guide

## Overview

The Polkadot SSO system now supports **hybrid credential storage** that combines local SQLite storage, IPFS for decentralized data storage, and Kusama blockchain for immutable verification references.

## 🏗 Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Local SQLite  │    │      IPFS       │    │     Kusama      │
│   (Fast Access) │    │ (Decentralized) │    │ (Verification)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│              Hybrid Credential Service                         │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐              │
│  │   Local     │ │   IPFS      │ │   Kusama    │              │
│  │  Storage    │ │  Storage    │ │  Reference  │              │
│  └─────────────┘ └─────────────┘ └─────────────┘              │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Features

### **Storage Options**
- **Local**: Fast access, centralized storage
- **IPFS**: Decentralized, content-addressed storage
- **Hybrid**: Best of both worlds with fallback capabilities

### **Key Benefits**
- ✅ **Decentralized Storage**: IPFS provides censorship-resistant storage
- ✅ **Immutable Verification**: Kusama blockchain provides tamper-proof references
- ✅ **Fast Access**: Local storage for frequently accessed data
- ✅ **Migration Support**: Upgrade storage types over time
- ✅ **Integrity Verification**: Cross-verify data across all storage layers

## 📋 Setup

### 1. Environment Configuration

Add these environment variables to your `.env` file:

```bash
# IPFS Configuration
IPFS_HOST=ipfs.infura.io
IPFS_PORT=5001
IPFS_PROTOCOL=https
IPFS_API_PATH=/api/v0

# Kusama Configuration
KUSAMA_ENDPOINT=wss://kusama-rpc.polkadot.io
KUSAMA_ACCOUNT_SEED=your-account-seed-hex
KUSAMA_ACCOUNT_TYPE=sr25519
```

### 2. IPFS Setup

#### Option A: Use Infura IPFS (Recommended for development)
```bash
# No additional setup needed - uses Infura's IPFS gateway
IPFS_HOST=ipfs.infura.io
IPFS_PORT=5001
IPFS_PROTOCOL=https
```

#### Option B: Use Local IPFS Node
```bash
# Install IPFS
npm install -g ipfs

# Initialize and start IPFS daemon
ipfs init
ipfs daemon

# Configure for local access
IPFS_HOST=localhost
IPFS_PORT=5001
IPFS_PROTOCOL=http
```

### 3. Kusama Setup

#### Option A: Use Public RPC (Development)
```bash
KUSAMA_ENDPOINT=wss://kusama-rpc.polkadot.io
```

#### Option B: Use Your Own Node (Production)
```bash
KUSAMA_ENDPOINT=wss://your-kusama-node:9944
```

## 🔧 Usage

### Creating Credentials

#### Local Storage Only
```typescript
const credential = await hybridService.createCredential(issuerAddress, userAddress, {
  credential_type_id: 'type-uuid',
  credential_data: {
    degree: 'Bachelor of Science',
    field: 'Computer Science',
    institution: 'MIT'
  },
  storage_preference: 'local'
});
```

#### IPFS Storage
```typescript
const credential = await hybridService.createCredential(issuerAddress, userAddress, {
  credential_type_id: 'type-uuid',
  credential_data: {
    degree: 'Master of Science',
    field: 'Data Science',
    institution: 'Stanford'
  },
  storage_preference: 'ipfs',
  pin_to_ipfs: true,
  store_on_kusama: true
});
```

#### Hybrid Storage (Recommended)
```typescript
const credential = await hybridService.createCredential(issuerAddress, userAddress, {
  credential_type_id: 'type-uuid',
  credential_data: {
    degree: 'PhD',
    field: 'AI',
    institution: 'CMU'
  },
  storage_preference: 'hybrid',
  pin_to_ipfs: true,
  store_on_kusama: true
});
```

### Retrieving Credentials

```typescript
// Get credential metadata
const credential = await hybridService.getCredential(credentialId);

// Get decrypted credential data
const data = await hybridService.getCredentialData(credentialId);

// Verify integrity across all storage layers
const integrity = await hybridService.verifyCredentialIntegrity(credentialId);
```

### Migrating Credentials

```typescript
// Migrate from local to IPFS storage
const migratedCredential = await hybridService.migrateToIPFS(credentialId);
```

## 🌐 API Endpoints

### Hybrid Credential Management

#### Create Hybrid Credential
```http
POST /api/hybrid-credentials/credentials
Content-Type: application/json

{
  "user_address": "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
  "credential_type_id": "uuid",
  "credential_data": {
    "degree": "Bachelor of Science",
    "field": "Computer Science"
  },
  "storage_preference": "hybrid",
  "pin_to_ipfs": true,
  "store_on_kusama": true
}
```

#### Get User Credentials
```http
GET /api/hybrid-credentials/credentials
Authorization: Bearer <token>
```

#### Get Credential Data
```http
GET /api/hybrid-credentials/credentials/{id}/data
Authorization: Bearer <token>
```

#### Verify Credential Integrity
```http
GET /api/hybrid-credentials/credentials/{id}/verify-integrity
Authorization: Bearer <token>
```

#### Migrate to IPFS
```http
POST /api/hybrid-credentials/credentials/{id}/migrate-to-ipfs
Authorization: Bearer <token>
```

#### Get Storage Statistics
```http
GET /api/hybrid-credentials/storage/stats
Authorization: Bearer <token>
```

## 🧪 Demo

Run the hybrid storage demo:

```bash
npm run demo:hybrid
```

This demo showcases:
- Creating credentials with different storage types
- Retrieving data from various storage layers
- Verifying credential integrity
- Migrating between storage types
- Getting storage statistics

## 🔍 Monitoring

### Storage Statistics
```typescript
const stats = await hybridService.getStorageStats();
console.log(stats);
// Output:
// {
//   totalCredentials: 150,
//   localStorage: 50,
//   ipfsStorage: 30,
//   hybridStorage: 70,
//   kusamaReferences: 100
// }
```

### Integrity Verification
```typescript
const integrity = await hybridService.verifyCredentialIntegrity(credentialId);
console.log(integrity);
// Output:
// {
//   valid: true,
//   localValid: true,
//   ipfsValid: true,
//   kusamaValid: true,
//   errors: []
// }
```

## 🛡 Security Considerations

### **Encryption**
- All credential data is encrypted using AES-256-GCM before storage
- Encryption keys are managed securely through the SecretManager
- IPFS stores only encrypted data

### **Access Control**
- Credential access is controlled by Polkadot address authentication
- Sharing permissions are enforced at the application level
- Kusama references provide immutable verification

### **Data Integrity**
- SHA-256 hashes verify data integrity
- Cross-storage verification ensures consistency
- Kusama blockchain provides tamper-proof timestamps

## 💰 Cost Considerations

### **IPFS Costs**
- **Infura IPFS**: Free tier available, paid plans for reliability
- **Local IPFS**: Infrastructure costs only
- **Pinata**: Free tier, paid for premium features

### **Kusama Costs**
- **Remark transactions**: ~0.001 KSM per credential
- **Storage fees**: Minimal for small reference data
- **Network fees**: Varies with network congestion

## 🚀 Production Deployment

### **Recommended Configuration**
```bash
# Production IPFS
IPFS_HOST=your-ipfs-gateway.com
IPFS_PROTOCOL=https

# Production Kusama
KUSAMA_ENDPOINT=wss://your-kusama-node:9944
KUSAMA_ACCOUNT_SEED=your-production-seed

# Security
DATABASE_ENCRYPTION_KEY=your-production-key
JWT_SECRET=your-production-jwt-secret
```

### **Monitoring**
- Monitor IPFS pin status
- Track Kusama transaction success rates
- Alert on integrity verification failures
- Monitor storage costs

### **Backup Strategy**
- Regular database backups
- IPFS pin verification
- Kusama reference validation
- Cross-storage consistency checks

## 🔧 Troubleshooting

### **IPFS Issues**
```bash
# Test IPFS connection
curl -X POST "https://ipfs.infura.io:5001/api/v0/id"

# Check IPFS node status
curl -X POST "https://ipfs.infura.io:5001/api/v0/version"
```

### **Kusama Issues**
```bash
# Test Kusama connection
wscat -c wss://kusama-rpc.polkadot.io

# Check network status
curl -H "Content-Type: application/json" \
  -d '{"id":1, "jsonrpc":"2.0", "method": "system_chain"}' \
  https://kusama-rpc.polkadot.io
```

### **Common Errors**

#### IPFS Upload Failed
```
Error: IPFS upload failed: Network error
```
**Solution**: Check IPFS gateway connectivity and rate limits

#### Kusama Transaction Failed
```
Error: Kusama transaction failed: Insufficient balance
```
**Solution**: Ensure account has sufficient KSM for transaction fees

#### Integrity Verification Failed
```
Error: IPFS data not found
```
**Solution**: Check if IPFS data was properly pinned and is accessible

## 📚 Additional Resources

- [IPFS Documentation](https://docs.ipfs.io/)
- [Kusama Network](https://kusama.network/)
- [Polkadot.js API](https://polkadot.js.org/docs/api/)
- [Infura IPFS](https://infura.io/docs/ipfs)

## 🤝 Contributing

To contribute to the hybrid storage implementation:

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all storage layers are properly tested
5. Submit a pull request

## 📄 License

This hybrid storage implementation is part of the Polkadot SSO project and follows the same license terms.
