import { Database } from 'sqlite';
import { AuditEvent } from '../types/audit';
export declare class AuditService {
    private db;
    constructor(db: Database);
    log(event: AuditEvent): Promise<void>;
    getAuditLogs(filters: {
        user_address?: string;
        client_id?: string;
        from_date?: number;
        to_date?: number;
    }, limit?: number): Promise<AuditEvent[]>;
}
//# sourceMappingURL=auditService.d.ts.map