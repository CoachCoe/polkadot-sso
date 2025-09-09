import { ProductionConfig } from '@polkadot-auth/core';

/**
 * SSO Server specific configuration
 */
export interface SSOConfig extends ProductionConfig {
  server: ServerConfig;
  features: FeatureConfig;
}

export interface ServerConfig {
  port: number;
  host: string;
  enableSwagger: boolean;
  enableMetrics: boolean;
  metricsPort?: number;
  enableHealthCheck: boolean;
  healthCheckPath: string;
  enableGracefulShutdown: boolean;
  shutdownTimeout: number;
}

export interface FeatureConfig {
  enableQRCodeAuth: boolean;
  enableRemittance: boolean;
  enableCredentialStorage: boolean;
  enableKusamaIntegration: boolean;
  enablePapiIntegration: boolean;
  enableAuditLogging: boolean;
  enableRateLimiting: boolean;
  enableBruteForceProtection: boolean;
}

/**
 * SSO Server configuration manager
 */
export class SSOConfigManager {
  private config: SSOConfig | null = null;

  /**
   * Load SSO server configuration
   */
  loadConfig(): SSOConfig {
    if (this.config) {
      return this.config;
    }

    // Load base configuration from core
    const baseConfig = this.loadBaseConfig();

    this.config = {
      ...baseConfig,
      server: this.loadServerConfig(),
      features: this.loadFeatureConfig(),
    };

    this.validateSSOConfig();
    return this.config;
  }

  /**
   * Load base configuration from core package
   */
  private loadBaseConfig(): ProductionConfig {
    // Import and use the core configuration manager
    const { configManager } = require('@polkadot-auth/core');
    return configManager.loadConfig();
  }

  /**
   * Load server-specific configuration
   */
  private loadServerConfig(): ServerConfig {
    return {
      port: parseInt(process.env.PORT || '3001'),
      host: process.env.HOST || '0.0.0.0',
      enableSwagger: process.env.ENABLE_SWAGGER !== 'false',
      enableMetrics: process.env.ENABLE_METRICS === 'true',
      metricsPort: process.env.METRICS_PORT ? parseInt(process.env.METRICS_PORT) : undefined,
      enableHealthCheck: process.env.ENABLE_HEALTH_CHECK !== 'false',
      healthCheckPath: process.env.HEALTH_CHECK_PATH || '/health',
      enableGracefulShutdown: process.env.ENABLE_GRACEFUL_SHUTDOWN !== 'false',
      shutdownTimeout: parseInt(process.env.SHUTDOWN_TIMEOUT || '10000'),
    };
  }

  /**
   * Load feature configuration
   */
  private loadFeatureConfig(): FeatureConfig {
    return {
      enableQRCodeAuth: process.env.ENABLE_QR_CODE_AUTH !== 'false',
      enableRemittance: process.env.ENABLE_REMITANCE === 'true',
      enableCredentialStorage: process.env.ENABLE_CREDENTIAL_STORAGE !== 'false',
      enableKusamaIntegration: process.env.ENABLE_KUSAMA_INTEGRATION !== 'false',
      enablePapiIntegration: process.env.ENABLE_PAPI_INTEGRATION === 'true',
      enableAuditLogging: process.env.ENABLE_AUDIT_LOGGING !== 'false',
      enableRateLimiting: process.env.ENABLE_RATE_LIMITING !== 'false',
      enableBruteForceProtection: process.env.ENABLE_BRUTE_FORCE_PROTECTION !== 'false',
    };
  }

