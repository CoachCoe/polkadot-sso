import { Database } from 'sqlite';
export declare const secureQueries: {
    challenges: {
        get: (db: Database, id: string) => Promise<any>;
        create: (db: Database, challenge: Record<string, unknown>) => Promise<import("sqlite").ISqlite.RunResult<import("sqlite3").Statement>>;
        markUsed: (db: Database, id: string) => Promise<import("sqlite").ISqlite.RunResult<import("sqlite3").Statement>>;
    };
    sessions: {
        update: (db: Database, params: Record<string, unknown>) => Promise<import("sqlite").ISqlite.RunResult<import("sqlite3").Statement>>;
        get: (db: Database, address: string, clientId: string) => Promise<any>;
    };
    authCodes: {
        create: (db: Database, params: Record<string, unknown>) => Promise<import("sqlite").ISqlite.RunResult<import("sqlite3").Statement>>;
        verify: (db: Database, code: string, clientId: string) => Promise<any>;
        markUsed: (db: Database, code: string) => Promise<import("sqlite").ISqlite.RunResult<import("sqlite3").Statement>>;
    };
};
//# sourceMappingURL=db.d.ts.map