#!/usr/bin/env node

/**
 * Test script to verify wallet detection
 * Run this in a browser environment with wallet extensions installed
 */

console.log('🔍 Testing Wallet Detection...\n');

// Mock browser environment for testing
global.window = {
  injectedWeb3: {
    'polkadot-js': { name: 'polkadot-js', version: '1.0.0' },
    talisman: { name: 'talisman', version: '1.0.0' },
    SubWallet: { name: 'subwallet', version: '1.0.0' },
    nova: { name: 'nova', version: '1.0.0' },
  },
};

// Import the providers
const {
  polkadotJsProvider,
  talismanProvider,
  subWalletProvider,
  novaWalletProvider,
  getAvailableProviders,
} = require('./packages/core/dist/providers/index.js');

async function testWalletDetection() {
  console.log('Testing individual wallet detection...\n');

  // Test Polkadot.js
  try {
    const polkadotAvailable = await polkadotJsProvider.isAvailable();
    console.log(`✅ Polkadot.js Extension: ${polkadotAvailable ? 'Available' : 'Not Available'}`);
  } catch (error) {
    console.log(`❌ Polkadot.js Extension: Error - ${error.message}`);
  }

  // Test Talisman
  try {
    const talismanAvailable = await talismanProvider.isAvailable();
    console.log(`✅ Talisman: ${talismanAvailable ? 'Available' : 'Not Available'}`);
  } catch (error) {
    console.log(`❌ Talisman: Error - ${error.message}`);
  }

  // Test SubWallet
  try {
    const subWalletAvailable = await subWalletProvider.isAvailable();
    console.log(`✅ SubWallet: ${subWalletAvailable ? 'Available' : 'Not Available'}`);
  } catch (error) {
    console.log(`❌ SubWallet: Error - ${error.message}`);
  }

  // Test Nova Wallet
  try {
    const novaAvailable = await novaWalletProvider.isAvailable();
    console.log(`✅ Nova Wallet: ${novaAvailable ? 'Available' : 'Not Available'}`);
  } catch (error) {
    console.log(`❌ Nova Wallet: Error - ${error.message}`);
  }

  console.log('\n🔍 Testing getAvailableProviders()...\n');

  try {
    const availableProviders = await getAvailableProviders();
    console.log(`✅ Found ${availableProviders.length} available providers:`);
    availableProviders.forEach(provider => {
      console.log(`   - ${provider.name} (${provider.id})`);
    });
  } catch (error) {
    console.log(`❌ getAvailableProviders error: ${error.message}`);
  }

  console.log('\n🎯 Wallet Detection Test Complete!');
}

// Run the test
testWalletDetection().catch(console.error);
