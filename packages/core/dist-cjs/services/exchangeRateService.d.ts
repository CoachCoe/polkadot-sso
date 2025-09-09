export interface ExchangeRateProvider {
    getRate(fromCurrency: string, toCurrency: string): Promise<number>;
    getRates(fromCurrency: string, toCurrencies: string[]): Promise<Record<string, number>>;
}
export interface ExchangeRateConfig {
    provider: 'coingecko' | 'mock';
    apiKey?: string;
    baseUrl?: string;
    timeout?: number;
    cacheTimeout?: number;
}
/**
 * Real-time exchange rate service using CoinGecko API
 */
export declare class ExchangeRateService implements ExchangeRateProvider {
    private config;
    private cache;
    constructor(config: ExchangeRateConfig);
    /**
     * Get exchange rate between two currencies
     */
    getRate(fromCurrency: string, toCurrency: string): Promise<number>;
    /**
     * Get multiple exchange rates at once
     */
    getRates(fromCurrency: string, toCurrencies: string[]): Promise<Record<string, number>>;
    /**
     * Get rate from CoinGecko API
     */
    private getCoinGeckoRate;
    /**
     * Get CoinGecko coin ID for currency
     */
    private getCoinGeckoId;
    /**
     * Get mock rate for development/fallback
     */
    private getMockRate;
    /**
     * Clear rate cache
     */
    clearCache(): void;
    /**
     * Get cache statistics
     */
    getCacheStats(): {
        size: number;
        entries: Array<{
            key: string;
            age: number;
        }>;
    };
}
/**
 * Factory function to create exchange rate service
 */
export declare function createExchangeRateService(config: ExchangeRateConfig): ExchangeRateService;
/**
 * Default configuration for development
 */
export declare const DEFAULT_EXCHANGE_RATE_CONFIG: ExchangeRateConfig;
//# sourceMappingURL=exchangeRateService.d.ts.map