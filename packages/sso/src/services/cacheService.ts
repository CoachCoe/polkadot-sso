import { createClient, RedisClientType } from 'redis';
import { createLogger } from '../utils/logger';

const logger = createLogger('cache-service');

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string; // Key prefix for namespacing
  compress?: boolean; // Whether to compress large values
}

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  errors: number;
  hitRate: number;
}

export class CacheService {
  private client: RedisClientType | null = null;
  private isConnected = false;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    errors: 0,
    hitRate: 0,
  };

  constructor() {
    this.initializeClient();
  }

  private async initializeClient(): Promise<void> {
    try {
      if (!process.env.REDIS_URL) {
        logger.warn('REDIS_URL not configured - caching disabled');
        return;
      }

      this.client = createClient({
        url: process.env.REDIS_URL,
        socket: {
          connectTimeout: 10000,
        },
        pingInterval: 30000,
      });

      this.client.on('error', error => {
        logger.error('Redis client error', {
          error: error instanceof Error ? error.message : String(error),
        });
        this.isConnected = false;
        this.stats.errors++;
      });

      this.client.on('connect', () => {
        logger.info('Redis client connected');
        this.isConnected = true;
      });

      this.client.on('ready', () => {
        logger.info('Redis client ready');
        this.isConnected = true;
      });

      this.client.on('end', () => {
        logger.info('Redis client disconnected');
        this.isConnected = false;
      });

      await this.client.connect();
    } catch (error) {
      logger.error('Failed to initialize Redis client', {
        error: error instanceof Error ? error.message : String(error),
      });
      this.isConnected = false;
    }
  }

  private getKey(key: string, prefix?: string): string {
    const keyPrefix = prefix || 'sso';
    return `${keyPrefix}:${key}`;
  }

  private serialize(value: any): string {
    try {
      return JSON.stringify(value);
    } catch (error) {
      logger.error('Failed to serialize cache value', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error('Failed to serialize cache value');
    }
  }

  private deserialize<T>(value: string): T {
    try {
      return JSON.parse(value) as T;
    } catch (error) {
      logger.error('Failed to deserialize cache value', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error('Failed to deserialize cache value');
    }
  }

  async get<T>(key: string, options: CacheOptions = {}): Promise<T | null> {
    if (!this.client || !this.isConnected) {
      this.stats.misses++;
      return null;
    }

    try {
      const fullKey = this.getKey(key, options.prefix);
      const value = await this.client.get(fullKey);

      if (value === null) {
        this.stats.misses++;
        return null;
      }

      this.stats.hits++;
      this.updateHitRate();
      return this.deserialize<T>(value);
    } catch (error) {
      logger.error('Cache get error', {
        key,
        error: error instanceof Error ? error.message : String(error),
      });
      this.stats.errors++;
      return null;
    }
  }

  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<boolean> {
    if (!this.client || !this.isConnected) {
      return false;
    }

    try {
      const fullKey = this.getKey(key, options.prefix);
      const serializedValue = this.serialize(value);
      const ttl = options.ttl || 3600; // Default 1 hour

      await this.client.setEx(fullKey, ttl, serializedValue);
      this.stats.sets++;
      return true;
    } catch (error) {
      logger.error('Cache set error', {
        key,
        error: error instanceof Error ? error.message : String(error),
      });
      this.stats.errors++;
      return false;
    }
  }

  async delete(key: string, options: CacheOptions = {}): Promise<boolean> {
    if (!this.client || !this.isConnected) {
      return false;
    }

    try {
      const fullKey = this.getKey(key, options.prefix);
      const result = await this.client.del(fullKey);
      this.stats.deletes++;
      return result > 0;
    } catch (error) {
      logger.error('Cache delete error', {
        key,
        error: error instanceof Error ? error.message : String(error),
      });
      this.stats.errors++;
      return false;
    }
  }

  async exists(key: string, options: CacheOptions = {}): Promise<boolean> {
    if (!this.client || !this.isConnected) {
      return false;
    }

    try {
      const fullKey = this.getKey(key, options.prefix);
      const result = await this.client.exists(fullKey);
      return result > 0;
    } catch (error) {
      logger.error('Cache exists error', {
        key,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  async expire(key: string, ttl: number, options: CacheOptions = {}): Promise<boolean> {
    if (!this.client || !this.isConnected) {
      return false;
    }

    try {
      const fullKey = this.getKey(key, options.prefix);
      const result = await this.client.expire(fullKey, ttl);
      return result;
    } catch (error) {
      logger.error('Cache expire error', {
        key,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  async ttl(key: string, options: CacheOptions = {}): Promise<number> {
    if (!this.client || !this.isConnected) {
      return -2; // Key doesn't exist
    }

    try {
      const fullKey = this.getKey(key, options.prefix);
      return await this.client.ttl(fullKey);
    } catch (error) {
      logger.error('Cache TTL error', {
        key,
        error: error instanceof Error ? error.message : String(error),
      });
      return -2;
    }
  }

  async increment(
    key: string,
    amount: number = 1,
    options: CacheOptions = {}
  ): Promise<number | null> {
    if (!this.client || !this.isConnected) {
      return null;
    }

    try {
      const fullKey = this.getKey(key, options.prefix);
      return await this.client.incrBy(fullKey, amount);
    } catch (error) {
      logger.error('Cache increment error', {
        key,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  async decrement(
    key: string,
    amount: number = 1,
    options: CacheOptions = {}
  ): Promise<number | null> {
    if (!this.client || !this.isConnected) {
      return null;
    }

    try {
      const fullKey = this.getKey(key, options.prefix);
      return await this.client.decrBy(fullKey, amount);
    } catch (error) {
      logger.error('Cache decrement error', {
        key,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  async clearPattern(pattern: string, options: CacheOptions = {}): Promise<number> {
    if (!this.client || !this.isConnected) {
      return 0;
    }

    try {
      const fullPattern = this.getKey(pattern, options.prefix);
      const keys = await this.client.keys(fullPattern);

      if (keys.length === 0) {
        return 0;
      }

      const result = await this.client.del(keys);
      this.stats.deletes += result;
      return result;
    } catch (error) {
      logger.error('Cache clear pattern error', {
        pattern,
        error: error instanceof Error ? error.message : String(error),
      });
      return 0;
    }
  }

  async clearAll(): Promise<boolean> {
    if (!this.client || !this.isConnected) {
      return false;
    }

    try {
      await this.client.flushDb();
      this.stats.deletes++;
      return true;
    } catch (error) {
      logger.error('Cache clear all error', {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  async getStats(): Promise<CacheStats> {
    return { ...this.stats };
  }

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
  }

  async healthCheck(): Promise<boolean> {
    if (!this.client || !this.isConnected) {
      return false;
    }

    try {
      await this.client.ping();
      return true;
    } catch (error) {
      logger.error('Cache health check failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  async shutdown(): Promise<void> {
    if (this.client) {
      try {
        await this.client.quit();
        logger.info('Cache service shutdown complete');
      } catch (error) {
        logger.error('Cache service shutdown error', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }
}

// Cache strategies for different use cases
export class CacheStrategies {
  constructor(private cache: CacheService) {}

  // User profile cache - longer TTL for user data
  async getUserProfile<T>(address: string): Promise<T | null> {
    return this.cache.get<T>(`user:profile:${address}`, { ttl: 3600, prefix: 'user' }); // 1 hour
  }

  async setUserProfile<T>(address: string, profile: T): Promise<boolean> {
    return this.cache.set<T>(`user:profile:${address}`, profile, { ttl: 3600, prefix: 'user' });
  }

  // Session cache - shorter TTL for session data
  async getSession<T>(sessionId: string): Promise<T | null> {
    return this.cache.get<T>(`session:${sessionId}`, { ttl: 900, prefix: 'session' }); // 15 minutes
  }

  async setSession<T>(sessionId: string, session: T): Promise<boolean> {
    return this.cache.set<T>(`session:${sessionId}`, session, { ttl: 900, prefix: 'session' });
  }

  // Challenge cache - very short TTL for security
  async getChallenge<T>(challengeId: string): Promise<T | null> {
    return this.cache.get<T>(`challenge:${challengeId}`, { ttl: 300, prefix: 'challenge' }); // 5 minutes
  }

  async setChallenge<T>(challengeId: string, challenge: T): Promise<boolean> {
    return this.cache.set<T>(`challenge:${challengeId}`, challenge, {
      ttl: 300,
      prefix: 'challenge',
    });
  }

  // Client cache - longer TTL for client configuration
  async getClient<T>(clientId: string): Promise<T | null> {
    return this.cache.get<T>(`client:${clientId}`, { ttl: 7200, prefix: 'client' }); // 2 hours
  }

  async setClient<T>(clientId: string, client: T): Promise<boolean> {
    return this.cache.set<T>(`client:${clientId}`, client, { ttl: 7200, prefix: 'client' });
  }

  // Rate limiting cache - very short TTL
  async getRateLimit(key: string): Promise<number | null> {
    return this.cache.get<number>(`ratelimit:${key}`, { ttl: 60, prefix: 'ratelimit' }); // 1 minute
  }

  async setRateLimit(key: string, count: number): Promise<boolean> {
    return this.cache.set<number>(`ratelimit:${key}`, count, { ttl: 60, prefix: 'ratelimit' });
  }

  async incrementRateLimit(key: string): Promise<number | null> {
    return this.cache.increment(`ratelimit:${key}`, 1, { prefix: 'ratelimit' });
  }

  // Clear all user-related cache
  async clearUserCache(address: string): Promise<number> {
    return this.cache.clearPattern(`user:*:${address}`, { prefix: 'user' });
  }

  // Clear all session cache
  async clearSessionCache(): Promise<number> {
    return this.cache.clearPattern('*', { prefix: 'session' });
  }

  // Clear all challenge cache
  async clearChallengeCache(): Promise<number> {
    return this.cache.clearPattern('*', { prefix: 'challenge' });
  }
}

// Global cache service instance
let cacheService: CacheService | null = null;
let cacheStrategies: CacheStrategies | null = null;

export function getCacheService(): CacheService {
  if (!cacheService) {
    cacheService = new CacheService();
  }
  return cacheService;
}

export function getCacheStrategies(): CacheStrategies {
  if (!cacheStrategies) {
    cacheStrategies = new CacheStrategies(getCacheService());
  }
  return cacheStrategies;
}

export async function shutdownCacheService(): Promise<void> {
  if (cacheService) {
    await cacheService.shutdown();
    cacheService = null;
    cacheStrategies = null;
  }
}
