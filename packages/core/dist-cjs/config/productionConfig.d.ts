import { ExchangeRateConfig } from '../services/exchangeRateService';
export interface ProductionConfig {
    environment: 'development' | 'staging' | 'production';
    security: SecurityConfig;
    database: DatabaseConfig;
    exchangeRates: ExchangeRateConfig;
    remittance: RemittanceConfig;
    chains: ChainConfig;
    logging: LoggingConfig;
}
export interface SecurityConfig {
    jwtAccessSecret: string;
    jwtRefreshSecret: string;
    jwtIssuer: string;
    jwtAccessExpiry: number;
    jwtRefreshExpiry: number;
    enableSignatureVerification: boolean;
    enableRateLimiting: boolean;
    enableCORS: boolean;
    allowedOrigins: string[];
    enableHelmet: boolean;
    sessionSecret: string;
    encryptionKey: string;
}
export interface DatabaseConfig {
    type: 'sqlite' | 'postgresql' | 'mysql';
    host?: string;
    port?: number;
    database: string;
    username?: string;
    password?: string;
    ssl?: boolean;
    connectionString?: string;
}
export interface RemittanceConfig {
    enabled: boolean;
    defaultCurrency: string;
    supportedCurrencies: string[];
    treasuryAddress: string;
    minDeposit: number;
    maxWithdrawal: number;
    custodyLevels: CustodyLevelConfig[];
}
export interface CustodyLevelConfig {
    level: number;
    name: string;
    description: string;
    dailyLimit: number;
    monthlyLimit: number;
    perTransactionLimit: number;
    requiredAuth: string[];
    fees: {
        platform: number;
        network: number;
        exchange: number;
    };
}
export interface ChainConfig {
    defaultChain: string;
    rpcUrls: Record<string, string>;
    backupRpcUrls: Record<string, string[]>;
    timeout: number;
    retries: number;
}
export interface LoggingConfig {
    level: 'error' | 'warn' | 'info' | 'debug';
    enableConsole: boolean;
    enableFile: boolean;
    filePath?: string;
    maxFileSize?: string;
    maxFiles?: number;
}
/**
 * Production configuration validator and loader
 */
export declare class ProductionConfigManager {
    private config;
    private validationErrors;
    /**
     * Load and validate configuration from environment variables
     */
    loadConfig(): ProductionConfig;
    /**
     * Get current environment
     */
    private getEnvironment;
    /**
     * Load security configuration
     */
    private loadSecurityConfig;
    /**
     * Load database configuration
     */
    private loadDatabaseConfig;
    /**
     * Load exchange rate configuration
     */
    private loadExchangeRateConfig;
    /**
     * Load remittance configuration
     */
    private loadRemittanceConfig;
    /**
     * Load custody level configurations
     */
    private loadCustodyLevels;
    /**
     * Load chain configuration
     */
    private loadChainConfig;
    /**
     * Load logging configuration
     */
    private loadLoggingConfig;
    /**
     * Validate the loaded configuration
     */
    private validateConfig;
    /**
     * Get required environment variable with validation
     */
    private getRequiredEnv;
    /**
     * Parse comma-separated array from environment variable
     */
    private parseArrayEnv;
    /**
     * Get validation errors
     */
    getValidationErrors(): string[];
    /**
     * Check if configuration is valid
     */
    isValid(): boolean;
    /**
     * Get configuration summary for logging
     */
    getConfigSummary(): Record<string, any>;
}
/**
 * Global configuration manager instance
 */
export declare const configManager: ProductionConfigManager;
/**
 * Get the current configuration
 */
export declare function getConfig(): ProductionConfig;
/**
 * Validate configuration and throw if invalid
 */
export declare function validateConfig(): void;
//# sourceMappingURL=productionConfig.d.ts.map