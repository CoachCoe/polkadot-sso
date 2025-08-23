import { createLogger } from '../utils/logger';
import { BrowserWalletDemo } from './browserWalletDemo';
import { NodeWalletDemo } from './nodeWalletDemo';
import { runNovaWalletDemo } from './novaWalletDemo';
import { WalletIntegrationDemo } from './walletIntegrationDemo';
import { WalletSecurityDemo } from './walletSecurityDemo';

const logger = createLogger('WalletDemoRunner');

/**
 * Wallet Demo Runner
 *
 * A comprehensive demo runner that showcases all wallet integrations:
 * - Wallet Integration Demo (general workflow)
 * - Browser Wallet Demo (browser extensions)
 * - Node Wallet Demo (Node.js environment)
 * - Wallet Security Demo (security features)
 * - Nova Wallet Demo (mobile wallet integration)
 */
export class WalletDemoRunner {
  private demos: Array<{ name: string; run: () => Promise<void> }> = [
    { name: 'Wallet Integration', run: () => new WalletIntegrationDemo().run() },
    { name: 'Browser Wallet', run: () => new BrowserWalletDemo().run() },
    { name: 'Node Wallet', run: () => new NodeWalletDemo().run() },
    { name: 'Wallet Security', run: () => new WalletSecurityDemo().run() },
    { name: 'Nova Wallet', run: runNovaWalletDemo },
  ];

  /**
   * Run all wallet demos
   */
  async runAllDemos(): Promise<void> {
    logger.info('🚀 Starting Comprehensive Wallet Demo Suite');
    logger.info('📱 This will showcase all available wallet integrations\n');

    for (const demo of this.demos) {
      try {
        logger.info(`\n${'='.repeat(50)}`);
        logger.info(`🎯 Running ${demo.name} Demo`);
        logger.info(`${'='.repeat(50)}`);

        await demo.run();

        logger.info(`✅ ${demo.name} Demo completed successfully`);
      } catch (error) {
        logger.error(`❌ ${demo.name} Demo failed`, { error });
        logger.info('Continuing with next demo...\n');
      }
    }

    logger.info('\n🎉 All wallet demos completed!');
    this.showSummary();
  }

  /**
   * Run a specific demo by name
   */
  async runSpecificDemo(demoName: string): Promise<void> {
    const demo = this.demos.find(d => d.name.toLowerCase().includes(demoName.toLowerCase()));

    if (!demo) {
      logger.error(`Demo not found: ${demoName}`);
      logger.info('Available demos:');
      this.demos.forEach(d => logger.info(`  - ${d.name}`));
      return;
    }

    logger.info(`🎯 Running ${demo.name} Demo`);
    await demo.run();
  }

  /**
   * Show available demos
   */
  showAvailableDemos(): void {
    logger.info('📋 Available Wallet Demos:');
    logger.info('========================');

    this.demos.forEach((demo, index) => {
      logger.info(`${index + 1}. ${demo.name}`);
    });

    logger.info('\n💡 Run specific demo: npm run demo:wallet -- --demo=nova');
    logger.info('💡 Run all demos: npm run demo:wallet -- --all');
  }

  /**
   * Show demo summary
   */
  private showSummary(): void {
    logger.info('\n📊 Wallet Integration Summary:');
    logger.info('=============================');

    logger.info('🔌 Supported Wallet Providers:');
    logger.info('  • Polkadot.js Extension (Browser)');
    logger.info('  • Talisman Wallet (Browser)');
    logger.info('  • SubWallet (Browser)');
    logger.info('  • Nova Wallet (Mobile + Browser Bridge)');

    logger.info('\n🔐 Supported Features:');
    logger.info('  • Account connection and management');
    logger.info('  • Message signing');
    logger.info('  • Transaction signing');
    logger.info('  • Credential storage on Kusama');
    logger.info('  • Security monitoring and validation');

    logger.info('\n🌐 Environment Support:');
    logger.info('  • Browser (with wallet extensions)');
    logger.info('  • Node.js (with keyring)');
    logger.info('  • Mobile (via Nova Wallet)');

    logger.info('\n🚀 Next Steps:');
    logger.info('  • Test with real wallet extensions');
    logger.info('  • Implement production security measures');
    logger.info('  • Add more wallet providers');
    logger.info('  • Create web UI for wallet management');
  }
}

/**
 * Main function to run demos based on command line arguments
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const runner = new WalletDemoRunner();

  if (args.includes('--help') || args.includes('-h')) {
    runner.showAvailableDemos();
    return;
  }

  if (args.includes('--demo')) {
    const demoIndex = args.indexOf('--demo');
    const demoName = args[demoIndex + 1];
    if (demoName) {
      await runner.runSpecificDemo(demoName);
    } else {
      logger.error('Please specify a demo name: --demo <name>');
      runner.showAvailableDemos();
    }
    return;
  }

  if (args.includes('--all')) {
    await runner.runAllDemos();
    return;
  }

  // Default: show available demos
  runner.showAvailableDemos();
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { main };
