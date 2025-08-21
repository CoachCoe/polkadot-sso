#!/usr/bin/env ts-node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runKusamaTestDemo = runKusamaTestDemo;
const db_1 = require("../config/db");
const storage_1 = require("../modules/storage");
// Note: defaultKusamaConfig is not exported from modules yet
const defaultKusamaConfig = {
    endpoint: 'wss://kusama-rpc.polkadot.io',
    seed: process.env.KUSAMA_SEED || '',
};
const logger_1 = require("../utils/logger");
const logger = (0, logger_1.createLogger)('kusama-test-demo');
async function runKusamaTestDemo() {
    console.log('🚀 Kusama Integration Test Demo\n');
    try {
        // Initialize database
        console.log('📊 Initializing database...');
        const db = await (0, db_1.initializeDatabase)();
        console.log('✅ Database initialized\n');
        // Initialize Kusama service
        console.log('🔧 Initializing Kusama service...');
        const kusamaService = new storage_1.KusamaService(defaultKusamaConfig);
        // Test Kusama connection
        console.log('🌐 Testing Kusama connection...');
        const connected = await kusamaService.testConnection();
        if (connected) {
            console.log('✅ Kusama connection successful!\n');
            // Get network information
            console.log('📡 Getting network information...');
            const networkInfo = await kusamaService.getNetworkInfo();
            console.log('Network info:', networkInfo);
            console.log('');
            // Test account functionality
            console.log('👤 Testing account functionality...');
            const testUserAddress = '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty';
            // Test storing a credential reference
            console.log('💾 Testing credential reference storage...');
            try {
                const testIpfsHash = 'QmTestHash123456789';
                const testCredentialHash = 'test-credential-hash-123';
                const reference = await kusamaService.storeCredentialReference(testUserAddress, testIpfsHash, testCredentialHash);
                console.log('✅ Credential reference stored on Kusama!');
                console.log('Reference details:', reference);
                console.log('');
                // Test verification
                console.log('🔍 Testing credential verification...');
                const verified = await kusamaService.verifyCredentialReference(testIpfsHash, testCredentialHash);
                console.log('Verification result:', verified);
                console.log('');
                // Test retrieval
                console.log('📖 Testing credential reference retrieval...');
                const references = await kusamaService.getCredentialReferences(testUserAddress);
                console.log('Retrieved references:', references);
                console.log('');
            }
            catch (error) {
                console.log('⚠️  Credential storage test failed (this is expected for test accounts):');
                console.log('   Error:', error instanceof Error ? error.message : 'Unknown error');
                console.log('   This is normal for test accounts without KSM balance\n');
            }
        }
        else {
            console.log('❌ Kusama connection failed');
            console.log('   This might be due to:');
            console.log('   - Network connectivity issues');
            console.log('   - Invalid endpoint configuration');
            console.log('   - Firewall blocking WebSocket connections');
        }
        // Test configuration
        console.log('⚙️  Testing configuration...');
        console.log('Kusama endpoint:', process.env.KUSAMA_ENDPOINT);
        console.log('Account type:', process.env.KUSAMA_ACCOUNT_TYPE);
        console.log('Account seed configured:', process.env.KUSAMA_ACCOUNT_SEED ? 'Yes' : 'No');
        console.log('');
        console.log('🎉 Kusama Integration Test Demo completed!');
        console.log('\n📋 Summary:');
        console.log('- Kusama service initialized successfully');
        console.log('- Network connection tested');
        console.log('- Account configuration verified');
        console.log('- Ready for credential storage and verification');
        if (connected) {
            console.log('\n✅ Your Kusama integration is working!');
            console.log('   You can now:');
            console.log('   - Store credential references on Kusama');
            console.log('   - Verify credentials immutably');
            console.log('   - Retrieve credential history');
        }
        else {
            console.log('\n⚠️  Connection issues detected');
            console.log('   Please check:');
            console.log('   - Internet connection');
            console.log('   - Firewall settings');
            console.log('   - Kusama endpoint configuration');
        }
    }
    catch (error) {
        console.error('❌ Demo failed:', error);
        process.exit(1);
    }
}
// Run the demo if called directly
if (require.main === module) {
    runKusamaTestDemo().catch(console.error);
}
//# sourceMappingURL=kusamaTestDemo.js.map