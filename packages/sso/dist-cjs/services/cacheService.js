"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheStrategies = exports.CacheService = void 0;
exports.getCacheService = getCacheService;
exports.getCacheStrategies = getCacheStrategies;
exports.shutdownCacheService = shutdownCacheService;
const redis_1 = require("redis");
const logger_js_1 = require("../utils/logger.js");
const logger = (0, logger_js_1.createLogger)('cache-service');
class CacheService {
    constructor() {
        this.client = null;
        this.isConnected = false;
        this.stats = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0,
            errors: 0,
            hitRate: 0,
        };
        this.initializeClient();
    }
    async initializeClient() {
        try {
            if (!process.env.REDIS_URL) {
                logger.warn('REDIS_URL not configured - caching disabled');
                return;
            }
            this.client = (0, redis_1.createClient)({
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
        }
        catch (error) {
            logger.error('Failed to initialize Redis client', {
                error: error instanceof Error ? error.message : String(error),
            });
            this.isConnected = false;
        }
    }
    getKey(key, prefix) {
        const keyPrefix = prefix || 'sso';
        return `${keyPrefix}:${key}`;
    }
    serialize(value) {
        try {
            return JSON.stringify(value);
        }
        catch (error) {
            logger.error('Failed to serialize cache value', {
                error: error instanceof Error ? error.message : String(error),
            });
            throw new Error('Failed to serialize cache value');
        }
    }
    deserialize(value) {
        try {
            return JSON.parse(value);
        }
        catch (error) {
            logger.error('Failed to deserialize cache value', {
                error: error instanceof Error ? error.message : String(error),
            });
            throw new Error('Failed to deserialize cache value');
        }
    }
    async get(key, options = {}) {
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
            return this.deserialize(value);
        }
        catch (error) {
            logger.error('Cache get error', {
                key,
                error: error instanceof Error ? error.message : String(error),
            });
            this.stats.errors++;
            return null;
        }
    }
    async set(key, value, options = {}) {
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
        }
        catch (error) {
            logger.error('Cache set error', {
                key,
                error: error instanceof Error ? error.message : String(error),
            });
            this.stats.errors++;
            return false;
        }
    }
    async delete(key, options = {}) {
        if (!this.client || !this.isConnected) {
            return false;
        }
        try {
            const fullKey = this.getKey(key, options.prefix);
            const result = await this.client.del(fullKey);
            this.stats.deletes++;
            return result > 0;
        }
        catch (error) {
            logger.error('Cache delete error', {
                key,
                error: error instanceof Error ? error.message : String(error),
            });
            this.stats.errors++;
            return false;
        }
    }
    async exists(key, options = {}) {
        if (!this.client || !this.isConnected) {
            return false;
        }
        try {
            const fullKey = this.getKey(key, options.prefix);
            const result = await this.client.exists(fullKey);
            return result > 0;
        }
        catch (error) {
            logger.error('Cache exists error', {
                key,
                error: error instanceof Error ? error.message : String(error),
            });
            return false;
        }
    }
    async expire(key, ttl, options = {}) {
        if (!this.client || !this.isConnected) {
            return false;
        }
        try {
            const fullKey = this.getKey(key, options.prefix);
            const result = await this.client.expire(fullKey, ttl);
            return result;
        }
        catch (error) {
            logger.error('Cache expire error', {
                key,
                error: error instanceof Error ? error.message : String(error),
            });
            return false;
        }
    }
    async ttl(key, options = {}) {
        if (!this.client || !this.isConnected) {
            return -2; // Key doesn't exist
        }
        try {
            const fullKey = this.getKey(key, options.prefix);
            return await this.client.ttl(fullKey);
        }
        catch (error) {
            logger.error('Cache TTL error', {
                key,
                error: error instanceof Error ? error.message : String(error),
            });
            return -2;
        }
    }
    async increment(key, amount = 1, options = {}) {
        if (!this.client || !this.isConnected) {
            return null;
        }
        try {
            const fullKey = this.getKey(key, options.prefix);
            return await this.client.incrBy(fullKey, amount);
        }
        catch (error) {
            logger.error('Cache increment error', {
                key,
                error: error instanceof Error ? error.message : String(error),
            });
            return null;
        }
    }
    async decrement(key, amount = 1, options = {}) {
        if (!this.client || !this.isConnected) {
            return null;
        }
        try {
            const fullKey = this.getKey(key, options.prefix);
            return await this.client.decrBy(fullKey, amount);
        }
        catch (error) {
            logger.error('Cache decrement error', {
                key,
                error: error instanceof Error ? error.message : String(error),
            });
            return null;
        }
    }
    async clearPattern(pattern, options = {}) {
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
        }
        catch (error) {
            logger.error('Cache clear pattern error', {
                pattern,
                error: error instanceof Error ? error.message : String(error),
            });
            return 0;
        }
    }
    async clearAll() {
        if (!this.client || !this.isConnected) {
            return false;
        }
        try {
            await this.client.flushDb();
            this.stats.deletes++;
            return true;
        }
        catch (error) {
            logger.error('Cache clear all error', {
                error: error instanceof Error ? error.message : String(error),
            });
            return false;
        }
    }
    async getStats() {
        return { ...this.stats };
    }
    updateHitRate() {
        const total = this.stats.hits + this.stats.misses;
        this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
    }
    async healthCheck() {
        if (!this.client || !this.isConnected) {
            return false;
        }
        try {
            await this.client.ping();
            return true;
        }
        catch (error) {
            logger.error('Cache health check failed', {
                error: error instanceof Error ? error.message : String(error),
            });
            return false;
        }
    }
    async shutdown() {
        if (this.client) {
            try {
                await this.client.quit();
                logger.info('Cache service shutdown complete');
            }
            catch (error) {
                logger.error('Cache service shutdown error', {
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }
    }
}
exports.CacheService = CacheService;
// Cache strategies for different use cases
class CacheStrategies {
    constructor(cache) {
        this.cache = cache;
    }
    // User profile cache - longer TTL for user data
    async getUserProfile(address) {
        return this.cache.get(`user:profile:${address}`, { ttl: 3600, prefix: 'user' }); // 1 hour
    }
    async setUserProfile(address, profile) {
        return this.cache.set(`user:profile:${address}`, profile, { ttl: 3600, prefix: 'user' });
    }
    // Session cache - shorter TTL for session data
    async getSession(sessionId) {
        return this.cache.get(`session:${sessionId}`, { ttl: 900, prefix: 'session' }); // 15 minutes
    }
    async setSession(sessionId, session) {
        return this.cache.set(`session:${sessionId}`, session, { ttl: 900, prefix: 'session' });
    }
    // Challenge cache - very short TTL for security
    async getChallenge(challengeId) {
        return this.cache.get(`challenge:${challengeId}`, { ttl: 300, prefix: 'challenge' }); // 5 minutes
    }
    async setChallenge(challengeId, challenge) {
        return this.cache.set(`challenge:${challengeId}`, challenge, {
            ttl: 300,
            prefix: 'challenge',
        });
    }
    // Client cache - longer TTL for client configuration
    async getClient(clientId) {
        return this.cache.get(`client:${clientId}`, { ttl: 7200, prefix: 'client' }); // 2 hours
    }
    async setClient(clientId, client) {
        return this.cache.set(`client:${clientId}`, client, { ttl: 7200, prefix: 'client' });
    }
    // Rate limiting cache - very short TTL
    async getRateLimit(key) {
        return this.cache.get(`ratelimit:${key}`, { ttl: 60, prefix: 'ratelimit' }); // 1 minute
    }
    async setRateLimit(key, count) {
        return this.cache.set(`ratelimit:${key}`, count, { ttl: 60, prefix: 'ratelimit' });
    }
    async incrementRateLimit(key) {
        return this.cache.increment(`ratelimit:${key}`, 1, { prefix: 'ratelimit' });
    }
    // Clear all user-related cache
    async clearUserCache(address) {
        return this.cache.clearPattern(`user:*:${address}`, { prefix: 'user' });
    }
    // Clear all session cache
    async clearSessionCache() {
        return this.cache.clearPattern('*', { prefix: 'session' });
    }
    // Clear all challenge cache
    async clearChallengeCache() {
        return this.cache.clearPattern('*', { prefix: 'challenge' });
    }
}
exports.CacheStrategies = CacheStrategies;
// Global cache service instance
let cacheService = null;
let cacheStrategies = null;
function getCacheService() {
    if (!cacheService) {
        cacheService = new CacheService();
    }
    return cacheService;
}
function getCacheStrategies() {
    if (!cacheStrategies) {
        cacheStrategies = new CacheStrategies(getCacheService());
    }
    return cacheStrategies;
}
async function shutdownCacheService() {
    if (cacheService) {
        await cacheService.shutdown();
        cacheService = null;
        cacheStrategies = null;
    }
}
//# sourceMappingURL=cacheService.js.map