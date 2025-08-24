import { createLogger } from '../utils/logger';

const logger = createLogger('WalletDemoRunner');

/**
 * Wallet Demo Runner
 *
 * A Node.js-compatible demo runner that showcases wallet integration concepts
 * without requiring Polkadot.js dependencies that cause issues in Node.js environments.
 */
export class WalletDemoRunner {
  private demos: Array<{ name: string; run: () => Promise<void> }> = [
    { name: 'Nova Wallet Simple', run: () => this.runNovaWalletSimpleDemo() },
    { name: 'Wallet Concepts', run: () => this.runWalletConceptsDemo() },
    { name: 'Security Features', run: () => this.runSecurityFeaturesDemo() },
  ];

  /**
   * Run all available demos
   */
  async runAllDemos(): Promise<void> {
    logger.info('🚀 Starting all wallet demos...');

    for (const demo of this.demos) {
      try {
        logger.info(`\n📱 Running ${demo.name} Demo...`);
        await demo.run();
        logger.info(`✅ ${demo.name} Demo completed successfully`);
      } catch (error) {
        logger.error(`❌ ${demo.name} Demo failed:`, { error });
      }
    }

    logger.info('\n🎉 All wallet demos completed!');
  }

  /**
   * Run a specific demo by name
   */
  async runSpecificDemo(demoName: string): Promise<void> {
    const demo = this.demos.find(d => d.name.toLowerCase().includes(demoName.toLowerCase()));

    if (!demo) {
      logger.error(`Demo not found: ${demoName}`);
      this.showAvailableDemos();
      return;
    }

    try {
      logger.info(`🚀 Running ${demo.name} Demo...`);
      await demo.run();
      logger.info(`✅ ${demo.name} Demo completed successfully`);
    } catch (error) {
      logger.error(`❌ ${demo.name} Demo failed:`, { error });
    }
  }

  /**
   * Show all available demos
   */
  showAvailableDemos(): void {
    logger.info('\n📋 Available Wallet Demos:');
    this.demos.forEach((demo, index) => {
      logger.info(`  ${index + 1}. ${demo.name}`);
    });
    logger.info('\n💡 Usage: npm run demo:wallet -- <demo-name>');
    logger.info('   Example: npm run demo:wallet -- "Nova Wallet"');
  }

  /**
   * Show a summary of all demos
   */
  showSummary(): void {
    logger.info('\n🎯 Wallet Demo Summary:');
    logger.info('========================');

    this.demos.forEach(demo => {
      logger.info(`\n📱 ${demo.name}:`);
      switch (demo.name) {
        case 'Nova Wallet Simple':
          logger.info('   • Mobile wallet integration concepts');
          logger.info('   • Browser bridge support');
          logger.info('   • Cross-platform compatibility');
          break;
        case 'Wallet Concepts':
          logger.info('   • General wallet workflow concepts');
          logger.info('   • Connection management concepts');
          logger.info('   • Account operations concepts');
          break;
        case 'Security Features':
          logger.info('   • Security features overview');
          logger.info('   • Audit logging concepts');
          logger.info('   • Threat detection concepts');
          break;
      }
    });
  }

  /**
   * Run Nova Wallet Simple Demo
   */
  private async runNovaWalletSimpleDemo(): Promise<void> {
    logger.info('📱 Nova Wallet Simple Demo');
    logger.info('==========================');

    logger.info('🔍 Checking Nova Wallet availability...');
    logger.info('🔍 Simulating Nova Wallet availability check...');
    logger.info('🖥️ Node.js environment detected');
    logger.info('📱 Nova Wallet is primarily a mobile wallet');
    logger.info('💡 Use mobile browser or enable mobile wallet bridge for testing');
    logger.info('⚠️ Nova Wallet not available in this environment.');

    logger.info('💡 To test Nova Wallet integration:');
    logger.info('   1. Install Nova Wallet mobile app');
    logger.info('   2. Use mobile browser or enable mobile wallet bridge');
    logger.info('   3. Ensure Nova Wallet is connected to this browser');
    logger.info('   4. Have at least one account in Nova Wallet');

    logger.info('\n🎯 Demonstrating Nova Wallet features...');
    logger.info('✍️ Message Signing:');
    logger.info('   Nova Wallet provides secure message signing');
    logger.info('   - Supports both personal and external message signing');
    logger.info('   - Uses device security (biometric, PIN, etc.)');
    logger.info('   - Compatible with Polkadot.js standards');
    logger.info('   - Secure key storage on device');

    logger.info('\n📝 Transaction Signing:');
    logger.info('   Nova Wallet excels at transaction signing:');
    logger.info('   - Intuitive transaction review UI');
    logger.info('   - Network fee estimation');
    logger.info('   - Transaction history and status');
    logger.info('   - Multi-signature support');
    logger.info('   - Batch transaction support');

    logger.info('\n🚀 Advanced Features:');
    logger.info('   - Staking and nomination management');
    logger.info('   - Governance participation');
    logger.info('   - NFT management');
    logger.info('   - Cross-chain transfers');
    logger.info('   - Portfolio tracking');
    logger.info('   - Price alerts and notifications');

    logger.info('\n💡 Nova Wallet Integration Benefits:');
    logger.info('=====================================');
    logger.info('👤 User Experience:');
    logger.info('   • Mobile-first design for on-the-go access');
    logger.info('   • Intuitive interface for both beginners and experts');
    logger.info('   • Fast transaction processing');
    logger.info('   • Offline transaction preparation');

    logger.info('\n🔒 Security Features:');
    logger.info('   • Hardware security module (HSM) support');
    logger.info('   • Biometric authentication');
    logger.info('   • Secure enclave storage');
    logger.info('   • Multi-factor authentication');
    logger.info('   • Transaction signing confirmation');

    logger.info('\n🌐 Network Support:');
    logger.info('   • Kusama (primary focus)');
    logger.info('   • Polkadot');
    logger.info('   • Parachains and relay chains');
    logger.info('   • Cross-chain interoperability');
    logger.info('   • Custom network support');

    logger.info('\n👨‍💻 Developer Benefits:');
    logger.info('   • Standardized API interface');
    logger.info('   • Comprehensive documentation');
    logger.info('   • Active development community');
    logger.info('   • Regular updates and improvements');
    logger.info('   • Open source components');

    logger.info('✅ Nova Wallet Simple Demo completed successfully');
  }

