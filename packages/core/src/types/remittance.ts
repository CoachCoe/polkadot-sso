import { PolkadotSession, PolkadotUser } from './index';

export interface TransactionLimits {
  daily: number;
  monthly: number;
  perTransaction: number;
  currency: 'USD';
}

export interface RecoveryMethod {
  type: 'email' | 'sms' | 'wallet' | 'backup_questions';
  value: string;
  verified: boolean;
  createdAt: Date;
}

export interface RemittanceUser extends PolkadotUser {
  custodyLevel: 0 | 1 | 2 | 3;
  kycStatus: 'pending' | 'verified' | 'rejected';
  limits: TransactionLimits;
  walletAddresses: Record<string, string>; // chain -> address
  recoveryMethods: RecoveryMethod[];
  createdAt: Date;
  lastActivity: Date;
}

export interface RemittanceSession extends PolkadotSession {
  custodyLevel: number;
  kycStatus: string;
  limits: TransactionLimits | null;
  walletAddresses: Record<string, string>;
  recoveryMethods: RecoveryMethod[];
}

export interface RemittanceTransaction {
  id: string;
  senderId: string;
  recipientContact: string; // phone/email
  recipientId?: string; // if claimed
  amount: number;
  currency: 'USD';
  targetCurrency: 'ARS' | 'BRL' | 'USD';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'expired';
  claimLink: string;
  expiresAt: Date;
  fees: FeeBreakdown;
  exchangeRate?: number;
  onChainTxHash?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FeeBreakdown {
  platform: number;
  network: number;
  exchange: number;
  total: number;
}

export interface CustodyLevelConfig {
  method: string;
  limits: TransactionLimits | null;
  requiredAuth: string[];
  description: string;
}

export interface KYCResult {
  status: 'pending' | 'verified' | 'rejected';
  riskScore: number;
  requiredActions: string[];
  expiresAt: Date;
}

export interface ClaimResult {
  success: boolean;
  amount: number;
  currency: string;
  method: 'cash' | 'bank' | 'wallet';
  reference?: string;
}

export interface ExchangeRate {
  from: string;
  to: string;
  rate: number;
  timestamp: Date;
  source: string;
}

export interface ComplianceCheck {
  passed: boolean;
  riskScore: number;
  flags: string[];
  requiredActions: string[];
}

export interface CustodyUpgrade {
  id: string;
  userId: string;
  fromLevel: number;
  toLevel: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  requiredAuth: any;
  completedAuth: any;
  createdAt: Date;
  completedAt?: Date;
}

export interface RemittanceConfig {
  custodyLevels: Record<number, CustodyLevelConfig>;
  supportedCurrencies: string[];
  supportedCorridors: string[];
  defaultLimits: TransactionLimits;
  feeStructure: {
    baseFee: number;
    custodyDiscount: number;
    minFee: number;
    networkFee: number;
    exchangeFee: number;
  };
}