  /**
   * Validate SSO-specific configuration
   */
  private validateSSOConfig(): void {
    if (!this.config) {
      throw new Error('Configuration not loaded');
    }

    const errors: string[] = [];

    // Validate server config
    if (this.config.server.port < 1 || this.config.server.port > 65535) {
      errors.push('PORT must be between 1 and 65535');
    }

    if (this.config.server.enableMetrics && !this.config.server.metricsPort) {
      errors.push('METRICS_PORT is required when ENABLE_METRICS is true');
    }

    if (
      this.config.server.metricsPort &&
      (this.config.server.metricsPort < 1 || this.config.server.metricsPort > 65535)
    ) {
      errors.push('METRICS_PORT must be between 1 and 65535');
    }

    if (this.config.server.metricsPort === this.config.server.port) {
      errors.push('METRICS_PORT must be different from PORT');
    }

    // Validate feature dependencies
    if (this.config.features.enableRemittance && !(this.config as any).remittance?.enabled) {
      errors.push('Remittance feature is enabled but remittance is disabled in core config');
    }

    if (this.config.features.enableQRCodeAuth && !this.config.features.enableKusamaIntegration) {
      console.warn('⚠️  QR Code authentication is enabled but Kusama integration is disabled');
    }

    if (errors.length > 0) {
      throw new Error(`SSO Configuration validation failed:\n${errors.join('\n')}`);
    }
  }

  /**
   * Get configuration summary for startup logging
   */
  getConfigSummary(): Record<string, any> {
    if (!this.config) return {};

    return {
      environment: (this.config as any).environment,
      server: {
        port: this.config.server.port,
        host: this.config.server.host,
        enableSwagger: this.config.server.enableSwagger,
        enableMetrics: this.config.server.enableMetrics,
        enableHealthCheck: this.config.server.enableHealthCheck,
      },
      features: {
        enableQRCodeAuth: this.config.features.enableQRCodeAuth,
        enableRemittance: this.config.features.enableRemittance,
        enableCredentialStorage: this.config.features.enableCredentialStorage,
        enableKusamaIntegration: this.config.features.enableKusamaIntegration,
        enablePapiIntegration: this.config.features.enablePapiIntegration,
        enableAuditLogging: this.config.features.enableAuditLogging,
        enableRateLimiting: this.config.features.enableRateLimiting,
        enableBruteForceProtection: this.config.features.enableBruteForceProtection,
      },
      security: {
        enableSignatureVerification: (this.config as any).security?.enableSignatureVerification,
        enableRateLimiting: (this.config as any).security?.enableRateLimiting,
        enableCORS: (this.config as any).security?.enableCORS,
        enableHelmet: (this.config as any).security?.enableHelmet,
      },
      database: {
        type: (this.config as any).database?.type,
        host: (this.config as any).database?.host || 'local',
      },
      remittance: {
        enabled: (this.config as any).remittance?.enabled,
        defaultCurrency: (this.config as any).remittance?.defaultCurrency,
        supportedCurrencies: (this.config as any).remittance?.supportedCurrencies,
      },
      chains: {
        defaultChain: (this.config as any).chains?.defaultChain,
        configuredChains: Object.keys((this.config as any).chains?.rpcUrls || {}),
      },
    };
  }

  /**
   * Check if a feature is enabled
   */
  isFeatureEnabled(feature: keyof FeatureConfig): boolean {
    if (!this.config) {
      this.loadConfig();
    }
    return this.config!.features[feature];
  }

  /**
   * Get server configuration
   */
  getServerConfig(): ServerConfig {
    if (!this.config) {
      this.loadConfig();
    }
    return this.config!.server;
  }

  /**
   * Get feature configuration
   */
  getFeatureConfig(): FeatureConfig {
    if (!this.config) {
      this.loadConfig();
    }
    return this.config!.features;
  }
}

/**
 * Global SSO configuration manager instance
 */
export const ssoConfigManager = new SSOConfigManager();

/**
 * Get the current SSO configuration
 */
export function getSSOConfig(): SSOConfig {
  return ssoConfigManager.loadConfig();
}

/**
 * Validate SSO configuration and throw if invalid
 */
export function validateSSOConfig(): void {
  ssoConfigManager.loadConfig();
}

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(feature: keyof FeatureConfig): boolean {
  return ssoConfigManager.isFeatureEnabled(feature);
}
