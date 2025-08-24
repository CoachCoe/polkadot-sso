"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.demonstrateModularArchitecture = demonstrateModularArchitecture;
const config_1 = require("../modules/config");
async function demonstrateModularArchitecture() {
    console.log('🚀 Polkadot SSO Modular Architecture Demo\n');
    console.log('📋 Module Configuration:');
    for (const [name, config] of Object.entries(config_1.MODULE_CONFIG)) {
        console.log(`  ${name}: ${config.name} (Order: ${config.initOrder}, Dependencies: [${config.dependencies.join(', ')}])`);
    }
    console.log('\n🔄 Module Initialization Order:');
    const initOrder = (0, config_1.getModuleInitOrder)();
    console.log(`  ${initOrder.join(' → ')}`);
    console.log('\n✅ Dependency Validation:');
    const dependencyErrors = (0, config_1.validateModuleDependencies)();
    if (dependencyErrors.length === 0) {
        console.log('  All module dependencies are valid!');
    }
    else {
        console.log('  Dependency errors found:');
        dependencyErrors.forEach(error => console.log(`    ❌ ${error}`));
    }
    console.log('\n✨ Modular architecture demonstration complete!');
    console.log('\n💡 Benefits of this approach:');
    console.log('  - Clear separation of concerns');
    console.log('  - Easy to understand module boundaries');
    console.log('  - Gradual migration path');
    console.log('  - No breaking changes to existing code');
    console.log('  - Maintains clean build');
    console.log('\n📝 Note: Services are available through the modules but not imported in this demo');
    console.log('   to avoid IPFS client compatibility issues. They work fine in the main application.');
    console.log('\n🔧 To use services, import them from specific modules:');
    console.log('   import { SecretManager } from "../modules/security";');
    console.log('   import { ChallengeService } from "../modules/sso";');
    console.log('   import { CredentialService } from "../modules/credentials";');
}
if (require.main === module) {
    demonstrateModularArchitecture().catch(console.error);
}
//# sourceMappingURL=modularDemo.js.map