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
  jwtAccessExpiry: number; // seconds
  jwtRefreshExpiry: number; // seconds
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
export class ProductionConfigManager {
  private config: ProductionConfig | null = null;
  private validationErrors: string[] = [];

  /**
   * Load and validate configuration from environment variables
   */
  loadConfig(): ProductionConfig {
    if (this.config) {
      return this.config;
    }

    const environment = this.getEnvironment();
    this.config = {
      environment,
      security: this.loadSecurityConfig(),
      database: this.loadDatabaseConfig(),
      exchangeRates: this.loadExchangeRateConfig(),
      remittance: this.loadRemittanceConfig(),
      chains: this.loadChainConfig(),
      logging: this.loadLoggingConfig(),
    };

    this.validateConfig();
    return this.config;
  }

  /**
   * Get current environment
   */
  private getEnvironment(): 'development' | 'staging' | 'production' {
    const env = process.env.NODE_ENV || 'development';
    if (['development', 'staging', 'production'].includes(env)) {
      return env as 'development' | 'staging' | 'production';
    }
    return 'development';
  }

  /**
   * Load security configuration
   */
  private loadSecurityConfig(): SecurityConfig {
    const isProduction = this.getEnvironment() === 'production';

    return {
      jwtAccessSecret: this.getRequiredEnv('JWT_ACCESS_SECRET', isProduction),
      jwtRefreshSecret: this.getRequiredEnv('JWT_REFRESH_SECRET', isProduction),
      jwtIssuer: process.env.JWT_ISSUER || 'polkadot-sso',
      jwtAccessExpiry: parseInt(process.env.JWT_ACCESS_EXPIRY || '900'), // 15 minutes
      jwtRefreshExpiry: parseInt(process.env.JWT_REFRESH_EXPIRY || '604800'), // 7 days
      enableSignatureVerification: process.env.ENABLE_SIGNATURE_VERIFICATION !== 'false',
      enableRateLimiting: process.env.ENABLE_RATE_LIMITING !== 'false',
      enableCORS: process.env.ENABLE_CORS !== 'false',
      allowedOrigins: this.parseArrayEnv('CORS_ALLOWED_ORIGINS', ['http://localhost:3000']),
      enableHelmet: process.env.ENABLE_HELMET !== 'false',
      sessionSecret: this.getRequiredEnv('SESSION_SECRET', isProduction),
      encryptionKey: this.getRequiredEnv('ENCRYPTION_KEY', isProduction),
    };
  }

  /**
   * Load database configuration
   */
  private loadDatabaseConfig(): DatabaseConfig {
    const dbType = process.env.DATABASE_TYPE || 'sqlite';

    if (dbType === 'sqlite') {
      return {
        type: 'sqlite',
        database: process.env.DATABASE_PATH || './data/sso.db',
      };
    }

    return {
      type: dbType as 'postgresql' | 'mysql',
      host: process.env.DATABASE_HOST || 'localhost',
      port: parseInt(process.env.DATABASE_PORT || '5432'),
      database: process.env.DATABASE_NAME || 'polkadot_sso',
      username: process.env.DATABASE_USERNAME,
      password: process.env.DATABASE_PASSWORD,
      ssl: process.env.DATABASE_SSL === 'true',
      connectionString: process.env.DATABASE_URL,
    };
  }

  /**
   * Load exchange rate configuration
   */
  private loadExchangeRateConfig(): ExchangeRateConfig {
    return {
      provider: (process.env.EXCHANGE_RATE_PROVIDER as 'coingecko' | 'mock') || 'coingecko',
      apiKey: process.env.COINGECKO_API_KEY,
      baseUrl: process.env.EXCHANGE_RATE_BASE_URL,
      timeout: parseInt(process.env.EXCHANGE_RATE_TIMEOUT || '5000'),
      cacheTimeout: parseInt(process.env.EXCHANGE_RATE_CACHE_TIMEOUT || '60000'),
    };
  }

