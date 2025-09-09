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
export declare class SSOConfigManager {
    private config;
    /**
     * Load SSO server configuration
     */
    loadConfig(): SSOConfig;
    /**
     * Load base configuration from core package
     */
    private loadBaseConfig;
    /**
     * Load server-specific configuration
     */
    private loadServerConfig;
    /**
     * Load feature configuration
     */
    private loadFeatureConfig;
    /**
     * Validate SSO-specific configuration
     */
    private validateSSOConfig;
    /**
     * Get configuration summary for startup logging
     */
    getConfigSummary(): Record<string, any>;
    /**
     * Check if a feature is enabled
     */
    isFeatureEnabled(feature: keyof FeatureConfig): boolean;
    /**
     * Get server configuration
     */
    getServerConfig(): ServerConfig;
    /**
     * Get feature configuration
     */
    getFeatureConfig(): FeatureConfig;
}
/**
 * Global SSO configuration manager instance
 */
export declare const ssoConfigManager: SSOConfigManager;
/**
 * Get the current SSO configuration
 */
export declare function getSSOConfig(): SSOConfig;
/**
 * Validate SSO configuration and throw if invalid
 */
export declare function validateSSOConfig(): void;
/**
 * Check if a feature is enabled
 */
export declare function isFeatureEnabled(feature: keyof FeatureConfig): boolean;
//# sourceMappingURL=productionConfig.d.ts.map