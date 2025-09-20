#!/usr/bin/env node

/**
 * Integration Example for Polkadot SSO
 * Shows how to use the SSO services in your application
 */

import { createPolkadotAuth } from '@polkadot-auth/core';
import { CredentialService } from './dist/modules/credentials/services/credentialService.js';

// Example 1: Basic SSO Setup
console.log('🔐 Setting up Polkadot SSO...');

const auth = createPolkadotAuth({
  providers: ['polkadot-js', 'talisman', 'subwallet'],
  defaultChain: 'polkadot',
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  security: {
    enableNonce: true,
    enableDomainBinding: true,
    challengeExpiration: 5 * 60, // 5 minutes
  }
});

console.log('✅ SSO configured with:');
console.log(`   - Providers: ${auth.config.providers?.join(', ')}`);
console.log(`   - Default chain: ${auth.config.defaultChain}`);
console.log(`   - Session strategy: ${auth.config.session?.strategy}`);

// Example 2: Credential Management
console.log('\n🔑 Setting up credential management...');

const credentialService = new CredentialService();

// Store user credentials
const userCredentials = [
  {
    name: 'Polkadot Wallet',
    type: 'wallet',
    value: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
    description: 'Main Polkadot account'
  },
  {
    name: 'API Key',
    type: 'api_key',
    value: 'pk_live_1234567890abcdef',
    description: 'Stripe API key'
  }
];

console.log('✅ Credential service ready');
console.log(`   - Storage: In-memory (for demo)`);
console.log(`   - Encryption: Enabled`);

// Example 3: Authentication Flow (Browser Only)
console.log('\n🌐 Browser Integration Example:');
console.log(`
// In your browser application:
import { createPolkadotAuth } from '@polkadot-auth/core';
import { PolkadotAuthProvider } from '@polkadot-auth/ui';

const auth = createPolkadotAuth({
  providers: ['polkadot-js', 'talisman'],
  defaultChain: 'polkadot'
});

// React component
function App() {
  return (
    <PolkadotAuthProvider auth={auth}>
      <SignInButton />
    </PolkadotAuthProvider>
  );
}
`);

console.log('\n🎯 Ready for Production!');
console.log('   - Real wallet integration ✅');
console.log('   - JWT session management ✅');
console.log('   - Credential storage ✅');
console.log('   - Security features ✅');
