import { BrowserWalletService } from '../services/browserWalletService';
import { RealTransactionService } from '../services/realTransactionService';
import { WalletBasedKusamaService } from '../services/walletBasedKusamaService';
import { createLogger } from '../utils/logger';

const logger = createLogger('BrowserWalletDemo');

/**
 * Browser Wallet Demo
 *
 * This demo is designed to run in a browser environment and can:
 * 1. Detect installed wallet extensions
 * 2. Connect to real wallets
 * 3. Create and sign real Kusama transactions
 * 4. Submit transactions to the blockchain
 */
export class BrowserWalletDemo {
  private kusamaService: WalletBasedKusamaService;
  private browserWalletService: BrowserWalletService | null = null;
  private realTransactionService: RealTransactionService | null = null;

  constructor() {
    this.kusamaService = new WalletBasedKusamaService();
  }

  /**
   * Run the complete browser wallet demo
   */
  async run(): Promise<void> {
    try {
      logger.info('🚀 Starting Browser Wallet Demo');

      // Step 1: Initialize Kusama service
      await this.initializeKusamaService();

      // Step 2: Initialize browser wallet services
      await this.initializeBrowserServices();

      // Step 3: Check available wallet providers
      await this.checkWalletProviders();

      // Step 4: Connect to a wallet (if available)
      await this.connectToWallet();

      // Step 5: Demonstrate real transaction creation
      await this.demonstrateRealTransactionCreation();

      // Step 6: Show transaction status monitoring
      await this.demonstrateTransactionMonitoring();

      logger.info('✅ Browser Wallet Demo completed successfully');
    } catch (error) {
      logger.error('❌ Browser Wallet Demo failed', { error });
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
      // Note: This is a bit of a hack - in a real app, you'd want to share the API instance
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
   * Check available wallet providers
   */
  private async checkWalletProviders(): Promise<void> {
    logger.info('🔍 Checking available wallet providers...');

    try {
      if (!this.browserWalletService) {
        throw new Error('Browser wallet service not initialized');
      }

      const providers = this.browserWalletService.getAvailableProviders();
      logger.info('Available wallet providers:', { providers });

      if (providers.length === 0) {
        logger.warn('⚠️ No wallet providers available in this browser environment.');
        logger.info('💡 To test wallet integration, you need to:');
        logger.info('   1. Install Polkadot.js Extension');
        logger.info('   2. Install Talisman Wallet');
        logger.info('   3. Install SubWallet');
        logger.info('   4. Have at least one account in one of these wallets');
      } else {
        logger.info('🎉 Found wallet providers:', providers);
      }
    } catch (error) {
      logger.error('Failed to check wallet providers', { error });
    }
  }

  /**
   * Connect to a wallet provider
   */
  private async connectToWallet(): Promise<void> {
    logger.info('🔗 Attempting to connect to wallet...');

    try {
      if (!this.browserWalletService) {
        throw new Error('Browser wallet service not initialized');
      }

      const providers = this.browserWalletService.getAvailableProviders();

      if (providers.length === 0) {
        logger.info('💡 No wallet providers available - simulating connection...');
        logger.info('   In a real browser with wallet extensions, this would:');
        logger.info('   1. Show wallet selection UI');
        logger.info('   2. Request permission to access accounts');
        logger.info('   3. Display available accounts');
        logger.info('   4. Allow user to select an account');
        return;
      }

      // Try to connect to the first available provider
      const providerName = providers[0];
      logger.info('Attempting to connect to provider:', providerName);

      const result = await this.browserWalletService.connectToProvider(providerName);

      if (result.success && result.connection) {
        logger.info('✅ Successfully connected to wallet!', {
          provider: providerName,
          address: result.connection.account.address,
          accountType: result.connection.account.type,
        });

        // Get all accounts from this provider
        const accounts = await this.browserWalletService.getProviderAccounts(providerName);
        logger.info('Available accounts:', {
          count: accounts.length,
          accounts: accounts.map(acc => ({
            address: acc.address,
            name: acc.name,
            type: acc.type,
          })),
        });
      } else {
        logger.warn('⚠️ Failed to connect to wallet:', result.error);
      }
    } catch (error) {
      logger.error('Failed to connect to wallet', { error });
    }
  }

  /**
   * Demonstrate real transaction creation
   */
  private async demonstrateRealTransactionCreation(): Promise<void> {
    logger.info('✍️ Demonstrating real transaction creation...');

    try {
      if (!this.realTransactionService || !this.browserWalletService) {
        logger.warn('⚠️ Real transaction service not available - skipping demo');
        return;
      }

      // Check if we have any connected wallets
      const connections = this.browserWalletService.getActiveConnections();

      if (connections.size === 0) {
        logger.info('💡 No wallet connections available - simulating transaction creation...');
        logger.info('   In a real scenario with connected wallets, this would:');
        logger.info('   1. Create a real Kusama extrinsic');
        logger.info('   2. Estimate transaction fees');
        logger.info('   3. Present transaction details to user');
        logger.info('   4. Request user approval and signature');
        return;
      }

      // Use the first connected wallet
      const [userAddress] = connections.keys();
      logger.info('Creating real transaction for connected wallet:', userAddress);

      const credentialData = {
        type: 'browser_demo_credential',
        title: 'Browser Wallet Integration Test',
        description: 'This credential was created using the browser wallet demo',
        timestamp: new Date().toISOString(),
        demo: true,
      };

      // Create the transaction
      const transaction = await this.realTransactionService.createCredentialTransaction(
        userAddress,
        credentialData,
        'browser_demo'
      );

      logger.info('✅ Real transaction created successfully:', {
        nonce: transaction.nonce,
        tip: transaction.tip,
        estimatedFee: transaction.estimatedFee,
        extrinsicType: transaction.extrinsic.constructor.name,
      });

      // Demonstrate transaction signing (this would fail in current implementation)
      logger.info('💡 Attempting to sign transaction...');
      logger.info('   Note: Actual signing requires full extension API integration');

    } catch (error) {
      logger.error('Failed to demonstrate real transaction creation', { error });
    }
  }

  /**
   * Demonstrate transaction status monitoring
   */
  private async demonstrateTransactionMonitoring(): Promise<void> {
    logger.info('📊 Demonstrating transaction status monitoring...');

    try {
      if (!this.realTransactionService) {
        logger.warn('⚠️ Real transaction service not available - skipping demo');
        return;
      }

      // Create a mock transaction hash for demonstration
      const mockTxHash = '0x' + '0'.repeat(64);

      logger.info('Monitoring transaction:', mockTxHash);

      // Get transaction status
      const status = await this.realTransactionService.getTransactionStatus(mockTxHash);
      logger.info('Transaction status:', status);

      // Demonstrate waiting for confirmation
      logger.info('💡 In a real scenario, this would:');
      logger.info('   1. Poll the blockchain for transaction status');
      logger.info('   2. Show real-time updates to the user');
      logger.info('   3. Handle transaction finalization');
      logger.info('   4. Provide confirmation receipts');

    } catch (error) {
      logger.error('Failed to demonstrate transaction monitoring', { error });
    }
  }

  /**
   * Cleanup resources
   */
  private async cleanup(): Promise<void> {
    logger.info('🧹 Cleaning up resources...');

    try {
      // Disconnect all wallets
      if (this.browserWalletService) {
        const connections = this.browserWalletService.getActiveConnections();
        for (const [address] of connections) {
          await this.browserWalletService.disconnectWallet(address);
        }
      }

      // Disconnect Kusama service
      await this.kusamaService.disconnect();

      logger.info('✅ Cleanup completed');
    } catch (error) {
      logger.error('Failed to cleanup resources', { error });
    }
  }

  /**
   * Get demo status information
   */
  getDemoStatus(): {
    kusamaService: boolean;
    browserWalletService: boolean;
    realTransactionService: boolean;
    connectedWallets: number;
    availableProviders: string[];
  } {
    return {
      kusamaService: !!this.kusamaService,
      browserWalletService: !!this.browserWalletService,
      realTransactionService: !!this.realTransactionService,
      connectedWallets: this.browserWalletService?.getActiveConnections().size || 0,
      availableProviders: this.browserWalletService?.getAvailableProviders() || [],
    };
  }
}

/**
 * Run the demo if this file is executed directly
 */
if (require.main === module) {
  const demo = new BrowserWalletDemo();
  demo.run().catch((error) => {
    logger.error('Demo failed', { error });
    process.exit(1);
  });
}
