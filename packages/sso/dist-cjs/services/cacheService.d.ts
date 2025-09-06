export interface CacheOptions {
    ttl?: number;
    prefix?: string;
    compress?: boolean;
}
export interface CacheStats {
    hits: number;
    misses: number;
    sets: number;
    deletes: number;
    errors: number;
    hitRate: number;
}
export declare class CacheService {
    private client;
    private isConnected;
    private stats;
    constructor();
    private initializeClient;
    private getKey;
    private serialize;
    private deserialize;
    get<T>(key: string, options?: CacheOptions): Promise<T | null>;
    set<T>(key: string, value: T, options?: CacheOptions): Promise<boolean>;
    delete(key: string, options?: CacheOptions): Promise<boolean>;
    exists(key: string, options?: CacheOptions): Promise<boolean>;
    expire(key: string, ttl: number, options?: CacheOptions): Promise<boolean>;
    ttl(key: string, options?: CacheOptions): Promise<number>;
    increment(key: string, amount?: number, options?: CacheOptions): Promise<number | null>;
    decrement(key: string, amount?: number, options?: CacheOptions): Promise<number | null>;
    clearPattern(pattern: string, options?: CacheOptions): Promise<number>;
    clearAll(): Promise<boolean>;
    getStats(): Promise<CacheStats>;
    private updateHitRate;
    healthCheck(): Promise<boolean>;
    shutdown(): Promise<void>;
}
export declare class CacheStrategies {
    private cache;
    constructor(cache: CacheService);
    getUserProfile<T>(address: string): Promise<T | null>;
    setUserProfile<T>(address: string, profile: T): Promise<boolean>;
    getSession<T>(sessionId: string): Promise<T | null>;
    setSession<T>(sessionId: string, session: T): Promise<boolean>;
    getChallenge<T>(challengeId: string): Promise<T | null>;
    setChallenge<T>(challengeId: string, challenge: T): Promise<boolean>;
    getClient<T>(clientId: string): Promise<T | null>;
    setClient<T>(clientId: string, client: T): Promise<boolean>;
    getRateLimit(key: string): Promise<number | null>;
    setRateLimit(key: string, count: number): Promise<boolean>;
    incrementRateLimit(key: string): Promise<number | null>;
    clearUserCache(address: string): Promise<number>;
    clearSessionCache(): Promise<number>;
    clearChallengeCache(): Promise<number>;
}
export declare function getCacheService(): CacheService;
export declare function getCacheStrategies(): CacheStrategies;
export declare function shutdownCacheService(): Promise<void>;
//# sourceMappingURL=cacheService.d.ts.map