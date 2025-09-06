import { AuditEvent } from '../types/audit';
export declare class AuditService {
    constructor();
    log(event: AuditEvent): Promise<void>;
    getAuditLogs(filters?: {
        user_address?: string;
        client_id?: string;
        event_type?: string;
        action?: string;
        status?: string;
        start_date?: Date;
        end_date?: Date;
        limit?: number;
        offset?: number;
    }): Promise<Array<AuditEvent & {
        id: number;
        created_at: number;
    }>>;
    getAuditStats(): Promise<{
        total: number;
        by_type: Record<string, number>;
        by_status: Record<string, number>;
        by_action: Record<string, number>;
    }>;
    cleanupOldAuditLogs(daysToKeep?: number): Promise<number>;
}
//# sourceMappingURL=auditService.d.ts.map