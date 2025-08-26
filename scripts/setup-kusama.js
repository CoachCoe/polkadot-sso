#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt) {
  return new Promise(resolve => {
    rl.question(prompt, resolve);
  });
}

async function setupKusama() {
  console.log('🚀 Kusama Integration Setup\n');

  try {
    const envPath = path.join(process.cwd(), '.env');
    let envContent = '';

    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
      console.log('✅ Found existing .env file');
    } else {
      console.log('⚠️  No .env file found. Creating one...');
    }

    console.log('\n📋 Kusama Configuration\n');

    const useTestnet = await question('Use testnet (Westend) for development? (y/n): ');
    const endpoint =
      useTestnet.toLowerCase() === 'y'
        ? 'wss://westend-rpc.polkadot.io'
        : 'wss://kusama-rpc.polkadot.io';

    const accountSeed = await question('Enter your Kusama account seed (32-byte hex): ');

    if (!accountSeed || accountSeed.length !== 64) {
      console.log('❌ Invalid account seed. Must be 32-byte hex string (64 characters).');
      process.exit(1);
    }

    const accountType =
      (await question('Account type (sr25519/ed25519/ecdsa) [sr25519]: ')) || 'sr25519';

    const validTypes = ['sr25519', 'ed25519', 'ecdsa'];
    if (!validTypes.includes(accountType)) {
      console.log('❌ Invalid account type. Must be sr25519, ed25519, or ecdsa.');
      process.exit(1);
    }

    const kusamaConfig = `
# Kusama Configuration
KUSAMA_ENDPOINT=${endpoint}
KUSAMA_ACCOUNT_SEED=${accountSeed}
KUSAMA_ACCOUNT_TYPE=${accountType}
`;

    if (envContent.includes('KUSAMA_ENDPOINT')) {
      console.log('⚠️  Kusama configuration already exists in .env file');
      const overwrite = await question('Overwrite existing configuration? (y/n): ');

      if (overwrite.toLowerCase() === 'y') {
        // Remove existing Kusama config
        envContent = envContent.replace(/# Kusama Configuration[\s\S]*?(?=\n#|\n$|$)/g, '');
        envContent += kusamaConfig;
      } else {
        console.log('❌ Setup cancelled');
        process.exit(0);
      }
    } else {
      envContent += kusamaConfig;
    }

    fs.writeFileSync(envPath, envContent);
    console.log('✅ Kusama configuration added to .env file');

    console.log('\n🧪 Testing Configuration\n');

    const testConnection = await question('Test Kusama connection now? (y/n): ');

    if (testConnection.toLowerCase() === 'y') {
      console.log('Testing connection...');

      const WebSocket = require('ws');
      const ws = new WebSocket(endpoint);

      ws.on('open', () => {
        console.log('✅ Kusama connection successful');
        ws.close();
      });

      ws.on('error', error => {
        console.log('❌ Kusama connection failed:', error.message);
      });

      setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING) {
          console.log('❌ Connection timeout');
          ws.close();
        }
      }, 10000);
    }

    console.log('\n🎉 Setup Complete!\n');
    console.log('📋 Next Steps:');
    console.log('1. Start your application: npm run dev');
    console.log('2. Test the demo: npm run demo:hybrid');
    console.log('3. Create credentials with Kusama integration');
    console.log('4. Monitor transactions and balance');

    if (useTestnet.toLowerCase() === 'y') {
      console.log('\n💡 Testnet Tips:');
      console.log(
        '- Get test KSM from: https://wiki.polkadot.network/docs/learn-DOT#getting-westies'
      );
      console.log('- Test transactions are free');
      console.log('- Perfect for development and testing');
    } else {
      console.log('\n💰 Mainnet Tips:');
      console.log('- Ensure you have KSM for transaction fees (~0.001 KSM per credential)');
      console.log('- Monitor your account balance');
      console.log('- Start with small amounts to test');
    }

    console.log('\n📚 Resources:');
    console.log('- Kusama Network: https://kusama.network/');
    console.log('- Polkadot.js Apps: https://kusama.polkadot.io/');
    console.log('- Setup Guide: docs/KUSAMA_SETUP_GUIDE.md');
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

if (require.main === module) {
  setupKusama().catch(console.error);
}

module.exports = { setupKusama };