  /**
   * Load remittance configuration
   */
  private loadRemittanceConfig(): RemittanceConfig {
    return {
      enabled: process.env.REMITANCE_ENABLED === 'true',
      defaultCurrency: process.env.REMITANCE_DEFAULT_CURRENCY || 'USD',
      supportedCurrencies: this.parseArrayEnv('REMITANCE_SUPPORTED_CURRENCIES', [
        'USD',
        'ARS',
        'BRL',
      ]),
      treasuryAddress: process.env.REMITANCE_TREASURY_ADDRESS || '',
      minDeposit: parseFloat(process.env.REMITANCE_MIN_DEPOSIT || '10'),
      maxWithdrawal: parseFloat(process.env.REMITANCE_MAX_WITHDRAWAL || '10000'),
      custodyLevels: this.loadCustodyLevels(),
    };
  }

  /**
   * Load custody level configurations
   */
  private loadCustodyLevels(): CustodyLevelConfig[] {
    return [
      {
        level: 0,
        name: 'Custodial',
        description: 'SMS/Email verification only',
        dailyLimit: 100,
        monthlyLimit: 1000,
        perTransactionLimit: 50,
        requiredAuth: ['sms', 'email'],
        fees: { platform: 0.05, network: 0.01, exchange: 0.02 },
      },
      {
        level: 1,
        name: 'Light Custody',
        description: 'Phone + ID verification',
        dailyLimit: 500,
        monthlyLimit: 5000,
        perTransactionLimit: 250,
        requiredAuth: ['phone', 'id_verification'],
        fees: { platform: 0.03, network: 0.01, exchange: 0.015 },
      },
      {
        level: 2,
        name: 'Medium Custody',
        description: 'KYC + Multi-sig',
        dailyLimit: 2000,
        monthlyLimit: 20000,
        perTransactionLimit: 1000,
        requiredAuth: ['kyc', 'multisig'],
        fees: { platform: 0.02, network: 0.01, exchange: 0.01 },
      },
      {
        level: 3,
        name: 'Full Self-Custody',
        description: 'Complete self-custody',
        dailyLimit: 10000,
        monthlyLimit: 100000,
        perTransactionLimit: 5000,
        requiredAuth: ['self_custody', 'hardware_wallet'],
        fees: { platform: 0.01, network: 0.01, exchange: 0.005 },
      },
    ];
  }

  /**
   * Load chain configuration
   */
  private loadChainConfig(): ChainConfig {
    return {
      defaultChain: process.env.DEFAULT_CHAIN || 'kusama',
      rpcUrls: {
        polkadot: process.env.POLKADOT_RPC_URL || 'wss://rpc.polkadot.io',
        kusama: process.env.KUSAMA_RPC_URL || 'wss://kusama-rpc.polkadot.io',
        westend: process.env.WESTEND_RPC_URL || 'wss://westend-rpc.polkadot.io',
        rococo: process.env.ROCOCO_RPC_URL || 'wss://rococo-rpc.polkadot.io',
      },
      backupRpcUrls: {
        polkadot: this.parseArrayEnv('POLKADOT_BACKUP_RPC_URLS', []),
        kusama: this.parseArrayEnv('KUSAMA_BACKUP_RPC_URLS', []),
        westend: this.parseArrayEnv('WESTEND_BACKUP_RPC_URLS', []),
        rococo: this.parseArrayEnv('ROCOCO_BACKUP_RPC_URLS', []),
      },
      timeout: parseInt(process.env.CHAIN_TIMEOUT || '30000'),
      retries: parseInt(process.env.CHAIN_RETRIES || '3'),
    };
  }

  /**
   * Load logging configuration
   */
  private loadLoggingConfig(): LoggingConfig {
    return {
      level: (process.env.LOG_LEVEL as 'error' | 'warn' | 'info' | 'debug') || 'info',
      enableConsole: process.env.LOG_ENABLE_CONSOLE !== 'false',
      enableFile: process.env.LOG_ENABLE_FILE === 'true',
      filePath: process.env.LOG_FILE_PATH || './logs/app.log',
      maxFileSize: process.env.LOG_MAX_FILE_SIZE || '10m',
      maxFiles: parseInt(process.env.LOG_MAX_FILES || '5'),
    };
  }

