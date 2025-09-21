import { Database } from 'sqlite';
import sqlite3 from 'sqlite3';
declare class DatabasePool {
    private pool;
    private waiting;
    private dbPath;
    private isShuttingDown;
    constructor(dbPath: string);
    initialize(): Promise<void>;
    private createConnection;
    getConnection(): Promise<Database>;
    private isConnectionHealthy;
    releaseConnection(db: Database): void;
    private startReaper;
    private reapIdleConnections;
    shutdown(): Promise<void>;
    getStats(): {
        total: number;
        inUse: number;
        idle: number;
        waiting: number;
        max: number;
        min: number;
    };
}
export declare function initializeDatabasePool(): Promise<DatabasePool>;
export declare function getDatabaseConnection(): Promise<Database>;
export declare function releaseDatabaseConnection(db: Database): Promise<void>;
export declare function shutdownDatabasePool(): Promise<void>;
export declare function getDatabasePoolStats(): {
    total: number;
    inUse: number;
    idle: number;
    waiting: number;
    max: number;
    min: number;
} | null;
export declare function initializeDatabase(): Promise<Database>;
export declare const dbPromise: Promise<Database<sqlite3.Database, sqlite3.Statement>>;
export {};
//# sourceMappingURL=db.d.ts.map