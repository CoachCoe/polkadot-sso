"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditService = void 0;
class AuditService {
    constructor(db) {
        this.db = db;
    }
    async log(event) {
        await this.db.run(`INSERT INTO audit_logs (
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
    }
    async getAuditLogs(filters, limit = 100) {
        const conditions = [];
        const params = [];
        if (filters.user_address) {
            conditions.push('user_address = ?');
            params.push(filters.user_address);
        }
        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        return this.db.all(`SELECT * FROM audit_logs 
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT ?`, [...params, limit]);
    }
}
exports.AuditService = AuditService;
//# sourceMappingURL=auditService.js.map