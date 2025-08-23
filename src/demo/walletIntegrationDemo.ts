import { WalletBasedKusamaService } from '../services/walletBasedKusamaService';
import { createLogger } from '../utils/logger';

const logger = createLogger('WalletIntegrationDemo');

/**
 * Wallet Integration Demo
 *
 * Demonstrates the complete workflow of:
 * 1. Connecting to wallet providers
 * 2. Storing credentials on Kusama
 * 3. Retrieving credentials from Kusama
 * 4. Transaction signing and submission
 */
export class WalletIntegrationDemo {
  private kusamaService: WalletBasedKusamaService;

  constructor() {
    this.kusamaService = new WalletBasedKusamaService();
  }

  /**
   * Run the complete wallet integration demo
   */
  async run(): Promise<void> {
    try {
      logger.info('🚀 Starting Wallet Integration Demo');

      // Step 1: Initialize Kusama service
      await this.initializeKusamaService();

      // Step 2: Check available wallet providers
      await this.checkWalletProviders();

      // Step 3: Connect to a wallet (simulate)
      await this.connectToWallet();

      // Step 4: Store credentials on Kusama
      await this.storeCredentialsOnKusama();

      // Step 5: Retrieve credentials from Kusama
      await this.retrieveCredentialsFromKusama();

      // Step 6: Demonstrate transaction creation and signing
      await this.demonstrateTransactionSigning();

      logger.info('✅ Wallet Integration Demo completed successfully');
    } catch (error) {
      logger.error('❌ Wallet Integration Demo failed', { error });
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
   * Check available wallet providers
   */
  private async checkWalletProviders(): Promise<void> {
    logger.info('🔍 Checking available wallet providers...');

    try {
      const providers = this.kusamaService.getAvailableWalletProviders();
      logger.info('Available wallet providers:', { providers });

      if (providers.length === 0) {
        logger.warn('⚠️ No wallet providers available. This is expected in a Node.js environment.');
        logger.info('💡 In a browser environment, you would see providers like:');
        logger.info('   - Polkadot.js Extension');
        logger.info('   - Talisman Wallet');
        logger.info('   - SubWallet');
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
      // In a real browser environment, this would connect to an actual wallet
      // For demo purposes, we'll simulate the connection
      logger.info('💡 Simulating wallet connection...');

      // Simulate checking if wallet is connected
      const isConnected = this.kusamaService.isWalletConnected(
        '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'
      );
      logger.info('Wallet connection status:', { isConnected });

      logger.info('✅ Wallet connection demo completed');
    } catch (error) {
      logger.error('Failed to connect to wallet', { error });
    }
  }

  /**
   * Store credentials on Kusama
   */
  private async storeCredentialsOnKusama(): Promise<void> {
    logger.info('💾 Storing credentials on Kusama...');

    try {
      const credentialData = {
        type: 'professional_certification',
        organization: 'Blockchain Institute',
        certification: 'Advanced Kusama Developer',
        issuedDate: new Date().toISOString(),
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        skills: ['Kusama', 'Polkadot', 'Substrate', 'Rust', 'TypeScript'],
        level: 'Advanced',
      };

      const result = await this.kusamaService.storeCredentialWithWallet(
        '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        credentialData,
        'professional_certification'
      );

      logger.info('✅ Credential stored successfully:', {
        credentialId: result.credentialId,
        storageMethod: result.storageMethod,
        success: result.success,
      });
    } catch (error) {
      logger.error('Failed to store credential', { error });
    }
  }

  /**
   * Retrieve credentials from Kusama
   */
  private async retrieveCredentialsFromKusama(): Promise<void> {
    logger.info('🔍 Retrieving credentials from Kusama...');

    try {
      const credentials = await this.kusamaService.listCredentialsWithWallet(
        '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'
      );

      logger.info('✅ Credentials retrieved successfully:', {
        count: credentials.length,
        credentials: credentials.map(c => ({
          id: c.credentialId,
          type: c.credentialType,
          timestamp: new Date(c.timestamp).toISOString(),
        })),
      });
    } catch (error) {
      logger.error('Failed to retrieve credentials', { error });
    }
  }

  /**
   * Demonstrate transaction creation and signing
   */
  private async demonstrateTransactionSigning(): Promise<void> {
    logger.info('✍️ Demonstrating transaction creation and signing...');

    try {
      const credentialData = {
        type: 'academic_degree',
        institution: 'University of Blockchain',
        degree: 'Master of Science in Distributed Systems',
        graduationYear: 2024,
        gpa: 3.9,
        thesis: 'Scalable Credential Management on Kusama',
      };

      // Create transaction
      const transaction = await this.kusamaService.createCredentialTransaction(
        '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        credentialData,
        'academic_degree'
      );

      logger.info('✅ Transaction created successfully:', {
        nonce: transaction.nonce,
        tip: transaction.tip,
        extrinsicType: transaction.extrinsic.constructor.name,
      });

      // Simulate transaction signing
      logger.info('💡 Simulating transaction signing...');
      logger.info('   In a real implementation, this would:');
      logger.info('   1. Present the transaction to the user');
      logger.info('   2. User signs with their private key');
      logger.info('   3. Submit the signed transaction to Kusama');
      logger.info('   4. Wait for confirmation');

      // Simulate transaction submission
      const submissionResult = await this.kusamaService.submitSignedTransaction(
        transaction.extrinsic,
        '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'
      );

      logger.info('✅ Transaction submitted successfully:', {
        success: submissionResult.success,
        blockHash: submissionResult.blockHash,
        txHash: submissionResult.txHash,
      });
    } catch (error) {
      logger.error('Failed to demonstrate transaction signing', { error });
    }
  }

  /**
   * Query user credentials from Kusama blockchain
   */
  private async queryBlockchainCredentials(): Promise<void> {
    logger.info('🔍 Querying blockchain for user credentials...');

    try {
      const credentials = await this.kusamaService.queryUserCredentials(
        '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'
      );

      logger.info('✅ Blockchain query completed:', {
        count: credentials.length,
        credentials: credentials.map(c => ({
          blockNumber: c.blockNumber,
          type: c.remarkData.type,
          credentialType: c.remarkData.credentialType,
        })),
      });
    } catch (error) {
      logger.error('Failed to query blockchain credentials', { error });
    }
  }

  /**
   * Estimate storage costs
   */
  private async estimateStorageCosts(): Promise<void> {
    logger.info('💰 Estimating storage costs...');

    try {
      const sampleData = {
        type: 'sample_credential',
        data: 'This is a sample credential for cost estimation',
        metadata: {
          created: new Date().toISOString(),
          version: '1.0',
        },
      };

      const costEstimate = await this.kusamaService.estimateStorageCost(
        JSON.stringify(sampleData).length,
        '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'
      );

      logger.info('✅ Storage cost estimated:', {
        estimatedCost: costEstimate.estimatedCost,
        currency: costEstimate.currency,
        storageMethod: costEstimate.storageMethod,
      });
    } catch (error) {
      logger.error('Failed to estimate storage costs', { error });
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
}

/**
 * Run the demo if this file is executed directly
 */
if (require.main === module) {
  const demo = new WalletIntegrationDemo();
  demo.run().catch(error => {
    logger.error('Demo failed', { error });
    process.exit(1);
  });
}
