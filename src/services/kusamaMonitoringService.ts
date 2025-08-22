import { ApiPromise } from '@polkadot/api';
import { createLogger } from '../utils/logger';

const _logger = createLogger('kusama-monitoring');

export interface TransactionStatus {
  hash: string;
  status: 'pending' | 'finalized' | 'failed' | 'invalid';
  blockHash?: string;
  blockNumber?: number;
  timestamp: number;
  events?: any[];
  error?: string;
}

export interface MonitoringConfig {
  maxRetries: number;
  retryInterval: number; // milliseconds
  timeoutDuration: number; // milliseconds
}

export class KusamaMonitoringService {
  private api: ApiPromise;
  private activeMonitors: Map<string, NodeJS.Timeout> = new Map();
  private logger = createLogger('kusama-monitoring');
  private config: MonitoringConfig;

  constructor(api: ApiPromise, config?: Partial<MonitoringConfig>) {
    this.api = api;
    this.config = {
      maxRetries: 10,
      retryInterval: 6000, // 6 seconds (block time)
      timeoutDuration: 300000, // 5 minutes
      ...config,
    };
  }

  /**
   * Monitor a transaction until it's finalized or times out
   */
  async monitorTransaction(
    transactionHash: string,
    onStatusUpdate?: (status: TransactionStatus) => void
  ): Promise<TransactionStatus> {
    return new Promise((resolve, reject) => {
      let retryCount = 0;
      const startTime = Date.now();

      const checkStatus = async () => {
        try {
          // Check if we've exceeded timeout
          if (Date.now() - startTime > this.config.timeoutDuration) {
            this.cleanup(transactionHash);
            const timeoutStatus: TransactionStatus = {
              hash: transactionHash,
              status: 'failed',
              timestamp: Date.now(),
              error: 'Transaction monitoring timeout',
            };
            onStatusUpdate?.(timeoutStatus);
            resolve(timeoutStatus);
            return;
          }

          // Get transaction status
          const status = await this.getTransactionStatus(transactionHash);

          this.logger.info('Transaction status check', {
            hash: transactionHash,
            status: status.status,
            blockNumber: status.blockNumber,
            retry: retryCount,
          });

          onStatusUpdate?.(status);

          if (
            status.status === 'finalized' ||
            status.status === 'failed' ||
            status.status === 'invalid'
          ) {
            this.cleanup(transactionHash);
            resolve(status);
            return;
          }

          // Continue monitoring if still pending
          if (status.status === 'pending') {
            retryCount++;

            if (retryCount >= this.config.maxRetries) {
              this.cleanup(transactionHash);
              const failedStatus: TransactionStatus = {
                hash: transactionHash,
                status: 'failed',
                timestamp: Date.now(),
                error: 'Maximum retries exceeded',
              };
              onStatusUpdate?.(failedStatus);
              resolve(failedStatus);
              return;
            }

            // Schedule next check
            const timeoutId = setTimeout(checkStatus, this.config.retryInterval);
            this.activeMonitors.set(transactionHash, timeoutId);
          }
        } catch (error) {
          this.logger.error('Error monitoring transaction', {
            hash: transactionHash,
            error: error instanceof Error ? error.message : 'Unknown error',
            retry: retryCount,
          });

          retryCount++;
          if (retryCount >= this.config.maxRetries) {
            this.cleanup(transactionHash);
            const errorStatus: TransactionStatus = {
              hash: transactionHash,
              status: 'failed',
              timestamp: Date.now(),
              error: error instanceof Error ? error.message : 'Unknown monitoring error',
            };
            onStatusUpdate?.(errorStatus);
            resolve(errorStatus);
          } else {
            // Retry after interval
            const timeoutId = setTimeout(checkStatus, this.config.retryInterval);
            this.activeMonitors.set(transactionHash, timeoutId);
          }
        }
      };

      // Start monitoring
      void checkStatus();
    });
  }

