import { AuditService } from './auditService';
export interface SecurityEvent {
    type: 'WALLET_CONNECTION' | 'TRANSACTION_ATTEMPT' | 'SUSPICIOUS_ACTIVITY' | 'RATE_LIMIT_EXCEEDED';
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    userAddress: string;
    ipAddress: string;
    userAgent: string;
    details: Record<string, unknown>;
    timestamp: number;
}
export interface SecurityAlert {
    id: string;
    event: SecurityEvent;
    action: 'BLOCK' | 'WARN' | 'LOG' | 'NOTIFY';
    message: string;
    resolved: boolean;
    resolvedAt?: number;
}
export interface SecurityStats {
    totalEvents: number;
    blockedUsers: number;
    suspiciousActivities: number;
    rateLimitViolations: number;
    last24Hours: {
        events: number;
        blocks: number;
        alerts: number;
    };
}
export declare class WalletSecurityMonitoringService {
    private auditService;
    private events;
    private alerts;
    private blockedAddresses;
    private suspiciousPatterns;
    private readonly MAX_EVENTS;
    private readonly MAX_ALERTS;
    private readonly SUSPICIOUS_THRESHOLD;
    private readonly BLOCK_DURATION;
    constructor(auditService: AuditService);
    logEvent(event: Omit<SecurityEvent, 'timestamp'>): void;
    private analyzeEvent;
    private checkSuspiciousPatterns;
    private checkRateLimiting;
    private isRepeatedSuspiciousActivity;
    private createAlert;
    private blockAddress;
    isAddressBlocked(userAddress: string): boolean;
    getSecurityStats(): SecurityStats;
    getRecentEvents(limit?: number): SecurityEvent[];
    getActiveAlerts(): SecurityAlert[];
    resolveAlert(alertId: string): boolean;
    private cleanup;
    private startCleanupInterval;
    exportSecurityReport(): {
        stats: SecurityStats;
        recentEvents: SecurityEvent[];
        activeAlerts: SecurityAlert[];
        blockedAddresses: string[];
    };
}
//# sourceMappingURL=walletSecurityMonitoringService.d.ts.map