import { Database } from 'sqlite3';
export interface QueryResult<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    executionTime?: number;
}
export interface QueryOptions {
    timeout?: number;
    maxRetries?: number;
    validateParams?: boolean;
    logQuery?: boolean;
}
/**
 * SQL Injection Protection Utility
 */
export declare class QueryProtection {
    private static instance;
    private db;
    private queryStats;
    private constructor();
    static getInstance(database: Database): QueryProtection;
    /**
     * Validate SQL query for injection patterns
     */
    private validateQuery;
    /**
     * Sanitize parameter values
     */
    private sanitizeParams;
    /**
     * Generate query fingerprint for logging
     */
    private generateQueryFingerprint;
    /**
     * Execute safe parameterized query
     */
    safeQuery<T = any>(query: string, params?: any[], options?: QueryOptions): Promise<QueryResult<T>>;
    /**
     * Execute query with timeout
     */
    private executeWithTimeout;
    /**
     * Update query execution statistics
     */
    private updateQueryStats;
    /**
     * Get query statistics
     */
    getQueryStats(): Map<string, {
        count: number;
        avgTime: number;
    }>;
    /**
     * Prepare safe SELECT query with validation
     */
    safeSelect<T = any>(table: string, columns?: string[], where?: Record<string, any>, options?: QueryOptions & {
        limit?: number;
        offset?: number;
    }): Promise<QueryResult<T>>;
    /**
     * Prepare safe INSERT query
     */
    safeInsert(table: string, data: Record<string, any>, options?: QueryOptions): Promise<QueryResult<{
        lastID: number;
        changes: number;
    }>>;
    /**
     * Prepare safe UPDATE query
     */
    safeUpdate(table: string, data: Record<string, any>, where: Record<string, any>, options?: QueryOptions): Promise<QueryResult<{
        changes: number;
    }>>;
}
/**
 * Query protection middleware for Express
 */
export declare const createQueryProtectionMiddleware: (database: Database) => (req: any, res: any, next: any) => void;
//# sourceMappingURL=queryProtection.d.ts.map