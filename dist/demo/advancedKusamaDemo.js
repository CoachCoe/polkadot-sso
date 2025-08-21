#!/usr/bin/env ts-node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runAdvancedKusamaDemo = runAdvancedKusamaDemo;
const db_1 = require("../config/db");
const advancedKusamaService_1 = require("../services/advancedKusamaService");
const logger_1 = require("../utils/logger");
const logger = (0, logger_1.createLogger)('advanced-kusama-demo');
async function runAdvancedKusamaDemo() {
    console.log('🚀 Advanced Kusama Storage Demo\n');
    console.log('This demo showcases storing encrypted credential data directly on Kusama\n');
    try {
        // Initialize database
        console.log('📊 Initializing database...');
        const db = await (0, db_1.initializeDatabase)();
        console.log('✅ Database initialized\n');
        // Initialize Advanced Kusama service
        console.log('🔧 Initializing Advanced Kusama service...');
        const kusamaService = new advancedKusamaService_1.AdvancedKusamaService(advancedKusamaService_1.defaultAdvancedKusamaConfig);
        await kusamaService.initialize();
        console.log('✅ Advanced Kusama service initialized\n');
        // Test user address
        const userAddress = '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty';
        // Sample credential data
        const credentialData = {
            degree: 'PhD in Computer Science',
            field: 'Artificial Intelligence',
            institution: 'Massachusetts Institute of Technology',
            graduation_date: '2024-05-15',
            gpa: 4.0,
            thesis_title: 'Advanced Machine Learning Techniques for Autonomous Systems',
            advisor: 'Dr. Jane Smith',
            honors: ['Summa Cum Laude', 'Best Thesis Award'],
            publications: ['Machine Learning Journal, 2024', 'AI Conference Proceedings, 2023'],
        };
        console.log('📋 Sample Credential Data:');
        console.log(JSON.stringify(credentialData, null, 2));
        console.log('');
        // Calculate data size
        const dataSize = JSON.stringify(credentialData).length;
        console.log(`📏 Data size: ${dataSize} characters\n`);
        // Get cost estimates for different storage methods
        console.log('💰 Storage Cost Estimates:\n');
        const methods = [
            'remark',
            'batch',
            'custom_pallet',
        ];
        for (const method of methods) {
            const costEstimate = await kusamaService.getStorageCostEstimate(dataSize, method);
            console.log(`${method.toUpperCase()} Method:`);
            console.log(`  - Estimated cost: ${costEstimate.estimatedCost}`);
            console.log(`  - Transactions needed: ${costEstimate.transactionCount}`);
            console.log(`  - Efficiency: ${method === 'custom_pallet' ? 'High' : method === 'batch' ? 'Medium' : 'Low'}`);
            console.log('');
        }
        // Demo 1: Store data using remarks method
        console.log('🔐 Demo 1: Storing encrypted data using remarks method...');
        try {
            const remarksResult = await kusamaService.storeEncryptedDataInRemarks(userAddress, credentialData);
            console.log('✅ Data stored using remarks method!');
            console.log('Result:', {
                dataHash: remarksResult.dataHash,
                storageMethod: remarksResult.storageMethod,
                blockHash: remarksResult.blockHash,
                extrinsicHash: remarksResult.extrinsicHash,
            });
            console.log('');
            // Retrieve the data
            console.log('📖 Retrieving data from remarks...');
            const retrievedData = await kusamaService.retrieveEncryptedData(userAddress, remarksResult.dataHash, 'remark');
            console.log('Retrieved data:', retrievedData);
            console.log('');
        }
        catch (error) {
            console.log('⚠️  Remarks storage failed (expected for test accounts):');
            console.log('   Error:', error instanceof Error ? error.message : 'Unknown error');
            console.log('   This is normal for test accounts without KSM balance\n');
        }
        // Demo 2: Store data using batch method
        console.log('📦 Demo 2: Storing encrypted data using batch method...');
        try {
            const batchResult = await kusamaService.storeEncryptedDataInBatch(userAddress, credentialData);
            console.log('✅ Data stored using batch method!');
            console.log('Result:', {
                dataHash: batchResult.dataHash,
                storageMethod: batchResult.storageMethod,
                blockHash: batchResult.blockHash,
                extrinsicHash: batchResult.extrinsicHash,
            });
            console.log('');
            // Retrieve the data
            console.log('📖 Retrieving data from batch...');
            const retrievedData = await kusamaService.retrieveEncryptedData(userAddress, batchResult.dataHash, 'batch');
            console.log('Retrieved data:', retrievedData);
            console.log('');
        }
        catch (error) {
            console.log('⚠️  Batch storage failed (expected for test accounts):');
            console.log('   Error:', error instanceof Error ? error.message : 'Unknown error');
            console.log('   This is normal for test accounts without KSM balance\n');
        }
        // Demo 3: Store data using custom pallet method
        console.log('🏗️  Demo 3: Storing encrypted data using custom pallet method...');
        try {
            const palletResult = await kusamaService.storeEncryptedDataInCustomPallet(userAddress, credentialData);
            console.log('✅ Data stored using custom pallet method!');
            console.log('Result:', {
                dataHash: palletResult.dataHash,
                storageMethod: palletResult.storageMethod,
                blockHash: palletResult.blockHash,
                extrinsicHash: palletResult.extrinsicHash,
            });
            console.log('');
            // Retrieve the data
            console.log('📖 Retrieving data from custom pallet...');
            const retrievedData = await kusamaService.retrieveEncryptedData(userAddress, palletResult.dataHash, 'custom_pallet');
            console.log('Retrieved data:', retrievedData);
            console.log('');
        }
        catch (error) {
            console.log('⚠️  Custom pallet storage failed (expected for test accounts):');
            console.log('   Error:', error instanceof Error ? error.message : 'Unknown error');
            console.log('   This is normal for test accounts without KSM balance\n');
        }
        // Demo 4: Verification test
        console.log('🔍 Demo 4: Testing data verification...');
        const testDataHash = 'test-hash-123';
        const verificationResults = await Promise.all(methods.map(method => kusamaService.verifyEncryptedData(userAddress, testDataHash, method)));
        console.log('Verification results:');
        methods.forEach((method, index) => {
            console.log(`  ${method}: ${verificationResults[index] ? '✅ Found' : '❌ Not found'}`);
        });
        console.log('');
        console.log('🎉 Advanced Kusama Storage Demo completed!');
        console.log('\n📋 Summary:');
        console.log('- Three storage methods implemented:');
        console.log('  1. Remarks: Basic storage with size limits');
        console.log('  2. Batch: More efficient for multiple chunks');
        console.log('  3. Custom Pallet: Most efficient (requires deployment)');
        console.log('');
        console.log('- All data is encrypted before storage');
        console.log('- Data can be retrieved and decrypted');
        console.log('- Cost estimates provided for each method');
        console.log('- Verification capabilities implemented');
        console.log('');
        console.log('🚀 Next Steps:');
        console.log('1. Get KSM for real transactions');
        console.log('2. Deploy custom pallet for maximum efficiency');
        console.log('3. Implement monitoring and cost tracking');
        console.log('4. Scale to production with proper security measures');
    }
    catch (error) {
        console.error('❌ Demo failed:', error);
        process.exit(1);
    }
}
// Run the demo if called directly
if (require.main === module) {
    runAdvancedKusamaDemo().catch(console.error);
}
//# sourceMappingURL=advancedKusamaDemo.js.map