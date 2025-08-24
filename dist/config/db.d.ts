import { Database } from 'sqlite';
import sqlite3 from 'sqlite3';
export declare function createDbPool(): Promise<Database[]>;
export declare function initializeDatabase(): Promise<Database>;
export declare const dbPromise: Promise<Database<sqlite3.Database, sqlite3.Statement>>;
//# sourceMappingURL=db.d.ts.map