# Polkadot Remittance Platform - Integration Guide

## 🚀 **Quick Start**

The Polkadot Remittance Platform extends your existing SSO framework with progressive custody remittance services. Users can send money cross-border using familiar Web2 authentication while progressively transitioning to full Web3 self-custody.

## 📦 **Installation**

```bash
# Install the remittance packages
npm install @polkadot-auth/core @polkadot-auth/ui @polkadot-auth/sso

# Or install specific remittance components
npm install @polkadot-auth/core@latest @polkadot-auth/ui@latest
```

## 🏗️ **Architecture Overview**

### **Progressive Custody Levels**

- **Level 0**: SMS/Email authentication with platform custody ($500 daily limit)
- **Level 1**: Enhanced security with 2FA and shared custody ($2,000 daily limit)
- **Level 2**: Wallet-assisted with 2-of-3 multisig ($10,000 daily limit)
- **Level 3**: Full self-custody with no limits

### **Core Components**

1. **RemittanceAuthService** - Extends existing SSO with custody management
2. **RemittanceService** - Handles transaction creation and processing
3. **ComplianceService** - KYC/AML verification and monitoring
4. **TreasuryManager** - Multi-sig wallet and cross-chain management

## 🔧 **Backend Integration**

### **1. Extend Your SSO Server**

```typescript
// packages/sso/src/app.ts
import remittanceRouter from './routes/remittance';

// Add remittance routes
app.use('/api/remittance', remittanceRouter);
```

### **2. Database Setup**

```sql
-- Run the remittance schema
source packages/sso/src/database/remittance-schema.sql;
```

### **3. Environment Variables**

```env
# Add to your .env file
REMITANCE_ENABLED=true
REMITANCE_DEFAULT_CURRENCY=USD
REMITANCE_SUPPORTED_CURRENCIES=USD,ARS,BRL
REMITANCE_TREASURY_ADDRESS=your-treasury-address
REMITANCE_MIN_DEPOSIT=100
REMITANCE_MAX_WITHDRAWAL=100000
```

## 🎨 **Frontend Integration**

### **1. Basic Remittance Dashboard**

```tsx
import { RemittanceDashboard } from '@polkadot-auth/ui';

function App() {
  return (
    <RemittanceDashboard
      baseUrl='https://your-sso-server.com'
      onTransactionCreated={transaction => {
        console.log('Transaction created:', transaction);
      }}
      onError={error => {
        console.error('Remittance error:', error);
      }}
    />
  );
}
```

### **2. Custom Integration**

```tsx
import { CustodyLevelIndicator, SendMoneyForm, TransactionHistory } from '@polkadot-auth/ui';
import { usePolkadotAuth } from '@polkadot-auth/ui';

function CustomRemittanceApp() {
  const { session, isAuthenticated } = usePolkadotAuth();

  if (!isAuthenticated) {
    return <div>Please connect your wallet</div>;
  }

  return (
    <div>
      <CustodyLevelIndicator
        currentLevel={session.custodyLevel}
        onUpgrade={level => upgradeCustody(level)}
      />

      <SendMoneyForm
        onSend={handleSendMoney}
        onGetQuote={handleGetQuote}
        limits={session.limits}
        custodyLevel={session.custodyLevel}
      />

      <TransactionHistory transactions={transactions} onRefresh={loadTransactions} />
    </div>
  );
}
```

## 🔌 **API Endpoints**

### **Send Money**

```http
POST /api/remittance/send
Authorization: Bearer <token>
Content-Type: application/json

{
  "recipient": "+1234567890",
  "amount": 100,
  "targetCurrency": "ARS"
}
```

### **Get Transaction History**

```http
GET /api/remittance/history?page=1&limit=20
Authorization: Bearer <token>
```

### **Upgrade Custody Level**

```http
POST /api/remittance/upgrade-custody
Authorization: Bearer <token>
Content-Type: application/json

{
  "targetLevel": 2,
  "additionalAuth": {
    "walletSignature": "...",
    "walletAddress": "..."
  }
}
```

### **Get Quote**

```http
GET /api/remittance/quote?amount=100&targetCurrency=ARS
Authorization: Bearer <token>
```

## 🛡️ **Security & Compliance**

### **KYC Integration**

```typescript
import { ComplianceService } from '@polkadot-auth/core';

const complianceService = new ComplianceService();

// Perform KYC verification
const kycResult = await complianceService.performKYC(userId, {
  identity: identityDocument,
  address: addressProof,
  selfie: selfiePhoto,
});
```

### **Transaction Monitoring**

```typescript
// Monitor transactions for compliance
const complianceCheck = await complianceService.monitorTransaction(transaction);

if (!complianceCheck.passed) {
  // Handle flagged transaction
  console.log('Transaction flagged:', complianceCheck.flags);
}
```

## 🌐 **Multi-Chain Support**

### **Treasury Management**

