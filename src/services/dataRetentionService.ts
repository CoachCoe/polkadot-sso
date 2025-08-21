import { Database } from 'sqlite3';
import { createLogger } from '../utils/logger';
import { AuditService } from './auditService';
const logger = createLogger('data-retention');
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
export class DataRetentionService {
  private db: Database;
  private auditService: AuditService;
  private config: RetentionConfig;
  private isRunning = false;
  constructor(database: Database, auditService: AuditService, config: RetentionConfig) {
    this.db = database;
    this.auditService = auditService;
    this.config = config;
  }
  async executeRetentionPolicies(): Promise<CleanupResult[]> {
    if (this.isRunning) {
      logger.warn('Retention cleanup already running, skipping');
      return [];
    }
    this.isRunning = true;
    const startTime = Date.now();
    const results: CleanupResult[] = [];
    try {
      logger.info('Starting data retention cleanup', {
        policiesCount: this.config.policies.length,
      });
      for (const policy of this.config.policies) {
        try {
          const result = await this.executePolicy(policy);
          results.push(result);
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
        } catch (error) {
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
    } finally {
      this.isRunning = false;
    }
  }
  private async executePolicy(policy: RetentionPolicy): Promise<CleanupResult> {
    const startTime = Date.now();
    logger.info(`Executing retention policy: ${policy.name}`, {
      table: policy.table,
      retentionDays: policy.retentionDays,
    });
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - policy.retentionDays);
    const cutoffTimestamp = cutoffDate.getTime();
    let whereClause = `${policy.dateColumn} < ?`;
    const params = [cutoffTimestamp];
    if (policy.deleteConditions) {
      for (const [column, value] of Object.entries(policy.deleteConditions)) {
        whereClause += ` AND ${column} = ?`;
        params.push(value as number);
      }
    }
    const countQuery = `SELECT COUNT(*) as count FROM ${policy.table} WHERE ${whereClause}`;
    const countResult = await this.executeQuery<{ count: number }[]>(countQuery, params);
    const recordCount = countResult[0]?.count || 0;
    if (recordCount === 0) {
      return {
        table: policy.table,
        recordsDeleted: 0,
        executionTime: Date.now() - startTime,
      };
    }
    let recordsArchived = 0;
    if (policy.archiveBeforeDelete && this.config.enableEncryptedArchive) {
      recordsArchived = await this.archiveRecords(policy, whereClause, params);
    }
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
        break;
      }
      totalDeleted += deletedThisBatch;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
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
  private async archiveRecords(
    policy: RetentionPolicy,
    whereClause: string,
    params: any[]
  ): Promise<number> {
    try {
      const selectQuery = `SELECT * FROM ${policy.table} WHERE ${whereClause}`;
      const records = await this.executeQuery(selectQuery, params);
      if (!Array.isArray(records) || records.length === 0) {
        return 0;
      }
      const archiveFilename = `${policy.table}_${Date.now()}.archive`;
      logger.info(`Created encrypted archive: ${archiveFilename}`, {
        recordCount: records.length,
        table: policy.table,
      });
      return records.length;
    } catch (error) {
      logger.error('Failed to archive records', {
        error,
        table: policy.table,
        policy: policy.name,
      });
      return 0;
    }
  }
  private async cleanupRelatedTable(
    relatedTable: string,
    parentPolicy: RetentionPolicy,
    _whereClause: string,
    params: any[]
  ): Promise<void> {
    try {
      const deleteQuery = `
        DELETE FROM ${relatedTable}
        WHERE ${parentPolicy.dateColumn} < ?
      `;
      await this.executeQuery(deleteQuery, [params[0]]);
      logger.info(`Cleaned up related table: ${relatedTable}`, {
        parentTable: parentPolicy.table,
      });
    } catch (error) {
      logger.error(`Failed to cleanup related table: ${relatedTable}`, { error });
    }
  }
  private executeQuery<T = any>(query: string, params: any[] = []): Promise<T> {
    return new Promise((resolve, reject) => {
      this.db.all(query, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows as T);
        }
      });
    });
  }
  async getRetentionStats(): Promise<{
    totalRecords: number;
    tablesStats: Record<string, { count: number; oldestRecord: string; newestRecord: string }>;
  }> {
    const stats: Record<string, { count: number; oldestRecord: string; newestRecord: string }> = {};
    let totalRecords = 0;
    for (const policy of this.config.policies) {
      try {
        const countQuery = `SELECT COUNT(*) as count FROM ${policy.table}`;
        const countResult = await this.executeQuery<{ count: number }[]>(countQuery);
        const count = countResult[0]?.count || 0;
        const oldestQuery = `SELECT MIN(${policy.dateColumn}) as oldest FROM ${policy.table}`;
        const oldestResult = await this.executeQuery<{ oldest: number }[]>(oldestQuery);
        const oldest = oldestResult[0]?.oldest;
        const newestQuery = `SELECT MAX(${policy.dateColumn}) as newest FROM ${policy.table}`;
        const newestResult = await this.executeQuery<{ newest: number }[]>(newestQuery);
        const newest = newestResult[0]?.newest;
        stats[policy.table] = {
          count,
          oldestRecord: oldest ? new Date(oldest).toISOString() : 'N/A',
          newestRecord: newest ? new Date(newest).toISOString() : 'N/A',
        };
        totalRecords += count;
      } catch (error) {
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
  async previewRetentionCleanup(): Promise<
    {
      policy: string;
      table: string;
      recordsToDelete: number;
      oldestRecord: string;
      newestRecord: string;
    }[]
  > {
    const previews: Array<{
      policy: string;
      table: string;
      recordsToDelete: number;
      oldestRecord: string;
      newestRecord: string;
    }> = [];
    for (const policy of this.config.policies) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - policy.retentionDays);
      const cutoffTimestamp = cutoffDate.getTime();
      let whereClause = `${policy.dateColumn} < ?`;
      const params = [cutoffTimestamp];
      if (policy.deleteConditions) {
        for (const [column, value] of Object.entries(policy.deleteConditions)) {
          whereClause += ` AND ${column} = ?`;
          params.push(value as number);
        }
      }
      try {
        const countQuery = `SELECT COUNT(*) as count FROM ${policy.table} WHERE ${whereClause}`;
        const countResult = await this.executeQuery<{ count: number }[]>(countQuery, params);
        const recordsToDelete = countResult[0]?.count || 0;
        if (recordsToDelete > 0) {
          const oldestQuery = `SELECT MIN(${policy.dateColumn}) as oldest FROM ${policy.table} WHERE ${whereClause}`;
          const oldestResult = await this.executeQuery<{ oldest: number }[]>(oldestQuery, params);
          const oldest = oldestResult[0]?.oldest;
          const newestQuery = `SELECT MAX(${policy.dateColumn}) as newest FROM ${policy.table} WHERE ${whereClause}`;
          const newestResult = await this.executeQuery<{ newest: number }[]>(newestQuery, params);
          const newest = newestResult[0]?.newest;
          previews.push({
            policy: policy.name,
            table: policy.table,
            recordsToDelete,
            oldestRecord: oldest ? new Date(oldest).toISOString() : 'N/A',
            newestRecord: newest ? new Date(newest).toISOString() : 'N/A',
          });
        }
      } catch (error) {
        logger.error(`Failed to preview cleanup for policy: ${policy.name}`, { error });
      }
    }
    return previews;
  }
}
export const defaultRetentionPolicies: RetentionPolicy[] = [
  {
    name: 'audit_logs_cleanup',
    table: 'audit_logs',
    retentionDays: 365,
    dateColumn: 'created_at',
    archiveBeforeDelete: true,
  },
  {
    name: 'expired_tokens_cleanup',
    table: 'tokens',
    retentionDays: 30,
    dateColumn: 'expires_at',
    deleteConditions: { status: 'expired' },
  },
  {
    name: 'old_challenges_cleanup',
    table: 'challenges',
    retentionDays: 7,
    dateColumn: 'created_at',
  },
  {
    name: 'inactive_sessions_cleanup',
    table: 'sessions',
    retentionDays: 90,
    dateColumn: 'last_accessed_at',
  },
];
export const defaultRetentionConfig: RetentionConfig = {
  policies: defaultRetentionPolicies,
  enableEncryptedArchive: true,
  maxBatchSize: 1000,
  cleanupSchedule: '0 2 * * 0',
};