  /**
   * Validate the loaded configuration
   */
  private validateConfig(): void {
    this.validationErrors = [];

    if (!this.config) {
      this.validationErrors.push('Configuration not loaded');
      return;
    }

    // Validate security config
    if (this.config.security.jwtAccessSecret.length < 32) {
      this.validationErrors.push('JWT_ACCESS_SECRET must be at least 32 characters');
    }

    if (this.config.security.jwtRefreshSecret.length < 32) {
      this.validationErrors.push('JWT_REFRESH_SECRET must be at least 32 characters');
    }

    if (this.config.security.sessionSecret.length < 32) {
      this.validationErrors.push('SESSION_SECRET must be at least 32 characters');
    }

    if (this.config.security.encryptionKey.length < 32) {
      this.validationErrors.push('ENCRYPTION_KEY must be at least 32 characters');
    }

    // Validate database config
    if (this.config.database.type !== 'sqlite' && !this.config.database.host) {
      this.validationErrors.push('DATABASE_HOST is required for non-SQLite databases');
    }

    // Validate remittance config
    if (this.config.remittance.enabled && !this.config.remittance.treasuryAddress) {
      this.validationErrors.push(
        'REMITANCE_TREASURY_ADDRESS is required when remittance is enabled'
      );
    }

    // Validate chain config
    if (!this.config.chains.rpcUrls[this.config.chains.defaultChain]) {
      this.validationErrors.push(
        `RPC URL not configured for default chain: ${this.config.chains.defaultChain}`
      );
    }

    if (this.validationErrors.length > 0) {
      throw new Error(`Configuration validation failed:\n${this.validationErrors.join('\n')}`);
    }
  }

  /**
   * Get required environment variable with validation
   */
  private getRequiredEnv(key: string, required: boolean): string {
    const value = process.env[key];

    if (!value && required) {
      throw new Error(`Required environment variable ${key} is not set`);
    }

    if (!value) {
      // Generate a secure random value for development
      const crypto = require('crypto');
      return crypto.randomBytes(32).toString('hex');
    }

    return value;
  }

  /**
   * Parse comma-separated array from environment variable
   */
  private parseArrayEnv(key: string, defaultValue: string[]): string[] {
    const value = process.env[key];
    if (!value) return defaultValue;
    return value
      .split(',')
      .map(item => item.trim())
      .filter(Boolean);
  }

  /**
   * Get validation errors
   */
  getValidationErrors(): string[] {
    return [...this.validationErrors];
  }

  /**
   * Check if configuration is valid
   */
  isValid(): boolean {
    return this.validationErrors.length === 0;
  }

  /**
   * Get configuration summary for logging
   */
  getConfigSummary(): Record<string, any> {
    if (!this.config) return {};

    return {
      environment: this.config.environment,
      security: {
        enableSignatureVerification: this.config.security.enableSignatureVerification,
        enableRateLimiting: this.config.security.enableRateLimiting,
        enableCORS: this.config.security.enableCORS,
        enableHelmet: this.config.security.enableHelmet,
      },
      database: {
        type: this.config.database.type,
        host: this.config.database.host || 'local',
      },
      exchangeRates: {
        provider: this.config.exchangeRates.provider,
        hasApiKey: !!this.config.exchangeRates.apiKey,
      },
      remittance: {
        enabled: this.config.remittance.enabled,
        defaultCurrency: this.config.remittance.defaultCurrency,
        supportedCurrencies: this.config.remittance.supportedCurrencies,
      },
      chains: {
        defaultChain: this.config.chains.defaultChain,
        configuredChains: Object.keys(this.config.chains.rpcUrls),
      },
      logging: {
        level: this.config.logging.level,
        enableConsole: this.config.logging.enableConsole,
        enableFile: this.config.logging.enableFile,
      },
    };
  }
}

/**
 * Global configuration manager instance
 */
export const configManager = new ProductionConfigManager();

/**
 * Get the current configuration
 */
export function getConfig(): ProductionConfig {
  return configManager.loadConfig();
}

/**
 * Validate configuration and throw if invalid
 */
export function validateConfig(): void {
  configManager.loadConfig();
  if (!configManager.isValid()) {
    throw new Error(
      `Configuration validation failed:\n${configManager.getValidationErrors().join('\n')}`
    );
  }
}
