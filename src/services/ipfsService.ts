import { create } from 'ipfs-http-client';
import { createLogger } from '../utils/logger';
const logger = createLogger('ipfs-service');
export interface IPFSConfig {
  host: string;
  port: number;
  protocol: 'http' | 'https';
  apiPath?: string;
}
export class IPFSService {
  private ipfs: any;
  private config: IPFSConfig;
  constructor(config: IPFSConfig) {
    this.config = config;
    this.initializeIPFS();
  }
  private initializeIPFS() {
    try {
      this.ipfs = create({
        host: this.config.host,
        port: this.config.port,
        protocol: this.config.protocol,
        apiPath: this.config.apiPath || '/api/v0',
      });
      logger.info('IPFS client initialized', {
        host: this.config.host,
        port: this.config.port,
        protocol: this.config.protocol,
      });
    } catch (error) {
      logger.error('Failed to initialize IPFS client', { error });
      throw new Error(
        `IPFS initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
  async uploadEncryptedData(encryptedData: string): Promise<string> {
    try {
      logger.info('Uploading encrypted data to IPFS');
      const result = await this.ipfs.add(encryptedData);
      const cid = result.cid.toString();
      logger.info('Successfully uploaded data to IPFS', { cid });
      return cid;
    } catch (error) {
      logger.error('Failed to upload data to IPFS', { error });
      throw new Error(
        `IPFS upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
  async retrieveEncryptedData(ipfsHash: string): Promise<string> {
    try {
      logger.info('Retrieving encrypted data from IPFS', { ipfsHash });
      const chunks: Uint8Array[] = [];
      for await (const chunk of this.ipfs.cat(ipfsHash)) {
        chunks.push(chunk as Uint8Array);
      }
      const data = Buffer.concat(chunks).toString('utf8');
      logger.info('Successfully retrieved data from IPFS', { ipfsHash });
      return data;
    } catch (error) {
      logger.error('Failed to retrieve data from IPFS', { ipfsHash, error });
      throw new Error(
        `IPFS retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
  async dataExists(ipfsHash: string): Promise<boolean> {
    try {
      await this.ipfs.files.stat(`/ipfs/${ipfsHash}`);
      return true;
    } catch (error) {
      return false;
    }
  }
  async pinData(ipfsHash: string): Promise<void> {
    try {
      logger.info('Pinning data to IPFS', { ipfsHash });
      await this.ipfs.pin.add(ipfsHash);
      logger.info('Successfully pinned data to IPFS', { ipfsHash });
    } catch (error) {
      logger.error('Failed to pin data to IPFS', { ipfsHash, error });
      throw new Error(
        `IPFS pin failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
  async unpinData(ipfsHash: string): Promise<void> {
    try {
      logger.info('Unpinning data from IPFS', { ipfsHash });
      await this.ipfs.pin.rm(ipfsHash);
      logger.info('Successfully unpinned data from IPFS', { ipfsHash });
    } catch (error) {
      logger.error('Failed to unpin data from IPFS', { ipfsHash, error });
      throw new Error(
        `IPFS unpin failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
  async getNodeInfo(): Promise<Record<string, unknown>> {
    try {
      const id = await this.ipfs.id();
      return id as Record<string, unknown>;
    } catch (error) {
      logger.error('Failed to get IPFS node info', { error });
      throw new Error(
        `Failed to get IPFS node info: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
  async testConnection(): Promise<boolean> {
    try {
      await this.getNodeInfo();
      logger.info('IPFS connection test successful');
      return true;
    } catch (error) {
      logger.error('IPFS connection test failed', { error });
      return false;
    }
  }
}
export const defaultIPFSConfig: IPFSConfig = {
  host: process.env['IPFS_HOST'] || 'ipfs.infura.io',
  port: parseInt(process.env['IPFS_PORT'] || '5001'),
  protocol: (process.env['IPFS_PROTOCOL'] as 'http' | 'https') || 'https',
  apiPath: process.env['IPFS_API_PATH'] || '/api/v0',
};
export const ipfsService = new IPFSService(defaultIPFSConfig);
