"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditService = void 0;
const db_1 = require("../config/db");
const logger_1 = require("../utils/logger");
const logger = (0, logger_1.createLogger)('audit-service');
class AuditService {
    constructor() { }
    async log(event) {
        let db = null;
        try {
            db = await (0, db_1.getDatabaseConnection)();
            await db.run(`INSERT INTO audit_logs (
          event_type, user_address, client_id,
          action, status, details, ip_address,
          user_agent, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                event.type,
                event.user_address,
                event.client_id,
                event.action,
                event.status,
                JSON.stringify(event.details),
                event.ip_address,
                event.user_agent,
                Date.now(),
            ]);
            logger.debug('Audit event logged', {
                type: event.type,
                action: event.action,
                status: event.status,
            });
        }
        catch (error) {
            logger.error('Failed to log audit event', {
                error: error instanceof Error ? error.message : String(error),
                event: event.type,
            });
            // Don't throw - audit failures shouldn't break the application
        }
        finally {
            if (db) {
                (0, db_1.releaseDatabaseConnection)(db);
            }
        }
    }
    async getAuditLogs(filters = {}) {
        let db = null;
        try {
            db = await (0, db_1.getDatabaseConnection)();
            let query = 'SELECT * FROM audit_logs WHERE 1=1';
            const params = [];
            if (filters.user_address) {
                query += ' AND user_address = ?';
                params.push(filters.user_address);
            }
            if (filters.client_id) {
                query += ' AND client_id = ?';
                params.push(filters.client_id);
            }
            if (filters.event_type) {
                query += ' AND event_type = ?';
                params.push(filters.event_type);
            }
            if (filters.action) {
                query += ' AND action = ?';
                params.push(filters.action);
            }
            if (filters.status) {
                query += ' AND status = ?';
                params.push(filters.status);
            }
            if (filters.start_date) {
                query += ' AND created_at >= ?';
                params.push(filters.start_date.getTime());
            }
            if (filters.end_date) {
                query += ' AND created_at <= ?';
                params.push(filters.end_date.getTime());
            }
            query += ' ORDER BY created_at DESC';
            if (filters.limit) {
                query += ' LIMIT ?';
                params.push(filters.limit);
            }
            if (filters.offset) {
                query += ' OFFSET ?';
                params.push(filters.offset);
            }
            const results = await db.all(query, params);
            return results.map(row => ({
                id: row.id,
                type: row.event_type,
                user_address: row.user_address,
                client_id: row.client_id,
                action: row.action,
                status: row.status,
                details: row.details ? JSON.parse(row.details) : {},
                ip_address: row.ip_address,
                user_agent: row.user_agent,
                created_at: row.created_at,
            }));
        }
        catch (error) {
            logger.error('Failed to get audit logs', {
                error: error instanceof Error ? error.message : String(error),
            });
            return [];
        }
        finally {
            if (db) {
                (0, db_1.releaseDatabaseConnection)(db);
            }
        }
    }
    async getAuditStats() {
        let db = null;
        try {
            db = await (0, db_1.getDatabaseConnection)();
            const totalResult = await db.get('SELECT COUNT(*) as count FROM audit_logs');
            const typeResults = await db.all('SELECT event_type, COUNT(*) as count FROM audit_logs GROUP BY event_type');
            const statusResults = await db.all('SELECT status, COUNT(*) as count FROM audit_logs GROUP BY status');
            const actionResults = await db.all('SELECT action, COUNT(*) as count FROM audit_logs GROUP BY action');
            const by_type = {};
            const by_status = {};
            const by_action = {};
            typeResults.forEach((row) => {
                by_type[row.event_type] = row.count;
            });
            statusResults.forEach((row) => {
                by_status[row.status] = row.count;
            });
            actionResults.forEach((row) => {
                by_action[row.action] = row.count;
            });
            return {
                total: totalResult?.count || 0,
                by_type,
                by_status,
                by_action,
            };
        }
        catch (error) {
            logger.error('Failed to get audit stats', {
                error: error instanceof Error ? error.message : String(error),
            });
            return {
                total: 0,
                by_type: {},
                by_status: {},
                by_action: {},
            };
        }
        finally {
            if (db) {
                (0, db_1.releaseDatabaseConnection)(db);
            }
        }
    }
    async cleanupOldAuditLogs(daysToKeep = 90) {
        let db = null;
        try {
            const cutoffDate = Date.now() - daysToKeep * 24 * 60 * 60 * 1000;
            db = await (0, db_1.getDatabaseConnection)();
            const result = await db.run('DELETE FROM audit_logs WHERE created_at < ?', [cutoffDate]);
            if (result.changes > 0) {
                logger.info('Cleaned up old audit logs', {
                    deleted: result.changes,
                    daysKept: daysToKeep,
                });
            }
            return result.changes || 0;
        }
        catch (error) {
            logger.error('Failed to cleanup old audit logs', {
                error: error instanceof Error ? error.message : String(error),
            });
            return 0;
        }
        finally {
            if (db) {
                (0, db_1.releaseDatabaseConnection)(db);
            }
        }
    }
}
exports.AuditService = AuditService;
//# sourceMappingURL=auditService.js.map