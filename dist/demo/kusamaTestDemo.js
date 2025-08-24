#!/usr/bin/env ts-node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runKusamaTestDemo = runKusamaTestDemo;
async function runKusamaTestDemo() {
    console.log('🚀 Kusama Integration Test Demo\n');
    console.log('⚠️  This demo has been disabled in favor of wallet-based services');
    console.log('📋 Please use the following demos instead:');
    console.log('   - npm run demo:wallet - Wallet integration demo');
    console.log('   - npm run demo:browser - Browser wallet demo');
    console.log('   - npm run demo:node - Node.js wallet demo');
    console.log('   - npm run demo:wallet-security - Security features demo');
    console.log('\n🎉 Demo completed!');
}
if (require.main === module) {
    runKusamaTestDemo().catch(console.error);
}
//# sourceMappingURL=kusamaTestDemo.js.map