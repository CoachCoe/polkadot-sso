import { WalletBasedKusamaService } from '../services/walletBasedKusamaService';
import { createLogger } from '../utils/logger';

const logger = createLogger('NodeWalletDemo');

/**
 * Node.js Wallet Demo
 *
 * This demo is designed to run in a Node.js environment and demonstrates:
 * 1. Kusama service initialization
 * 2. Mock wallet integration
 * 3. Transaction creation and simulation
 * 4. Service architecture validation
 */
export class NodeWalletDemo {
  private kusamaService: WalletBasedKusamaService;

  constructor() {
    this.kusamaService = new WalletBasedKusamaService();
  }

  /**
   * Run the complete Node.js wallet demo
   */
  async run(): Promise<void> {
    try {
      logger.info('🚀 Starting Node.js Wallet Demo');

      // Step 1: Initialize Kusama service
      await this.initializeKusamaService();

      // Step 2: Test wallet service methods
      await this.testWalletServiceMethods();

      // Step 3: Demonstrate credential operations
      await this.demonstrateCredentialOperations();

      // Step 4: Test transaction simulation
      await this.testTransactionSimulation();

      // Step 5: Validate service architecture
      await this.validateServiceArchitecture();

      logger.info('✅ Node.js Wallet Demo completed successfully');
    } catch (error) {
      logger.error('❌ Node.js Wallet Demo failed', { error });
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
   * Test wallet service methods
   */
  private async testWalletServiceMethods(): Promise<void> {
    logger.info('🔧 Testing wallet service methods...');

    try {
      // Test getting available providers (should be empty in Node.js)
      const providers = this.kusamaService.getAvailableWalletProviders();
      logger.info('Available wallet providers:', { providers });

      if (providers.length === 0) {
        logger.info('💡 No wallet providers available in Node.js environment (expected)');
        logger.info('   In a browser environment, this would detect:');
        logger.info('   - Polkadot.js Extension');
        logger.info('   - Talisman Wallet');
        logger.info('   - SubWallet');
      }

      // Test wallet connection status
      const testAddress = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
      const isConnected = this.kusamaService.isWalletConnected(testAddress);
      logger.info('Wallet connection status:', { address: testAddress, isConnected });

      logger.info('✅ Wallet service methods tested successfully');
    } catch (error) {
      logger.error('Failed to test wallet service methods', { error });
    }
  }

  /**
   * Demonstrate credential operations
   */
  private async demonstrateCredentialOperations(): Promise<void> {
    logger.info('💾 Demonstrating credential operations...');

    try {
      const testAddress = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';

      // Test credential storage
      const credentialData = {
        type: 'node_demo_credential',
        title: 'Node.js Wallet Integration Test',
        description: 'This credential was created using the Node.js wallet demo',
        timestamp: new Date().toISOString(),
        demo: true,
        environment: 'Node.js',
        features: ['Kusama Integration', 'Mock Wallet', 'Transaction Simulation'],
      };

      logger.info('Storing credential with data:', credentialData);

      const storageResult = await this.kusamaService.storeCredentialWithWallet(
        testAddress,
        credentialData,
        'node_demo'
      );

      logger.info('✅ Credential stored successfully:', {
        credentialId: storageResult.credentialId,
        storageMethod: storageResult.storageMethod,
        success: storageResult.success,
      });

      // Test credential retrieval
      const credentials = await this.kusamaService.listCredentialsWithWallet(testAddress);

      logger.info('✅ Credentials retrieved successfully:', {
        count: credentials.length,
        credentials: credentials.map(c => ({
          id: c.credentialId,
          type: c.credentialType,
          timestamp: new Date(c.timestamp).toISOString(),
        })),
      });

      // Test credential retrieval by ID
      if (credentials.length > 0) {
        const firstCredential = credentials[0];
        const retrievedCredential = await this.kusamaService.retrieveCredentialWithWallet(
          firstCredential.credentialId,
          testAddress
        );

        if (retrievedCredential) {
          logger.info('✅ Individual credential retrieved successfully:', {
            id: retrievedCredential.credentialId,
            type: retrievedCredential.credentialType,
            timestamp: new Date(retrievedCredential.timestamp).toISOString(),
          });
        }
      }

    } catch (error) {
      logger.error('Failed to demonstrate credential operations', { error });
    }
  }

  /**
   * Test transaction simulation
   */
  private async testTransactionSimulation(): Promise<void> {
    logger.info('✍️ Testing transaction simulation...');

    try {
      const testAddress = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';

      // Test transaction creation
      const credentialData = {
        type: 'transaction_test',
        title: 'Transaction Simulation Test',
        description: 'Testing transaction creation and simulation',
        timestamp: new Date().toISOString(),
        test: true,
      };

      const transaction = await this.kusamaService.createCredentialTransaction(
        testAddress,
        credentialData,
        'transaction_test'
      );

      logger.info('✅ Transaction created successfully:', {
        nonce: transaction.nonce,
        tip: transaction.tip,
        extrinsicType: transaction.extrinsic.constructor.name,
      });

      // Test transaction submission simulation
      const submissionResult = await this.kusamaService.submitSignedTransaction(
        transaction.extrinsic,
        testAddress
      );

      logger.info('✅ Transaction submission simulated successfully:', {
        success: submissionResult.success,
        blockHash: submissionResult.blockHash,
        txHash: submissionResult.txHash,
      });

      // Test cost estimation
      const costEstimate = await this.kusamaService.estimateStorageCost(
        JSON.stringify(credentialData).length,
        testAddress
      );

      logger.info('✅ Storage cost estimated successfully:', {
        estimatedCost: costEstimate.estimatedCost,
        currency: costEstimate.currency,
        storageMethod: costEstimate.storageMethod,
      });

    } catch (error) {
      logger.error('Failed to test transaction simulation', { error });
    }
  }

  /**
   * Validate service architecture
   */
  private async validateServiceArchitecture(): Promise<void> {
    logger.info('🏗️ Validating service architecture...');

    try {
      // Test blockchain querying
      const testAddress = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';

      const credentials = await this.kusamaService.queryUserCredentials(testAddress);

      logger.info('✅ Blockchain querying working:', {
        count: credentials.length,
        credentials: credentials.map(c => ({
          blockNumber: c.blockNumber,
          type: c.remarkData.type,
          credentialType: c.remarkData.credentialType,
        })),
      });

      // Test service health
      const serviceStatus = {
        kusamaService: !!this.kusamaService,
        hasApi: !!(this.kusamaService as any).api,
        isConnected: (this.kusamaService as any).isConnected,
        hasWalletService: !!(this.kusamaService as any).walletConnectionService,
      };

      logger.info('✅ Service architecture validation:', serviceStatus);

      // Test error handling
      try {
        await this.kusamaService.storeCredentialWithWallet(
          'invalid-address',
          { test: true },
          'error_test'
        );
      } catch (error) {
        logger.info('✅ Error handling working correctly:', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }

    } catch (error) {
      logger.error('Failed to validate service architecture', { error });
    }
  }

  /**
   * Cleanup resources
   */
  private async cleanup(): Promise<void> {
    logger.info('🧹 Cleaning up resources...');

    try {
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
    hasApi: boolean;
    isConnected: boolean;
    hasWalletService: boolean;
  } {
    return {
      kusamaService: !!this.kusamaService,
      hasApi: !!(this.kusamaService as any).api,
      isConnected: (this.kusamaService as any).isConnected,
      hasWalletService: !!(this.kusamaService as any).walletConnectionService,
    };
  }
}

/**
 * Run the demo if this file is executed directly
 */
if (require.main === module) {
  const demo = new NodeWalletDemo();
  demo.run().catch((error) => {
    logger.error('Demo failed', { error });
    process.exit(1);
  });
}