  /**
   * Get current status of a transaction
   */
  private async getTransactionStatus(transactionHash: string): Promise<TransactionStatus> {
    try {
      // Try to get transaction info
      const signedBlock = await this.api.rpc.chain.getBlock();
      const apiAt = await this.api.at(signedBlock.block.header.hash);

      // Check if transaction is in recent blocks
      const currentBlockNumber = signedBlock.block.header.number.toNumber();

      // Search recent blocks for the transaction
      for (let i = 0; i < 10; i++) {
        const blockNumber = currentBlockNumber - i;
        if (blockNumber < 0) break;

        try {
          const blockHash = await this.api.rpc.chain.getBlockHash(blockNumber);
          const block = await this.api.rpc.chain.getBlock(blockHash);

          // Check if our transaction is in this block
          const foundTx = block.block.extrinsics.find(
            ext => ext.hash.toString() === transactionHash
          );

          if (foundTx) {
            // Get events for this block
            const events = await this.api.query.system.events.at(blockHash);
            const txEvents = (events as unknown as any[]).filter(
              event =>
                event.phase.isApplyExtrinsic &&
                event.phase.asApplyExtrinsic.eq(block.block.extrinsics.indexOf(foundTx))
            );

            // Check if transaction was successful
            const hasFailedEvent = txEvents.some(
              event =>
                event.event.section === 'system' &&
                (event.event.method === 'ExtrinsicFailed' || event.event.method === 'DispatchError')
            );

            const hasSuccessEvent = txEvents.some(
              event => event.event.section === 'system' && event.event.method === 'ExtrinsicSuccess'
            );

            return {
              hash: transactionHash,
              status: hasFailedEvent ? 'failed' : hasSuccessEvent ? 'finalized' : 'pending',
              blockHash: blockHash.toString(),
              blockNumber,
              timestamp: Date.now(),
              events: txEvents.map(e => ({
                section: e.event.section,
                method: e.event.method,
                data: e.event.data.toString(),
              })),
            };
          }
        } catch (blockError) {
          // Continue searching other blocks
          continue;
        }
      }

      // Transaction not found in recent blocks - still pending
      return {
        hash: transactionHash,
        status: 'pending',
        timestamp: Date.now(),
      };
    } catch (error) {
      this.logger.error('Failed to get transaction status', {
        hash: transactionHash,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        hash: transactionHash,
        status: 'failed',
        timestamp: Date.now(),
        error: error instanceof Error ? error.message : 'Status check failed',
      };
    }
  }

  /**
   * Stop monitoring a specific transaction
   */
  stopMonitoring(transactionHash: string): void {
    this.cleanup(transactionHash);
    this.logger.info('Stopped monitoring transaction', { hash: transactionHash });
  }

  /**
   * Stop monitoring all transactions
   */
  stopAllMonitoring(): void {
    for (const [hash, timeoutId] of this.activeMonitors.entries()) {
      clearTimeout(timeoutId);
      this.logger.info('Stopped monitoring transaction', { hash });
    }
    this.activeMonitors.clear();
  }

  /**
   * Get list of currently monitored transactions
   */
  getActiveMonitors(): string[] {
    return Array.from(this.activeMonitors.keys());
  }

  /**
   * Estimate transaction fees
   */
  async estimateTransactionFee(extrinsic: any): Promise<string> {
    try {
      const paymentInfo = await this.api.tx.system
        .remark('')
        .paymentInfo('5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY');
      return paymentInfo.partialFee.toString();
    } catch (error) {
      this.logger.error('Failed to estimate transaction fee', { error });
      return '0';
    }
  }

  /**
   * Check network health
   */
  async getNetworkHealth(): Promise<{
    isHealthy: boolean;
    latestBlock: number;
    peerCount: number;
    syncState: any;
  }> {
    try {
      const [header, health, peers] = await Promise.all([
        this.api.rpc.chain.getHeader(),
        this.api.rpc.system.health(),
        this.api.rpc.system.peers(),
      ]);

      return {
        isHealthy: health.isSyncing.isFalse && health.shouldHavePeers.isTrue,
        latestBlock: header.number.toNumber(),
        peerCount: peers.length,
        syncState: {
          isSyncing: health.isSyncing.isTrue,
          shouldHavePeers: health.shouldHavePeers.isTrue,
          peers: health.peers.toNumber(),
        },
      };
    } catch (error) {
      this.logger.error('Failed to get network health', { error });
      return {
        isHealthy: false,
        latestBlock: 0,
        peerCount: 0,
        syncState: { error: error instanceof Error ? error.message : 'Unknown error' },
      };
    }
  }

  private cleanup(transactionHash: string): void {
    const timeoutId = this.activeMonitors.get(transactionHash);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.activeMonitors.delete(transactionHash);
    }
  }
}

export default KusamaMonitoringService;