  /**
   * Run Wallet Concepts Demo
   */
  private async runWalletConceptsDemo(): Promise<void> {
    logger.info('💡 Wallet Concepts Demo');
    logger.info('=======================');

    logger.info('🔌 Wallet Provider Concepts:');
    logger.info('   • Polkadot.js Extension (Browser)');
    logger.info('   • Talisman Wallet (Browser)');
    logger.info('   • SubWallet (Browser)');
    logger.info('   • Nova Wallet (Mobile + Browser Bridge)');

    logger.info('\n🔐 Supported Features:');
    logger.info('   • Account connection and management');
    logger.info('   • Message signing');
    logger.info('   • Transaction signing');
    logger.info('   • Credential storage on Kusama');
    logger.info('   • Security monitoring and validation');

    logger.info('\n🌐 Environment Support:');
    logger.info('   • Browser (with wallet extensions)');
    logger.info('   • Node.js (with keyring)');
    logger.info('   • Mobile (via Nova Wallet)');

    logger.info('\n🚀 Next Steps:');
    logger.info('   • Test with real wallet extensions');
    logger.info('   • Implement production security measures');
    logger.info('   • Add more wallet providers');
    logger.info('   • Create web UI for wallet management');

    logger.info('✅ Wallet Concepts Demo completed successfully');
  }

  /**
   * Run Security Features Demo
   */
  private async runSecurityFeaturesDemo(): Promise<void> {
    logger.info('🔒 Security Features Demo');
    logger.info('=========================');

    logger.info('🛡️ Security Middleware:');
    logger.info('   • Rate limiting and brute force protection');
    logger.info('   • Input validation and sanitization');
    logger.info('   • Advanced security headers');
    logger.info('   • Request ID tracking');
    logger.info('   • Error sanitization');

    logger.info('\n🔍 Security Monitoring:');
    logger.info('   • Real-time threat detection');
    logger.info('   • Suspicious activity monitoring');
    logger.info('   • IP address tracking');
    logger.info('   • User agent analysis');
    logger.info('   • Geographic location monitoring');

    logger.info('\n📊 Audit Logging:');
    logger.info('   • Comprehensive event logging');
    logger.info('   • Security event categorization');
    logger.info('   • Compliance reporting');
    logger.info('   • Data retention policies');
    logger.info('   • Privacy protection measures');

    logger.info('\n🔐 Wallet Security:');
    logger.info('   • Connection validation');
    logger.info('   • Provider verification');
    logger.info('   • Transaction signing verification');
    logger.info('   • Account ownership validation');
    logger.info('   • Multi-factor authentication support');

    logger.info('✅ Security Features Demo completed successfully');
  }
}

/**
 * Main function to run the demo runner
 */
async function main(): Promise<void> {
  const runner = new WalletDemoRunner();

  // Check command line arguments
  const args = process.argv.slice(2);

  if (args.length === 0) {
    // No arguments - show summary and run all demos
    runner.showSummary();
    await runner.runAllDemos();
  } else if (args[0] === '--help' || args[0] === '-h') {
    // Show help
    runner.showAvailableDemos();
    runner.showSummary();
  } else {
    // Run specific demo
    const demoName = args.join(' ');
    await runner.runSpecificDemo(demoName);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    logger.error('Demo runner failed:', { error });
    process.exit(1);
  });
}

export { main };
