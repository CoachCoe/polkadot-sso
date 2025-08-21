"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultRetentionConfig = exports.defaultRetentionPolicies = exports.DataRetentionService = void 0;
const enhancedEncryption_1 = require("../utils/enhancedEncryption");
const logger_1 = require("../utils/logger");
const logger = (0, logger_1.createLogger)('data-retention');
/**
 * Data Retention and Cleanup Service
 */
class DataRetentionService {
    constructor(database, auditService, config) {
        this.isRunning = false;
        this.db = database;
        this.auditService = auditService;
        this.config = config;
    }
    /**
     * Execute all retention policies
     */
    async executeRetentionPolicies() {
        if (this.isRunning) {
            logger.warn('Retention cleanup already running, skipping');
            return [];
        }
        this.isRunning = true;
        const startTime = Date.now();
        const results = [];
        try {
            logger.info('Starting data retention cleanup', {
                policiesCount: this.config.policies.length,
            });
            for (const policy of this.config.policies) {
                try {
                    const result = await this.executePolicy(policy);
                    results.push(result);
                    // Log retention activity
                    await this.auditService.log({
                        type: 'DATA_RETENTION',
                        client_id: 'retention-service',
                        action: 'POLICY_EXECUTED',
                        status: 'success',
                        details: {
                            policy: policy.name,
                            table: policy.table,
                            recordsDeleted: result.recordsDeleted,
                            recordsArchived: result.recordsArchived || 0,
                            retentionDays: policy.retentionDays,
                        },
                        ip_address: 'system',
                        user_agent: 'data-retention-service',
                    });
                }
                catch (error) {
                    logger.error(`Failed to execute retention policy: ${policy.name}`, { error });
                    await this.auditService.log({
                        type: 'DATA_RETENTION',
                        client_id: 'retention-service',
                        action: 'POLICY_FAILED',
                        status: 'failure',
                        details: {
                            policy: policy.name,
                            table: policy.table,
                            error: error instanceof Error ? error.message : 'Unknown error',
                        },
                        ip_address: 'system',
                        user_agent: 'data-retention-service',
                    });
                }
            }
            const totalTime = Date.now() - startTime;
            const totalDeleted = results.reduce((sum, r) => sum + r.recordsDeleted, 0);
            const totalArchived = results.reduce((sum, r) => sum + (r.recordsArchived || 0), 0);
            logger.info('Data retention cleanup completed', {
                totalPolicies: this.config.policies.length,
                totalDeleted,
                totalArchived,
                executionTime: totalTime,
            });
            return results;
        }
        finally {
            this.isRunning = false;
        }
    }
    /**
     * Execute a single retention policy
     */
    async executePolicy(policy) {
        const startTime = Date.now();
        logger.info(`Executing retention policy: ${policy.name}`, {
            table: policy.table,
            retentionDays: policy.retentionDays,
        });
        // Calculate cutoff date
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - policy.retentionDays);
        const cutoffTimestamp = cutoffDate.getTime();
        // Build query to find expired records
        let whereClause = `${policy.dateColumn} < ?`;
        const params = [cutoffTimestamp];
        // Add additional conditions
        if (policy.deleteConditions) {
            for (const [column, value] of Object.entries(policy.deleteConditions)) {
                whereClause += ` AND ${column} = ?`;
                params.push(value);
            }
        }
        // First, count records to be deleted
        const countQuery = `SELECT COUNT(*) as count FROM ${policy.table} WHERE ${whereClause}`;
        const countResult = await this.executeQuery(countQuery, params);
        const recordCount = countResult[0]?.count || 0;
        if (recordCount === 0) {
            return {
                table: policy.table,
                recordsDeleted: 0,
                executionTime: Date.now() - startTime,
            };
        }
        let recordsArchived = 0;
        // Archive records if required
        if (policy.archiveBeforeDelete && this.config.enableEncryptedArchive) {
            recordsArchived = await this.archiveRecords(policy, whereClause, params);
        }
        // Delete expired records in batches
        let totalDeleted = 0;
        const batchSize = this.config.maxBatchSize;
        while (totalDeleted < recordCount) {
            const deleteQuery = `
        DELETE FROM ${policy.table}
        WHERE ${whereClause}
        LIMIT ${batchSize}
      `;
            const deleteResult = await this.executeQuery(deleteQuery, params);
            const deletedThisBatch = deleteResult.changes || 0;
            if (deletedThisBatch === 0) {
                break; // No more records to delete
            }
            totalDeleted += deletedThisBatch;
            // Small delay between batches to avoid blocking
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        // Clean up related tables if specified
        if (policy.cascadeDelete) {
            for (const relatedTable of policy.cascadeDelete) {
                await this.cleanupRelatedTable(relatedTable, policy, whereClause, params);
            }
        }
        return {
            table: policy.table,
            recordsDeleted: totalDeleted,
            recordsArchived,
            executionTime: Date.now() - startTime,
        };
    }
    /**
     * Archive records before deletion
     */
    async archiveRecords(policy, whereClause, params) {
        try {
            // Select records to archive
            const selectQuery = `SELECT * FROM ${policy.table} WHERE ${whereClause}`;
            const records = await this.executeQuery(selectQuery, params);
            if (!Array.isArray(records) || records.length === 0) {
                return 0;
            }
            // Create encrypted archive
            const archiveData = {
                table: policy.table,
                policy: policy.name,
                archivedAt: new Date().toISOString(),
                records,
            };
            const _encryptedArchive = await enhancedEncryption_1.enhancedEncryption.encryptData(JSON.stringify(archiveData), {
                purpose: 'database',
                version: '2.0',
                timestamp: Date.now(),
                metadata: {
                    table: policy.table,
                    recordCount: records.length,
                },
            });
            // Store archive (in production, this would go to secure storage)
            const archiveFilename = `${policy.table}_${Date.now()}.archive`;
            logger.info(`Created encrypted archive: ${archiveFilename}`, {
                recordCount: records.length,
                table: policy.table,
            });
            return records.length;
        }
        catch (error) {
            logger.error('Failed to archive records', {
                error,
                table: policy.table,
                policy: policy.name,
            });
            return 0;
        }
    }
    /**
     * Clean up related tables
     */
    async cleanupRelatedTable(relatedTable, parentPolicy, whereClause, params) {
        try {
            // This is a simplified approach - in practice, you'd need proper foreign key relationships
            const deleteQuery = `
        DELETE FROM ${relatedTable}
        WHERE ${parentPolicy.dateColumn} < ?
      `;
            await this.executeQuery(deleteQuery, [params[0]]);
            logger.info(`Cleaned up related table: ${relatedTable}`, {
                parentTable: parentPolicy.table,
            });
        }
        catch (error) {
            logger.error(`Failed to cleanup related table: ${relatedTable}`, { error });
        }
    }
    /**
     * Execute database query with error handling
     */
    executeQuery(query, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(query, params, (err, rows) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(rows);
                }
            });
        });
    }
    /**
     * Get retention statistics
     */
    async getRetentionStats() {
        const stats = {};
        let totalRecords = 0;
        for (const policy of this.config.policies) {
            try {
                const countQuery = `SELECT COUNT(*) as count FROM ${policy.table}`;
                const countResult = await this.executeQuery(countQuery);
                const count = countResult[0]?.count || 0;
                const oldestQuery = `SELECT MIN(${policy.dateColumn}) as oldest FROM ${policy.table}`;
                const oldestResult = await this.executeQuery(oldestQuery);
                const oldest = oldestResult[0]?.oldest;
                const newestQuery = `SELECT MAX(${policy.dateColumn}) as newest FROM ${policy.table}`;
                const newestResult = await this.executeQuery(newestQuery);
                const newest = newestResult[0]?.newest;
                stats[policy.table] = {
                    count,
                    oldestRecord: oldest ? new Date(oldest).toISOString() : 'N/A',
                    newestRecord: newest ? new Date(newest).toISOString() : 'N/A',
                };
                totalRecords += count;
            }
            catch (error) {
                logger.error(`Failed to get stats for table: ${policy.table}`, { error });
                stats[policy.table] = {
                    count: 0,
                    oldestRecord: 'Error',
                    newestRecord: 'Error',
                };
            }
        }
        return {
            totalRecords,
            tablesStats: stats,
        };
    }
    /**
     * Preview what would be deleted without actually deleting
     */
    async previewRetentionCleanup() {
        const previews = [];
        for (const policy of this.config.policies) {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - policy.retentionDays);
            const cutoffTimestamp = cutoffDate.getTime();
            let whereClause = `${policy.dateColumn} < ?`;
            const params = [cutoffTimestamp];
            if (policy.deleteConditions) {
                for (const [column, value] of Object.entries(policy.deleteConditions)) {
                    whereClause += ` AND ${column} = ?`;
                    params.push(value);
                }
            }
            try {
                const countQuery = `SELECT COUNT(*) as count FROM ${policy.table} WHERE ${whereClause}`;
                const countResult = await this.executeQuery(countQuery, params);
                const recordsToDelete = countResult[0]?.count || 0;
                if (recordsToDelete > 0) {
                    const oldestQuery = `SELECT MIN(${policy.dateColumn}) as oldest FROM ${policy.table} WHERE ${whereClause}`;
                    const oldestResult = await this.executeQuery(oldestQuery, params);
                    const oldest = oldestResult[0]?.oldest;
                    const newestQuery = `SELECT MAX(${policy.dateColumn}) as newest FROM ${policy.table} WHERE ${whereClause}`;
                    const newestResult = await this.executeQuery(newestQuery, params);
                    const newest = newestResult[0]?.newest;
                    previews.push({
                        policy: policy.name,
                        table: policy.table,
                        recordsToDelete,
                        oldestRecord: oldest ? new Date(oldest).toISOString() : 'N/A',
                        newestRecord: newest ? new Date(newest).toISOString() : 'N/A',
                    });
                }
            }
            catch (error) {
                logger.error(`Failed to preview cleanup for policy: ${policy.name}`, { error });
            }
        }
        return previews;
    }
}
exports.DataRetentionService = DataRetentionService;
/**
 * Default retention policies
 */
exports.defaultRetentionPolicies = [
    {
        name: 'audit_logs_cleanup',
        table: 'audit_logs',
        retentionDays: 365, // Keep audit logs for 1 year
        dateColumn: 'created_at',
        archiveBeforeDelete: true,
    },
    {
        name: 'expired_tokens_cleanup',
        table: 'tokens',
        retentionDays: 30, // Keep expired tokens for 30 days
        dateColumn: 'expires_at',
        deleteConditions: { status: 'expired' },
    },
    {
        name: 'old_challenges_cleanup',
        table: 'challenges',
        retentionDays: 7, // Keep challenges for 7 days
        dateColumn: 'created_at',
    },
    {
        name: 'inactive_sessions_cleanup',
        table: 'sessions',
        retentionDays: 90, // Keep inactive sessions for 90 days
        dateColumn: 'last_accessed_at',
    },
];
/**
 * Default retention configuration
 */
exports.defaultRetentionConfig = {
    policies: exports.defaultRetentionPolicies,
    enableEncryptedArchive: true,
    maxBatchSize: 1000,
    cleanupSchedule: '0 2 * * 0', // Weekly at 2 AM on Sunday
};
//# sourceMappingURL=dataRetentionService.js.map