```typescript
import { TreasuryManagerFactory } from '@polkadot-auth/core/contracts';

// Create Substrate treasury manager
const treasuryManager = TreasuryManagerFactory.createSubstrateManager(polkadotApi, keyring, {
  supportedChains: ['polkadot', 'kusama'],
  defaultChain: 'polkadot',
  treasuryAddress: 'your-treasury-address',
  minDeposit: 100n,
  maxWithdrawal: 100000n,
  feePercentage: 0.02,
});

// Create multi-sig wallet
const walletAddress = await treasuryManager.createMultiSigWallet(
  ['user-address', 'platform-address', 'recovery-address'],
  2, // 2-of-3 multisig
  1 // Custody level 1
);
```

## 📊 **Analytics & Monitoring**

### **Transaction Analytics**

```sql
-- Get transaction analytics
SELECT * FROM transaction_analytics
WHERE transaction_date >= DATE_SUB(NOW(), INTERVAL 30 DAY);

-- Get user remittance summary
SELECT * FROM user_remittance_summary
WHERE user_id = 'user-id';
```

### **Audit Trail**

```typescript
// All remittance operations are automatically logged
// Check remittance_audit_log table for complete audit trail
```

## 🚀 **Deployment**

### **1. Database Migration**

```bash
# Run database migrations
npm run migrate:remittance
```

### **2. Environment Setup**

```bash
# Set up environment variables
cp .env.example .env
# Edit .env with your configuration
```

### **3. Start Services**

```bash
# Start SSO server with remittance
npm run start:sso

# Start frontend
npm run start:frontend
```

## 🔧 **Configuration**

### **Custody Level Configuration**

```typescript
const remittanceConfig = {
  custodyLevels: {
    0: {
      method: 'sms_email',
      limits: { daily: 500, monthly: 2000, perTransaction: 500 },
      requiredAuth: ['phone', 'email'],
    },
    1: {
      method: 'enhanced_security',
      limits: { daily: 2000, monthly: 10000, perTransaction: 2000 },
      requiredAuth: ['phone', 'email', '2fa'],
    },
    2: {
      method: 'wallet_assisted',
      limits: { daily: 10000, monthly: 50000, perTransaction: 10000 },
      requiredAuth: ['wallet_signature', 'backup_method'],
    },
    3: {
      method: 'self_custody',
      limits: null,
      requiredAuth: ['wallet_signature'],
    },
  },
  supportedCurrencies: ['USD', 'ARS', 'BRL'],
  supportedCorridors: ['US-AR', 'US-BR'],
  feeStructure: {
    baseFee: 0.02,
    custodyDiscount: 0.005,
    minFee: 0.01,
    networkFee: 0.5,
    exchangeFee: 0.25,
  },
};
```

## 🧪 **Testing**

### **Unit Tests**

```bash
# Run remittance tests
npm run test:remittance
```

### **Integration Tests**

```bash
# Run integration tests
npm run test:integration:remittance
```

## 📈 **Monitoring & Alerts**

### **Key Metrics**

- Transaction success rate
- Average transaction time
- Custody level progression
- Compliance check pass rate
- Treasury balance

### **Alerts**

- High-risk transactions
- Failed compliance checks
- Treasury balance thresholds
- System errors

## 🔄 **Migration from Existing Systems**

### **1. User Migration**

```typescript
// Migrate existing users to remittance system
const migratedUser = await remittanceAuthService.createRemittanceSession(
  existingUser,
  0 // Start with basic custody level
);
```

### **2. Transaction History**

```typescript
// Import existing transaction history
await remittanceService.importTransactionHistory(existingTransactions);
```

## 🆘 **Troubleshooting**

### **Common Issues**

1. **Transaction Limits Exceeded**
   - Check user's custody level
   - Verify daily/monthly limits
   - Consider upgrading custody level

2. **Compliance Check Failed**
   - Review KYC status
   - Check transaction risk factors
   - Manual review may be required

3. **Multi-sig Wallet Issues**
   - Verify wallet configuration
   - Check threshold settings
   - Ensure all owners are valid

### **Support**

- Check logs in `remittance_audit_log` table
- Review compliance flags
- Monitor treasury balance
- Check exchange rate availability

## 📚 **Additional Resources**

- [API Documentation](./docs/API.md)
- [Security Guide](./docs/SECURITY.md)
- [Compliance Guide](./docs/COMPLIANCE.md)
- [Multi-chain Setup](./docs/MULTICHAIN.md)

## 🎯 **Next Steps**

1. **Set up your treasury** with multi-sig wallets
2. **Configure compliance** with KYC/AML providers
3. **Integrate cash-out partners** for recipient payouts
4. **Deploy smart contracts** for treasury management
5. **Set up monitoring** and alerting systems

---

**Ready to start building?** The remittance platform is now fully integrated into your Polkadot SSO framework! 🚀
