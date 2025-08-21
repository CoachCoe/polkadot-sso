#!/usr/bin/env ts-node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runHybridCredentialDemo = runHybridCredentialDemo;
const db_1 = require("../config/db");
const credentialService_1 = require("../services/credentialService");
const ipfsService_1 = require("../services/ipfsService");
const kusamaService_1 = require("../services/kusamaService");
const hybridCredentialService_1 = require("../services/hybridCredentialService");
const logger_1 = require("../utils/logger");
const logger = (0, logger_1.createLogger)('hybrid-credential-demo');
async function runHybridCredentialDemo() {
    console.log('🚀 Starting Hybrid Credential Storage Demo\n');
    try {
        // Initialize database
        console.log('📊 Initializing database...');
        const db = await (0, db_1.initializeDatabase)();
        console.log('✅ Database initialized\n');
        // Initialize services
        console.log('🔧 Initializing services...');
        const credentialService = new credentialService_1.CredentialService(db);
        const ipfsService = new ipfsService_1.IPFSService(ipfsService_1.defaultIPFSConfig);
        const kusamaService = new kusamaService_1.KusamaService(kusamaService_1.defaultKusamaConfig);
        const hybridService = new hybridCredentialService_1.HybridCredentialService(db, credentialService, ipfsService, kusamaService);
        // Initialize hybrid service
        await hybridService.initialize();
        console.log('✅ Services initialized\n');
        // Demo user addresses
        const issuerAddress = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
        const userAddress = '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty';
        // Create a credential type
        console.log('📝 Creating credential type...');
        const credentialType = await hybridService.createCredentialType(issuerAddress, {
            name: 'University Degree',
            description: 'Academic degree credential with hybrid storage',
            schema_version: '1.0.0',
            schema_definition: JSON.stringify({
                type: 'object',
                properties: {
                    degree: { type: 'string' },
                    field: { type: 'string' },
                    institution: { type: 'string' },
                    graduation_date: { type: 'string' },
                    gpa: { type: 'number' },
                },
                required: ['degree', 'field', 'institution', 'graduation_date'],
            }),
            required_fields: JSON.stringify(['degree', 'field', 'institution', 'graduation_date']),
            optional_fields: JSON.stringify(['gpa']),
            validation_rules: JSON.stringify({
                gpa: { min: 0, max: 4.0 },
            }),
            is_active: true,
        });
        console.log(`✅ Credential type created: ${credentialType.id}\n`);
        // Demo 1: Create credential with local storage only
        console.log('🔐 Demo 1: Creating credential with local storage only...');
        const localCredential = await hybridService.createCredential(issuerAddress, userAddress, {
            credential_type_id: credentialType.id,
            credential_data: {
                degree: 'Bachelor of Science',
                field: 'Computer Science',
                institution: 'MIT',
                graduation_date: '2024-05-15',
                gpa: 3.8,
            },
            storage_preference: 'local',
            expires_at: Date.now() + 365 * 24 * 60 * 60 * 1000, // 1 year
        });
        console.log(`✅ Local credential created: ${localCredential.id}`);
        console.log(`   Storage type: ${localCredential.storage_type}`);
        console.log(`   IPFS hash: ${localCredential.ipfs_hash || 'N/A'}`);
        console.log(`   Kusama reference: ${localCredential.kusama_reference ? 'Stored' : 'Not stored'}\n`);
        // Demo 2: Create credential with IPFS storage
        console.log('🌐 Demo 2: Creating credential with IPFS storage...');
        const ipfsCredential = await hybridService.createCredential(issuerAddress, userAddress, {
            credential_type_id: credentialType.id,
            credential_data: {
                degree: 'Master of Science',
                field: 'Data Science',
                institution: 'Stanford University',
                graduation_date: '2024-06-20',
                gpa: 3.9,
            },
            storage_preference: 'ipfs',
            pin_to_ipfs: true,
            store_on_kusama: true,
            expires_at: Date.now() + 365 * 24 * 60 * 60 * 1000, // 1 year
        });
        console.log(`✅ IPFS credential created: ${ipfsCredential.id}`);
        console.log(`   Storage type: ${ipfsCredential.storage_type}`);
        console.log(`   IPFS hash: ${ipfsCredential.ipfs_hash || 'N/A'}`);
        console.log(`   Kusama reference: ${ipfsCredential.kusama_reference ? 'Stored' : 'Not stored'}\n`);
        // Demo 3: Create credential with hybrid storage
        console.log('🔄 Demo 3: Creating credential with hybrid storage...');
        const hybridCredential = await hybridService.createCredential(issuerAddress, userAddress, {
            credential_type_id: credentialType.id,
            credential_data: {
                degree: 'PhD',
                field: 'Artificial Intelligence',
                institution: 'Carnegie Mellon University',
                graduation_date: '2024-07-10',
                gpa: 4.0,
            },
            storage_preference: 'hybrid',
            pin_to_ipfs: true,
            store_on_kusama: true,
            expires_at: Date.now() + 365 * 24 * 60 * 60 * 1000, // 1 year
        });
        console.log(`✅ Hybrid credential created: ${hybridCredential.id}`);
        console.log(`   Storage type: ${hybridCredential.storage_type}`);
        console.log(`   IPFS hash: ${hybridCredential.ipfs_hash || 'N/A'}`);
        console.log(`   Kusama reference: ${hybridCredential.kusama_reference ? 'Stored' : 'Not stored'}\n`);
        // Demo 4: Retrieve credential data
        console.log('📖 Demo 4: Retrieving credential data...');
        const localData = await hybridService.getCredentialData(localCredential.id);
        const ipfsData = await hybridService.getCredentialData(ipfsCredential.id);
        const hybridData = await hybridService.getCredentialData(hybridCredential.id);
        console.log('Local credential data:', localData);
        console.log('IPFS credential data:', ipfsData);
        console.log('Hybrid credential data:', hybridData);
        console.log('');
        // Demo 5: Verify credential integrity
        console.log('🔍 Demo 5: Verifying credential integrity...');
        const localIntegrity = await hybridService.verifyCredentialIntegrity(localCredential.id);
        const ipfsIntegrity = await hybridService.verifyCredentialIntegrity(ipfsCredential.id);
        const hybridIntegrity = await hybridService.verifyCredentialIntegrity(hybridCredential.id);
        console.log('Local credential integrity:', localIntegrity);
        console.log('IPFS credential integrity:', ipfsIntegrity);
        console.log('Hybrid credential integrity:', hybridIntegrity);
        console.log('');
        // Demo 6: Migrate local credential to IPFS
        console.log('🔄 Demo 6: Migrating local credential to IPFS...');
        try {
            const migratedCredential = await hybridService.migrateToIPFS(localCredential.id);
            console.log(`✅ Credential migrated: ${migratedCredential.id}`);
            console.log(`   New storage type: ${migratedCredential.storage_type}`);
            console.log(`   New IPFS hash: ${migratedCredential.ipfs_hash || 'N/A'}`);
            console.log(`   New Kusama reference: ${migratedCredential.kusama_reference ? 'Stored' : 'Not stored'}\n`);
        }
        catch (error) {
            console.log(`⚠️  Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
        }
        // Demo 7: Get storage statistics
        console.log('📊 Demo 7: Getting storage statistics...');
        const stats = await hybridService.getStorageStats();
        console.log('Storage statistics:', stats);
        console.log('');
        // Demo 8: Get all user credentials
        console.log('👤 Demo 8: Getting all user credentials...');
        const userCredentials = await hybridService.getUserCredentials(userAddress);
        console.log(`Found ${userCredentials.length} credentials for user ${userAddress}:`);
        userCredentials.forEach((cred, index) => {
            console.log(`  ${index + 1}. ${cred.id} (${cred.storage_type})`);
            console.log(`     IPFS: ${cred.ipfs_hash || 'N/A'}`);
            console.log(`     Kusama: ${cred.kusama_reference ? 'Stored' : 'Not stored'}`);
        });
        console.log('');
        console.log('🎉 Hybrid Credential Storage Demo completed successfully!');
        console.log('\n📋 Summary:');
        console.log('- Local storage: Fast access, centralized');
        console.log('- IPFS storage: Decentralized, content-addressed');
        console.log('- Hybrid storage: Best of both worlds');
        console.log('- Kusama integration: Immutable verification');
        console.log('- Migration capability: Upgrade storage over time');
    }
    catch (error) {
        console.error('❌ Demo failed:', error);
        process.exit(1);
    }
}
// Run the demo if called directly
if (require.main === module) {
    runHybridCredentialDemo().catch(console.error);
}
//# sourceMappingURL=hybridCredentialDemo.js.map