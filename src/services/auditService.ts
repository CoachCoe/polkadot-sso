import { Database } from 'sqlite';
import { AuditEvent } from '../types/audit';

export class AuditService {
  constructor(private db: Database) {}

  async log(event: AuditEvent): Promise<void> {
    await this.db.run(
      `INSERT INTO audit_logs (
        event_type, user_address, client_id, 
        action, status, details, ip_address,
        user_agent, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        event.type,
        event.user_address,
        event.client_id,
        event.action,
        event.status,
        JSON.stringify(event.details),
        event.ip_address,
        event.user_agent,
        Date.now(),
      ]
    );
  }

  async getAuditLogs(
    filters: {
      user_address?: string;
      client_id?: string;
      from_date?: number;
      to_date?: number;
    },
    limit = 100
  ): Promise<AuditEvent[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filters.user_address) {
      conditions.push('user_address = ?');
      params.push(filters.user_address);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    return this.db.all<AuditEvent[]>(
      `SELECT * FROM audit_logs 
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT ?`,
      [...params, limit]
    );
  }
}
