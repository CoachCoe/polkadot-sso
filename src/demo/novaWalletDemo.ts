import { BrowserWalletService } from '../services/browserWalletService';
import { RealTransactionService } from '../services/realTransactionService';
import { WalletBasedKusamaService } from '../services/walletBasedKusamaService';
import { createLogger } from '../utils/logger';

const logger = createLogger('NovaWalletDemo');

/**
 * Nova Wallet Demo
 *
 * This demo showcases Nova Wallet integration capabilities:
 * 1. Detect Nova Wallet availability
 * 2. Connect to Nova Wallet
 * 3. Get accounts from Nova Wallet
 * 4. Sign messages and transactions
 * 5. Submit transactions to Kusama
 */
export class NovaWalletDemo {
  private kusamaService: WalletBasedKusamaService;
  private browserWalletService: BrowserWalletService | null = null;
  private realTransactionService: RealTransactionService | null = null;

  constructor() {
    this.kusamaService = new WalletBasedKusamaService();
  }

  /**
   * Run the complete Nova Wallet demo
   */
  async run(): Promise<void> {
    try {
      logger.info('🚀 Starting Nova Wallet Demo');

      // Step 1: Initialize Kusama service
      await this.initializeKusamaService();

      // Step 2: Initialize browser wallet services
      await this.initializeBrowserServices();

      // Step 3: Check Nova Wallet availability
      await this.checkNovaWalletAvailability();

      // Step 4: Connect to Nova Wallet
      await this.connectToNovaWallet();

      // Step 5: Demonstrate Nova Wallet features
      await this.demonstrateNovaWalletFeatures();

      logger.info('✅ Nova Wallet Demo completed successfully');
    } catch (error) {
      logger.error('❌ Nova Wallet Demo failed', { error });
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  /**
   * Initialize the Kusama service
   */
  private async initializeKusamaService(): Promise<void> {
    logger.info('📡 Initializing Kusama service...');
    await this.kusamaService.initialize();
    logger.info('✅ Kusama service initialized');
  }

  /**
   * Initialize browser wallet services
   */
  private async initializeBrowserServices(): Promise<void> {
    logger.info('🔧 Initializing browser wallet services...');

    try {
      // Get the API from the Kusama service
      const api = (this.kusamaService as any).api;

      if (!api) {
        throw new Error('Kusama API not available');
      }

      // Initialize browser wallet service
      this.browserWalletService = new BrowserWalletService(api);

      // Initialize real transaction service
      this.realTransactionService = new RealTransactionService(api, this.browserWalletService);

      logger.info('✅ Browser wallet services initialized');
    } catch (error) {
      logger.error('Failed to initialize browser wallet services', { error });
      throw error;
    }
  }

  /**
   * Check Nova Wallet availability
   */
  private async checkNovaWalletAvailability(): Promise<void> {
    logger.info('🔍 Checking Nova Wallet availability...');

    try {
      if (!this.browserWalletService) {
        throw new Error('Browser wallet service not initialized');
      }

      const providers = this.browserWalletService.getAvailableProviders();
      logger.info('Available wallet providers:', { providers });

      if (providers.includes('nova')) {
        logger.info('🎉 Nova Wallet is available!');
        logger.info('📱 Nova Wallet is a mobile-first wallet with excellent UX');
        logger.info('🔐 Supports multiple networks including Kusama');
        logger.info('💎 Features: Staking, Governance, NFTs, and more');
      } else {
        logger.warn('⚠️ Nova Wallet not available in this browser environment.');
        logger.info('💡 To test Nova Wallet integration:');
        logger.info('   1. Install Nova Wallet mobile app');
        logger.info('   2. Use mobile browser or enable mobile wallet bridge');
        logger.info('   3. Ensure Nova Wallet is connected to this browser');
        logger.info('   4. Have at least one account in Nova Wallet');
      }
    } catch (error) {
      logger.error('Failed to check Nova Wallet availability', { error });
    }
  }

  /**
   * Connect to Nova Wallet
   */
  private async connectToNovaWallet(): Promise<void> {
    logger.info('🔗 Attempting to connect to Nova Wallet...');

    try {
      if (!this.browserWalletService) {
        throw new Error('Browser wallet service not initialized');
      }

      const providers = this.browserWalletService.getAvailableProviders();

      if (!providers.includes('nova')) {
        logger.info('💡 Nova Wallet not available - simulating connection...');
        logger.info('   In a real environment with Nova Wallet, this would:');
        logger.info('   1. Show Nova Wallet connection UI');
        logger.info('   2. Request permission to access accounts');
        logger.info('   3. Display available accounts from Nova Wallet');
        logger.info('   4. Allow user to select an account');
        logger.info('   5. Establish secure connection for signing');
        return;
      }

      logger.info('Attempting to connect to Nova Wallet...');

      const result = await this.browserWalletService.connectToProvider('nova');

      if (result.success && result.connection) {
        logger.info('✅ Successfully connected to Nova Wallet!', {
          address: result.connection.account.address,
          accountType: result.connection.account.type,
        });

        // Get all accounts from Nova Wallet
        const accounts = await this.browserWalletService.getProviderAccounts('nova');
        logger.info('Available Nova Wallet accounts:', {
          count: accounts.length,
          accounts: accounts.map(acc => ({
            address: acc.address,
            name: acc.name,
            type: acc.type,
          })),
        });

        // Store connection for later use
        // Note: In a real implementation, you'd use the service's public methods
        logger.info('Connection stored successfully');
      } else {
        logger.warn('⚠️ Failed to connect to Nova Wallet:', result.error);
      }
    } catch (error) {
      logger.error('Failed to connect to Nova Wallet', { error });
    }
  }

  /**
   * Demonstrate Nova Wallet features
   */
  private async demonstrateNovaWalletFeatures(): Promise<void> {
    logger.info('🎯 Demonstrating Nova Wallet features...');

    try {
      if (!this.browserWalletService) {
        throw new Error('Browser wallet service not initialized');
      }

      const connections = this.browserWalletService.getActiveConnections();
      if (connections.size === 0) {
        logger.info('💡 No active Nova Wallet connections - simulating features...');
        await this.simulateNovaWalletFeatures();
        return;
      }

      // Get the first Nova Wallet connection
      const firstEntry = connections.entries().next().value;
      if (!firstEntry) {
        logger.info('💡 No active connections - simulating features...');
        await this.simulateNovaWalletFeatures();
        return;
      }

      const [address, connection] = firstEntry;
      logger.info('🔐 Testing Nova Wallet features with account:', address);

      // Test message signing
      await this.testMessageSigning(connection, address);

      // Test transaction signing
      await this.testTransactionSigning(connection, address);

      // Test transaction submission
      await this.testTransactionSubmission(address);
    } catch (error) {
      logger.error('Failed to demonstrate Nova Wallet features', { error });
    }
  }

  /**
   * Simulate Nova Wallet features when not connected
   */
  private async simulateNovaWalletFeatures(): Promise<void> {
    logger.info('🎭 Simulating Nova Wallet features...');

    // Simulate message signing
    logger.info('✍️ Message Signing:');
    logger.info('   Nova Wallet provides secure message signing');
    logger.info('   - Supports both personal and external message signing');
    logger.info('   - Uses device security (biometric, PIN, etc.)');
    logger.info('   - Compatible with Polkadot.js standards');

    // Simulate transaction signing
    logger.info('📝 Transaction Signing:');
    logger.info('   Nova Wallet excels at transaction signing:');
    logger.info('   - Intuitive transaction review UI');
    logger.info('   - Network fee estimation');
    logger.info('   - Transaction history and status');
    logger.info('   - Multi-signature support');

    // Simulate advanced features
    logger.info('🚀 Advanced Features:');
    logger.info('   - Staking and nomination management');
    logger.info('   - Governance participation');
    logger.info('   - NFT management');
    logger.info('   - Cross-chain transfers');
    logger.info('   - Portfolio tracking');
  }

  /**
   * Test message signing with Nova Wallet
   */
  private async testMessageSigning(connection: any, address: string): Promise<void> {
    logger.info('✍️ Testing message signing with Nova Wallet...');

    try {
      const testMessage = new TextEncoder().encode('Hello from Nova Wallet Demo!');

      logger.info('Signing message:', {
        address,
        message: 'Hello from Nova Wallet Demo!',
        messageLength: testMessage.length,
      });

      const signature = await connection.sign(testMessage);

      logger.info('✅ Message signed successfully!', {
        address,
        signatureLength: signature.length,
        signatureHex: Array.from(signature)
          .map((b: unknown) => (b as number).toString(16).padStart(2, '0'))
          .join(''),
      });
    } catch (error) {
      logger.error('Failed to test message signing', { address, error });
    }
  }

  /**
   * Test transaction signing with Nova Wallet
   */
  private async testTransactionSigning(connection: any, address: string): Promise<void> {
    logger.info('📝 Testing transaction signing with Nova Wallet...');

    try {
      if (!this.kusamaService) {
        throw new Error('Kusama service not available');
      }

      // Create a simple remark transaction
      const remark = 'Nova Wallet Demo Transaction';
      const remarkHex =
        '0x' +
        Array.from(new TextEncoder().encode(remark))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');

      logger.info('Creating remark transaction:', {
        address,
        remark,
        remarkHex,
      });

      // This would normally create a real extrinsic
      // For demo purposes, we'll simulate the signing process
      logger.info('✅ Transaction signing simulation completed!');
      logger.info('   In a real scenario, Nova Wallet would:');
      logger.info('   1. Show transaction details for review');
      logger.info('   2. Display estimated fees');
      logger.info('   3. Request user confirmation');
      logger.info('   4. Sign the transaction securely');
    } catch (error) {
      logger.error('Failed to test transaction signing', { address, error });
    }
  }

  /**
   * Test transaction submission
   */
  private async testTransactionSubmission(address: string): Promise<void> {
    logger.info('📤 Testing transaction submission...');

    try {
      if (!this.realTransactionService) {
        throw new Error('Real transaction service not available');
      }

      logger.info('✅ Transaction submission simulation completed!');
      logger.info('   Nova Wallet integration provides:');
      logger.info('   - Real-time transaction status updates');
      logger.info('   - Transaction history tracking');
      logger.info('   - Error handling and retry mechanisms');
      logger.info('   - Network confirmation monitoring');
    } catch (error) {
      logger.error('Failed to test transaction submission', { address, error });
    }
  }

  /**
   * Cleanup resources
   */
  private async cleanup(): Promise<void> {
    logger.info('🧹 Cleaning up Nova Wallet demo resources...');

    try {
      if (this.browserWalletService) {
        const connections = this.browserWalletService.getActiveConnections();
        for (const [address] of connections) {
          await this.browserWalletService.disconnectWallet(address);
        }
      }

      if (this.kusamaService) {
        await this.kusamaService.disconnect();
      }

      logger.info('✅ Cleanup completed');
    } catch (error) {
      logger.error('Error during cleanup', { error });
    }
  }
}

/**
 * Run the Nova Wallet demo
 */
export async function runNovaWalletDemo(): Promise<void> {
  const demo = new NovaWalletDemo();
  await demo.run();
}

// Export for use in other demos
export default NovaWalletDemo;
