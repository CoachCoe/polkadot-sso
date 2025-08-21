import EventEmitter from 'events';
import { createLogger } from '../utils/logger';
import { AuditService } from './auditService';
const logger = createLogger('security-monitoring');
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
export type SecurityEventType =
  | 'BRUTE_FORCE_ATTACK'
  | 'SQL_INJECTION_ATTEMPT'
  | 'XSS_ATTEMPT'
  | 'RATE_LIMIT_EXCEEDED'
  | 'INVALID_TOKEN_USAGE'
  | 'PRIVILEGE_ESCALATION'
  | 'SUSPICIOUS_USER_BEHAVIOR'
  | 'MALICIOUS_PAYLOAD'
  | 'UNAUTHORIZED_ACCESS'
  | 'DATA_EXFILTRATION'
  | 'ACCOUNT_TAKEOVER'
  | 'ANOMALOUS_ACTIVITY';
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
  topSourceIPs: Array<{ ip: string; count: number }>;
  recentAlerts: SecurityEvent[];
  systemHealth: {
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
  };
}
export class SecurityMonitoringService extends EventEmitter {
  private auditService: AuditService;
  private events: SecurityEvent[] = [];
  private alertRules: AlertRule[] = [];
  private blockedIPs = new Set<string>();
  private disabledUsers = new Set<string>();
  private alertCooldowns = new Map<string, number>();
  constructor(auditService: AuditService) {
    super();
    this.auditService = auditService;
    this.initializeDefaultRules();
    this.startCleanupTimer();
  }
  async recordEvent(event: Omit<SecurityEvent, 'id' | 'timestamp'>): Promise<void> {
    const securityEvent: SecurityEvent = {
      ...event,
      id: this.generateEventId(),
      timestamp: Date.now(),
    };
    this.events.push(securityEvent);
    if (this.events.length > 10000) {
      this.events = this.events.slice(-10000);
    }
    logger.warn('Security event recorded', {
      eventId: securityEvent.id,
      type: securityEvent.type,
      severity: securityEvent.severity,
      source: securityEvent.source,
      ip: securityEvent.ip,
    });
    await this.auditService.log({
      type: 'SECURITY_EVENT',
      client_id: 'security-monitoring',
      action: securityEvent.type,
      status: 'success',
      details: {
        eventId: securityEvent.id,
        severity: securityEvent.severity,
        description: securityEvent.description,
        ...securityEvent.details,
      },
      ip_address: securityEvent.ip || 'unknown',
      user_agent: securityEvent.userAgent || 'unknown',
    });
    await this.checkAlertRules(securityEvent);
    this.emit('securityEvent', securityEvent);
  }
  private async checkAlertRules(event: SecurityEvent): Promise<void> {
    for (const rule of this.alertRules) {
      if (!rule.enabled) continue;
      if (!rule.eventTypes.includes(event.type)) continue;
      if (!rule.severity.includes(event.severity)) continue;
      const cooldownKey = `${rule.id}_${event.ip || 'global'}`;
      const lastAlert = this.alertCooldowns.get(cooldownKey);
      if (lastAlert && Date.now() - lastAlert < 300000) {
        continue;
      }
      const windowStart = Date.now() - rule.timeWindow;
      const matchingEvents = this.events.filter(
        e =>
          e.timestamp >= windowStart &&
          rule.eventTypes.includes(e.type) &&
          rule.severity.includes(e.severity) &&
          (event.ip ? e.ip === event.ip : true)
      );
      if (matchingEvents.length >= rule.threshold) {
        await this.triggerAlert(rule, matchingEvents);
        this.alertCooldowns.set(cooldownKey, Date.now());
      }
    }
  }
  private async triggerAlert(rule: AlertRule, events: SecurityEvent[]): Promise<void> {
    logger.error(`Security alert triggered: ${rule.name}`, {
      ruleId: rule.id,
      eventCount: events.length,
      timeWindow: rule.timeWindow,
    });
    for (const action of rule.actions) {
      try {
        await this.executeAlertAction(action, rule, events);
      } catch (error) {
        logger.error(`Failed to execute alert action: ${action.type}`, { error });
      }
    }
    await this.auditService.log({
      type: 'SECURITY_ALERT',
      client_id: 'security-monitoring',
      action: 'ALERT_TRIGGERED',
      status: 'success',
      details: {
        ruleId: rule.id,
        ruleName: rule.name,
        eventCount: events.length,
        timeWindow: rule.timeWindow,
        actions: rule.actions.map(a => a.type),
      },
      ip_address: 'system',
      user_agent: 'security-monitoring-service',
    });
  }
  private async executeAlertAction(
    action: AlertAction,
    rule: AlertRule,
    events: SecurityEvent[]
  ): Promise<void> {
    switch (action.type) {
      case 'block_ip':
        await this.blockIP(events, action.config);
        break;
      case 'disable_user':
        await this.disableUser(events, action.config);
        break;
      case 'email':
        void this.sendEmailAlert(rule, events, action.config);
        break;
      case 'webhook':
        await this.sendWebhookAlert(rule, events, action.config);
        break;
      case 'log':
        logger.error(`Security Alert: ${rule.name}`, {
          events: events.map(e => ({
            type: e.type,
            severity: e.severity,
            ip: e.ip,
            timestamp: e.timestamp,
          })),
        });
        break;
    }
  }
  private async blockIP(events: SecurityEvent[], config: Record<string, any>): Promise<void> {
    const ipsToBlock = [...new Set(events.map(e => e.ip).filter(Boolean))];
    for (const ip of ipsToBlock) {
      this.blockedIPs.add(ip!);
      logger.warn(`IP address blocked: ${ip}`, { reason: 'Security alert triggered' });
      const blockDuration = config['blockDuration'] || 3600000; 
      setTimeout(() => {
        this.blockedIPs.delete(ip!);
        logger.info(`IP address unblocked: ${ip}`, { reason: 'Block duration expired' });
      }, blockDuration as number);
    }
  }
  private async disableUser(events: SecurityEvent[], _config: Record<string, any>): Promise<void> {
    const usersToDisable = [...new Set(events.map(e => e.userId).filter(Boolean))];
    for (const userId of usersToDisable) {
      this.disabledUsers.add(userId!);
      logger.warn(`User account disabled: ${userId}`, { reason: 'Security alert triggered' });
    }
  }
  private async sendEmailAlert(
    rule: AlertRule,
    events: SecurityEvent[],
    _config: Record<string, any>
  ): Promise<void> {
    logger.info('Email alert would be sent', {
      rule: rule.name,
      eventCount: events.length,
      recipients: _config['recipients'],
    });
  }
  private async sendWebhookAlert(
    rule: AlertRule,
    events: SecurityEvent[],
    _config: Record<string, any>
  ): Promise<void> {
    logger.info('Webhook alert would be sent', {
      rule: rule.name,
      eventCount: events.length,
      url: _config['url'],
    });
  }
  isIPBlocked(ip: string): boolean {
    return this.blockedIPs.has(ip);
  }
  isUserDisabled(userId: string): boolean {
    return this.disabledUsers.has(userId);
  }
  getSecurityMetrics(): SecurityMetrics {
    const now = Date.now();
    const last24Hours = now - 24 * 60 * 60 * 1000;
    const recentEvents = this.events.filter(e => e.timestamp >= last24Hours);
    const eventsBySeverity = recentEvents.reduce(
      (acc, event) => {
        acc[event.severity] = (acc[event.severity] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
    const eventsByType = recentEvents.reduce(
      (acc, event) => {
        acc[event.type] = (acc[event.type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
    const ipCounts = recentEvents.reduce(
      (acc, event) => {
        if (event.ip) {
          acc[event.ip] = (acc[event.ip] || 0) + 1;
        }
        return acc;
      },
      {} as Record<string, number>
    );
    const topSourceIPs = Object.entries(ipCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([ip, count]) => ({ ip, count }));
    const criticalEvents = recentEvents.filter(e => e.severity === 'critical').length;
    const highEvents = recentEvents.filter(e => e.severity === 'high').length;
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    const issues: string[] = [];
    if (criticalEvents > 0) {
      status = 'critical';
      issues.push(`${criticalEvents} critical security events in last 24h`);
    } else if (highEvents > 10) {
      status = 'warning';
      issues.push(`${highEvents} high-severity events in last 24h`);
    }
    if (this.blockedIPs.size > 50) {
      status = status === 'healthy' ? 'warning' : status;
      issues.push(`${this.blockedIPs.size} IP addresses currently blocked`);
    }
    return {
      totalEvents: recentEvents.length,
      eventsBySeverity,
      eventsByType,
      topSourceIPs,
      recentAlerts: recentEvents
        .filter(e => e.severity === 'high' || e.severity === 'critical')
        .slice(-10),
      systemHealth: {
        status,
        issues,
      },
    };
  }
  private initializeDefaultRules(): void {
    this.alertRules = [
      {
        id: 'brute-force-detection',
        name: 'Brute Force Attack Detection',
        eventTypes: ['BRUTE_FORCE_ATTACK', 'INVALID_TOKEN_USAGE'],
        severity: ['medium', 'high', 'critical'],
        threshold: 5,
        timeWindow: 300000, 
        enabled: true,
        actions: [
          { type: 'block_ip', config: { blockDuration: 3600000 } }, 
          { type: 'log', config: {} },
        ],
      },
      {
        id: 'sql-injection-detection',
        name: 'SQL Injection Attempt Detection',
        eventTypes: ['SQL_INJECTION_ATTEMPT'],
        severity: ['high', 'critical'],
        threshold: 1,
        timeWindow: 60000, 
        enabled: true,
        actions: [
          { type: 'block_ip', config: { blockDuration: 7200000 } }, 
          { type: 'log', config: {} },
        ],
      },
      {
        id: 'privilege-escalation',
        name: 'Privilege Escalation Detection',
        eventTypes: ['PRIVILEGE_ESCALATION', 'UNAUTHORIZED_ACCESS'],
        severity: ['high', 'critical'],
        threshold: 1,
        timeWindow: 300000, 
        enabled: true,
        actions: [
          { type: 'disable_user', config: {} },
          { type: 'log', config: {} },
        ],
      },
      {
        id: 'data-exfiltration',
        name: 'Data Exfiltration Detection',
        eventTypes: ['DATA_EXFILTRATION', 'ANOMALOUS_ACTIVITY'],
        severity: ['critical'],
        threshold: 1,
        timeWindow: 60000, 
        enabled: true,
        actions: [
          { type: 'block_ip', config: { blockDuration: 86400000 } }, 
          { type: 'disable_user', config: {} },
          { type: 'log', config: {} },
        ],
      },
    ];
  }
  private generateEventId(): string {
    return `sec_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }
  private startCleanupTimer(): void {
    setInterval(
      () => {
        const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        this.events = this.events.filter(e => e.timestamp >= oneWeekAgo);
        const fiveMinutesAgo = Date.now() - 300000;
        for (const [key, timestamp] of this.alertCooldowns.entries()) {
          if (timestamp < fiveMinutesAgo) {
            this.alertCooldowns.delete(key);
          }
        }
      },
      60 * 60 * 1000
    ); 
  }
}
export const createSecurityMonitoringMiddleware = (
  securityMonitoring: SecurityMonitoringService
) => {
  return (req: any, res: any, next: any) => {
    if (securityMonitoring.isIPBlocked(String(req.ip))) {
      void securityMonitoring.recordEvent({
        type: 'UNAUTHORIZED_ACCESS',
        severity: 'high',
        source: 'blocked-ip-middleware',
        description: 'Blocked IP attempted access',
        details: { blockedIP: String(req.ip) },
        ip: String(req.ip),
        userAgent: req.get('user-agent'),
      });
      return res.status(403).json({
        error: 'Access denied',
        code: 'IP_BLOCKED',
      });
    }
    next();
  };
};