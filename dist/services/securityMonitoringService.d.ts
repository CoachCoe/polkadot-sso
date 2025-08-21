import EventEmitter from 'events';
import { AuditService } from './auditService';
export interface SecurityEvent {
    id: string;
    type: SecurityEventType;
    severity: 'low' | 'medium' | 'high' | 'critical';
    source: string;
    description: string;
    details: Record<string, any>;
    timestamp: number;
    ip?: string;
    userAgent?: string;
    userId?: string;
}
export type SecurityEventType = 'BRUTE_FORCE_ATTACK' | 'SQL_INJECTION_ATTEMPT' | 'XSS_ATTEMPT' | 'RATE_LIMIT_EXCEEDED' | 'INVALID_TOKEN_USAGE' | 'PRIVILEGE_ESCALATION' | 'SUSPICIOUS_USER_BEHAVIOR' | 'MALICIOUS_PAYLOAD' | 'UNAUTHORIZED_ACCESS' | 'DATA_EXFILTRATION' | 'ACCOUNT_TAKEOVER' | 'ANOMALOUS_ACTIVITY';
export interface AlertRule {
    id: string;
    name: string;
    eventTypes: SecurityEventType[];
    severity: ('low' | 'medium' | 'high' | 'critical')[];
    threshold: number;
    timeWindow: number;
    enabled: boolean;
    actions: AlertAction[];
}
export interface AlertAction {
    type: 'email' | 'webhook' | 'block_ip' | 'disable_user' | 'log';
    config: Record<string, any>;
}
export interface SecurityMetrics {
    totalEvents: number;
    eventsBySeverity: Record<string, number>;
    eventsByType: Record<string, number>;
    topSourceIPs: Array<{
        ip: string;
        count: number;
    }>;
    recentAlerts: SecurityEvent[];
    systemHealth: {
        status: 'healthy' | 'warning' | 'critical';
        issues: string[];
    };
}
/**
 * Security Monitoring and Alerting Service
 */
export declare class SecurityMonitoringService extends EventEmitter {
    private auditService;
    private events;
    private alertRules;
    private blockedIPs;
    private disabledUsers;
    private alertCooldowns;
    constructor(auditService: AuditService);
    /**
     * Record a security event
     */
    recordEvent(event: Omit<SecurityEvent, 'id' | 'timestamp'>): Promise<void>;
    /**
     * Check if event triggers any alert rules
     */
    private checkAlertRules;
    /**
     * Trigger alert actions
     */
    private triggerAlert;
    /**
     * Execute specific alert action
     */
    private executeAlertAction;
    /**
     * Block suspicious IP addresses
     */
    private blockIP;
    /**
     * Disable suspicious user accounts
     */
    private disableUser;
    /**
     * Send email alert (placeholder - implement with your email service)
     */
    private sendEmailAlert;
    /**
     * Send webhook alert
     */
    private sendWebhookAlert;
    /**
     * Check if IP is blocked
     */
    isIPBlocked(ip: string): boolean;
    /**
     * Check if user is disabled
     */
    isUserDisabled(userId: string): boolean;
    /**
     * Get security metrics
     */
    getSecurityMetrics(): SecurityMetrics;
    /**
     * Initialize default alert rules
     */
    private initializeDefaultRules;
    /**
     * Generate unique event ID
     */
    private generateEventId;
    /**
     * Cleanup old events periodically
     */
    private startCleanupTimer;
}
/**
 * Security monitoring middleware
 */
export declare const createSecurityMonitoringMiddleware: (securityMonitoring: SecurityMonitoringService) => (req: any, res: any, next: any) => any;
//# sourceMappingURL=securityMonitoringService.d.ts.map