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
export declare class QueryProtection {
    private static instance;
    private db;
    private queryStats;
    private constructor();
    static getInstance(database: Database): QueryProtection;
    private validateQuery;
    private sanitizeParams;
    private generateQueryFingerprint;
    safeQuery<T = any>(query: string, params?: any[], options?: QueryOptions): Promise<QueryResult<T>>;
    private executeWithTimeout;
    private updateQueryStats;
    getQueryStats(): Map<string, {
        count: number;
        avgTime: number;
    }>;
    safeSelect<T = any>(table: string, columns?: string[], where?: Record<string, any>, options?: QueryOptions & {
        limit?: number;
        offset?: number;
    }): Promise<QueryResult<T>>;
    safeInsert(table: string, data: Record<string, any>, options?: QueryOptions): Promise<QueryResult<{
        lastID: number;
        changes: number;
    }>>;
    safeUpdate(table: string, data: Record<string, any>, where: Record<string, any>, options?: QueryOptions): Promise<QueryResult<{
        changes: number;
    }>>;
}
export declare const createQueryProtectionMiddleware: (database: Database) => (req: any, res: any, next: any) => void;
//# sourceMappingURL=queryProtection.d.ts.map