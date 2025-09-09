export interface ExchangeRateProvider {
  getRate(fromCurrency: string, toCurrency: string): Promise<number>;
  getRates(fromCurrency: string, toCurrencies: string[]): Promise<Record<string, number>>;
}

export interface ExchangeRateConfig {
  provider: 'coingecko' | 'mock';
  apiKey?: string;
  baseUrl?: string;
  timeout?: number;
  cacheTimeout?: number; // in milliseconds
}

/**
 * Real-time exchange rate service using CoinGecko API
 */
export class ExchangeRateService implements ExchangeRateProvider {
  private config: ExchangeRateConfig;
  private cache: Map<string, { rate: number; timestamp: number }> = new Map();

  constructor(config: ExchangeRateConfig) {
    this.config = {
      timeout: 5000,
      cacheTimeout: 60000, // 1 minute cache
      ...config,
    };
  }

  /**
   * Get exchange rate between two currencies
   */
  async getRate(fromCurrency: string, toCurrency: string): Promise<number> {
    const cacheKey = `${fromCurrency}-${toCurrency}`;
    const cached = this.cache.get(cacheKey);

    // Return cached rate if still valid
    if (cached && Date.now() - cached.timestamp < this.config.cacheTimeout!) {
      return cached.rate;
    }

    try {
      let rate: number;

      if (this.config.provider === 'coingecko') {
        rate = await this.getCoinGeckoRate(fromCurrency, toCurrency);
      } else {
        rate = this.getMockRate(fromCurrency, toCurrency);
      }

      // Cache the rate
      this.cache.set(cacheKey, {
        rate,
        timestamp: Date.now(),
      });

      return rate;
    } catch (error) {
      console.error('Exchange rate fetch failed:', error);

      // Return cached rate if available, otherwise fallback to mock
      if (cached) {
        console.warn('Using cached exchange rate due to API error');
        return cached.rate;
      }

      return this.getMockRate(fromCurrency, toCurrency);
    }
  }

  /**
   * Get multiple exchange rates at once
   */
  async getRates(fromCurrency: string, toCurrencies: string[]): Promise<Record<string, number>> {
    const rates: Record<string, number> = {};

    // Fetch all rates in parallel
    const ratePromises = toCurrencies.map(async toCurrency => {
      const rate = await this.getRate(fromCurrency, toCurrency);
      return { toCurrency, rate };
    });

    const results = await Promise.allSettled(ratePromises);

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        rates[result.value.toCurrency] = result.value.rate;
      } else {
        console.error(`Failed to fetch rate for ${toCurrencies[index]}:`, result.reason);
        rates[toCurrencies[index]] = this.getMockRate(fromCurrency, toCurrencies[index]);
      }
    });

    return rates;
  }

  /**
   * Get rate from CoinGecko API
   */
  private async getCoinGeckoRate(fromCurrency: string, toCurrency: string): Promise<number> {
    const baseUrl = this.config.baseUrl || 'https://api.coingecko.com/api/v3';
    const url = `${baseUrl}/simple/price?ids=${this.getCoinGeckoId(fromCurrency)}&vs_currencies=${toCurrency.toLowerCase()}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          ...(this.config.apiKey && { 'X-CG-API-KEY': this.config.apiKey }),
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const coinId = this.getCoinGeckoId(fromCurrency);
      const rate = data[coinId]?.[toCurrency.toLowerCase()];

      if (typeof rate !== 'number') {
        throw new Error(`Invalid rate data from CoinGecko: ${JSON.stringify(data)}`);
      }

      return rate;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Get CoinGecko coin ID for currency
   */
  private getCoinGeckoId(currency: string): string {
    const mapping: Record<string, string> = {
      USD: 'usd',
      ARS: 'usd', // Use USD as base for ARS conversion
      BRL: 'usd', // Use USD as base for BRL conversion
      USDC: 'usd-coin',
      USDT: 'tether',
    };

    return mapping[currency.toUpperCase()] || currency.toLowerCase();
  }

  /**
   * Get mock rate for development/fallback
   */
  private getMockRate(fromCurrency: string, toCurrency: string): number {
    const mockRates: Record<string, Record<string, number>> = {
      USD: {
        ARS: 850.0,
        BRL: 5.2,
        USD: 1.0,
        USDC: 1.0,
        USDT: 1.0,
      },
      USDC: {
        ARS: 850.0,
        BRL: 5.2,
        USD: 1.0,
        USDC: 1.0,
        USDT: 1.0,
      },
      USDT: {
        ARS: 850.0,
        BRL: 5.2,
        USD: 1.0,
        USDC: 1.0,
        USDT: 1.0,
      },
    };

    const from = fromCurrency.toUpperCase();
    const to = toCurrency.toUpperCase();

    if (from === to) return 1.0;

    // Direct rate
    if (mockRates[from]?.[to]) {
      return mockRates[from][to];
    }

    // Reverse rate
    if (mockRates[to]?.[from]) {
      return 1 / mockRates[to][from];
    }

    // Default fallback
    console.warn(`No mock rate available for ${from} -> ${to}, using 1.0`);
    return 1.0;
  }

  /**
   * Clear rate cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; entries: Array<{ key: string; age: number }> } {
    const now = Date.now();
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.entries()).map(([key, value]) => ({
        key,
        age: now - value.timestamp,
      })),
    };
  }
}

/**
 * Factory function to create exchange rate service
 */
export function createExchangeRateService(config: ExchangeRateConfig): ExchangeRateService {
  return new ExchangeRateService(config);
}

/**
 * Default configuration for development
 */
export const DEFAULT_EXCHANGE_RATE_CONFIG: ExchangeRateConfig = {
  provider: 'coingecko',
  timeout: 5000,
  cacheTimeout: 60000,
};
