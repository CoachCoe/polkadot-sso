import { Database } from 'sqlite3';
import { AuditService } from './auditService';
export interface RetentionPolicy {
    name: string;
    table: string;
    retentionDays: number;
    dateColumn: string;
    archiveBeforeDelete?: boolean;
    deleteConditions?: Record<string, any>;
    cascadeDelete?: string[];
}
export interface CleanupResult {
    table: string;
    recordsDeleted: number;
    recordsArchived?: number;
    bytesFreed?: number;
    executionTime: number;
}
export interface RetentionConfig {
    policies: RetentionPolicy[];
    archivePath?: string;
    enableEncryptedArchive: boolean;
    maxBatchSize: number;
    cleanupSchedule: string;
}
/**
 * Data Retention and Cleanup Service
 */
export declare class DataRetentionService {
    private db;
    private auditService;
    private config;
    private isRunning;
    constructor(database: Database, auditService: AuditService, config: RetentionConfig);
    /**
     * Execute all retention policies
     */
    executeRetentionPolicies(): Promise<CleanupResult[]>;
    /**
     * Execute a single retention policy
     */
    private executePolicy;
    /**
     * Archive records before deletion
     */
    private archiveRecords;
    /**
     * Clean up related tables
     */
    private cleanupRelatedTable;
    /**
     * Execute database query with error handling
     */
    private executeQuery;
    /**
     * Get retention statistics
     */
    getRetentionStats(): Promise<{
        totalRecords: number;
        tablesStats: Record<string, {
            count: number;
            oldestRecord: string;
            newestRecord: string;
        }>;
    }>;
    /**
     * Preview what would be deleted without actually deleting
     */
    previewRetentionCleanup(): Promise<{
        policy: string;
        table: string;
        recordsToDelete: number;
        oldestRecord: string;
        newestRecord: string;
    }[]>;
}
/**
 * Default retention policies
 */
export declare const defaultRetentionPolicies: RetentionPolicy[];
/**
 * Default retention configuration
 */
export declare const defaultRetentionConfig: RetentionConfig;
//# sourceMappingURL=dataRetentionService.d.ts.map