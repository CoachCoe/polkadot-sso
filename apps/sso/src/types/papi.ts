/**
 * PAPI (Polkadot API) Types and Interfaces
 * Following the same patterns as Google and Telegram auth types
 */

import { z } from 'zod';

// Chain configuration
export interface PAPIChainConfig {
  name: string;
  displayName: string;
  rpcUrl: string;
  chainId: string;
  ss58Format: number;
  decimals: number;
  tokenSymbol: string;
  isEnabled: boolean;
  timeout: number;
  retryAttempts: number;
}

// Chain information
export interface ChainInfo {
  name: string;
  displayName: string;
  chainId: string;
  ss58Format: number;
  decimals: number;
  tokenSymbol: string;
  isEnabled: boolean;
  isConnected: boolean;
  lastConnected?: number;
  version?: string;
  genesisHash?: string;
}

// Account balance information
export interface AccountBalance {
  address: string;
  chain: string;
  free: string;
  reserved: string;
  frozen: string;
  total: string;
  formatted: {
    free: string;
    reserved: string;
    frozen: string;
    total: string;
  };
}

// Account information
export interface AccountInfo {
  address: string;
  chain: string;
  nonce: number;
  consumers: number;
  providers: number;
  sufficients: number;
  data: AccountBalance;
}

// Transaction information
export interface TransactionInfo {
  id: string;
  chain: string;
  from: string;
  to?: string;
  amount?: string;
  method?: string;
  section?: string;
  hash?: string;
  status: 'pending' | 'submitted' | 'confirmed' | 'failed';
  blockNumber?: number;
  extrinsicIndex?: number;
  createdAt: number;
  updatedAt: number;
}

// PAPI service configuration
export interface PAPIConfig {
  chains: PAPIChainConfig[];
  defaultTimeout: number;
  maxRetries: number;
  connectionPoolSize: number;
  enableEventStreaming: boolean;
  enableTransactionTracking: boolean;
}

// PAPI client instance
export interface PAPIClient {
  chainName: string;
  isConnected: boolean;
  lastConnected?: number;
  version?: string;
  genesisHash?: string;
}

// Event information
export interface ChainEvent {
  id: string;
  chain: string;
  blockNumber: number;
  eventIndex: number;
  section: string;
  method: string;
  data: Record<string, any>;
  timestamp: number;
}

// PAPI service response types
export interface PAPIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}

// Request/Response schemas for validation
export const chainQuerySchema = z.object({
  chain: z.string().min(1, 'Chain name is required'),
});

export const addressQuerySchema = z.object({
  chain: z.string().min(1, 'Chain name is required'),
  address: z.string().min(1, 'Address is required'),
});

export const balanceQuerySchema = z.object({
  chain: z.string().min(1, 'Chain name is required'),
  address: z.string().min(1, 'Address is required'),
});

export const accountInfoQuerySchema = z.object({
  chain: z.string().min(1, 'Chain name is required'),
  address: z.string().min(1, 'Address is required'),
});

export const transactionQuerySchema = z.object({
  chain: z.string().min(1, 'Chain name is required'),
  hash: z.string().min(1, 'Transaction hash is required'),
});

export const eventQuerySchema = z.object({
  chain: z.string().min(1, 'Chain name is required'),
  fromBlock: z.number().optional(),
  toBlock: z.number().optional(),
  section: z.string().optional(),
  method: z.string().optional(),
});

// PAPI error types
export class PAPIError extends Error {
  constructor(
    message: string,
    public chain?: string,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'PAPIError';
  }
}

export class ChainNotSupportedError extends PAPIError {
  constructor(chain: string) {
    super(`Chain '${chain}' is not supported`, chain, 'CHAIN_NOT_SUPPORTED');
    this.name = 'ChainNotSupportedError';
  }
}

export class ChainConnectionError extends PAPIError {
  constructor(chain: string, details?: any) {
    super(`Failed to connect to chain '${chain}'`, chain, 'CHAIN_CONNECTION_ERROR', details);
    this.name = 'ChainConnectionError';
  }
}

export class TransactionError extends PAPIError {
  constructor(message: string, chain: string, details?: any) {
    super(message, chain, 'TRANSACTION_ERROR', details);
    this.name = 'TransactionError';
  }
}

// Export schemas for use in routes
export const papiSchemas = {
  chainQuery: chainQuerySchema,
  addressQuery: addressQuerySchema,
  balanceQuery: balanceQuerySchema,
  accountInfoQuery: accountInfoQuerySchema,
  transactionQuery: transactionQuerySchema,
  eventQuery: eventQuerySchema,
};
