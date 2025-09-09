import { ApiPromise } from '@polkadot/api';
import { Keyring } from '@polkadot/keyring';
export interface TreasuryManager {
    createMultiSigWallet(owners: string[], threshold: number, custodyLevel: number): Promise<string>;
    depositFunds(amount: bigint, currency: string): Promise<string>;
    withdrawFunds(amount: bigint, to: string): Promise<string>;
    checkTransactionLimits(user: string, amount: bigint, custodyLevel: number): Promise<boolean>;
    getTransactionHistory(user: string): Promise<Transaction[]>;
    getBalance(address: string, chain: string): Promise<bigint>;
    transferToChain(fromChain: string, toChain: string, amount: bigint, recipient: string): Promise<string>;
}
export interface Transaction {
    id: string;
    from: string;
    to: string;
    amount: bigint;
    currency: string;
    timestamp: Date;
    status: 'pending' | 'confirmed' | 'failed';
    blockHash?: string;
    txHash?: string;
}
export interface MultiSigWallet {
    address: string;
    owners: string[];
    threshold: number;
    custodyLevel: number;
    balance: bigint;
    isActive: boolean;
}
export interface TreasuryConfig {
    supportedChains: string[];
    defaultChain: string;
    treasuryAddress: string;
    minDeposit: bigint;
    maxWithdrawal: bigint;
    feePercentage: number;
}
/**
 * Polkadot/Substrate Treasury Manager Implementation
 */
export declare class SubstrateTreasuryManager implements TreasuryManager {
    private api;
    private keyring;
    private config;
    private multiSigWallets;
    constructor(api: ApiPromise, keyring: Keyring, config: TreasuryConfig);
    /**
     * Create a multi-sig wallet for a specific custody level
     */
    createMultiSigWallet(owners: string[], threshold: number, custodyLevel: number): Promise<string>;
    /**
     * Deposit funds into the treasury
     */
    depositFunds(amount: bigint, currency: string): Promise<string>;
    /**
     * Withdraw funds from treasury
     */
    withdrawFunds(amount: bigint, to: string): Promise<string>;
    /**
     * Check if transaction is within limits for custody level
     */
    checkTransactionLimits(user: string, amount: bigint, custodyLevel: number): Promise<boolean>;
    /**
     * Get transaction history for a user
     */
    getTransactionHistory(user: string): Promise<Transaction[]>;
    /**
     * Get balance for an address on a specific chain
     */
    getBalance(address: string, chain: string): Promise<bigint>;
    /**
     * Transfer funds between chains
     */
    transferToChain(fromChain: string, toChain: string, amount: bigint, recipient: string): Promise<string>;
    /**
     * Store custody level metadata on-chain
     */
    private storeCustodyMetadata;
    /**
     * Get limits for a specific custody level
     */
    private getLimitsForCustodyLevel;
    /**
     * Get user transaction history (mock implementation)
     */
    private getUserTransactionHistory;
}
/**
 * Ethereum Treasury Manager Implementation (for cross-chain support)
 */
export declare class EthereumTreasuryManager implements TreasuryManager {
    private provider;
    private config;
    constructor(provider: any, config: TreasuryConfig);
    createMultiSigWallet(owners: string[], threshold: number, custodyLevel: number): Promise<string>;
    depositFunds(amount: bigint, currency: string): Promise<string>;
    withdrawFunds(amount: bigint, to: string): Promise<string>;
    checkTransactionLimits(user: string, amount: bigint, custodyLevel: number): Promise<boolean>;
    getTransactionHistory(user: string): Promise<Transaction[]>;
    getBalance(address: string, chain: string): Promise<bigint>;
    transferToChain(fromChain: string, toChain: string, amount: bigint, recipient: string): Promise<string>;
}
/**
 * Factory for creating treasury managers
 */
export declare class TreasuryManagerFactory {
    static createSubstrateManager(api: ApiPromise, keyring: Keyring, config: TreasuryConfig): SubstrateTreasuryManager;
    static createEthereumManager(provider: any, config: TreasuryConfig): EthereumTreasuryManager;
}
//# sourceMappingURL=TreasuryManager.d.ts.map