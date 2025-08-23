import { createLogger } from '../utils/logger';
import { AuditService } from './auditService';

const logger = createLogger('WalletSecurityMonitoring');

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

/**
 * Wallet Security Monitoring Service
 *
 * Monitors wallet operations for security threats and suspicious activity
 */
export class WalletSecurityMonitoringService {
  private auditService: AuditService;
  private events: SecurityEvent[] = [];
  private alerts: SecurityAlert[] = [];
  private blockedAddresses: Set<string> = new Set();
  private suspiciousPatterns: Map<string, number> = new Map();

  // Configuration
  private readonly MAX_EVENTS = 10000;
  private readonly MAX_ALERTS = 1000;
  private readonly SUSPICIOUS_THRESHOLD = 5;
  private readonly BLOCK_DURATION = 24 * 60 * 60 * 1000; // 24 hours

  constructor(auditService: AuditService) {
    this.auditService = auditService;
    this.startCleanupInterval();
  }

  /**
   * Log a security event
   */
  logEvent(event: Omit<SecurityEvent, 'timestamp'>): void {
    const fullEvent: SecurityEvent = {
      ...event,
      timestamp: Date.now(),
    };

    this.events.push(fullEvent);

    // Maintain event list size
    if (this.events.length > this.MAX_EVENTS) {
      this.events = this.events.slice(-this.MAX_EVENTS);
    }

    // Analyze event for threats
    this.analyzeEvent(fullEvent);

    // Log to audit service
    this.auditService.log({
      type: 'SECURITY_EVENT',
      client_id: 'wallet-security-monitoring',
      action: event.type,
      status: 'success',
      details: {
        severity: event.severity,
        userAddress: event.userAddress,
        ...event.details,
      },
      ip_address: event.ipAddress,
      user_agent: event.userAgent,
    });

    logger.info('Security event logged', {
      type: event.type,
      severity: event.severity,
      userAddress: event.userAddress,
    });
  }

  /**
   * Analyze event for security threats
   */
  private analyzeEvent(event: SecurityEvent): void {
    const { userAddress, ipAddress, type, severity } = event;

    // Check for suspicious patterns
    this.checkSuspiciousPatterns(event);

    // Check for rate limiting violations
    this.checkRateLimiting(event);

    // Check for critical events
    if (severity === 'CRITICAL') {
      this.createAlert(event, 'BLOCK', 'Critical security event detected');
      this.blockAddress(userAddress);
    }

    // Check for high severity events
    if (severity === 'HIGH') {
      this.createAlert(event, 'WARN', 'High severity security event detected');
    }

    // Check for repeated suspicious activity
    if (this.isRepeatedSuspiciousActivity(userAddress)) {
      this.createAlert(event, 'BLOCK', 'Repeated suspicious activity detected');
      this.blockAddress(userAddress);
    }
  }

  /**
   * Check for suspicious patterns
   */
  private checkSuspiciousPatterns(event: SecurityEvent): void {
    const { userAddress, ipAddress, details } = event;
    const key = `${userAddress}:${ipAddress}`;
    const count = this.suspiciousPatterns.get(key) || 0;

    // Increment suspicious activity count
    this.suspiciousPatterns.set(key, count + 1);

    // Check if threshold exceeded
    if (count + 1 >= this.SUSPICIOUS_THRESHOLD) {
      this.createAlert(event, 'WARN', 'Suspicious activity pattern detected');
    }
  }

  /**
   * Check for rate limiting violations
   */
  private checkRateLimiting(event: SecurityEvent): void {
    const { userAddress, type } = event;

    // Count events in last hour for this user
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const recentEvents = this.events.filter(
      e => e.userAddress === userAddress && e.timestamp > oneHourAgo
    );

    if (recentEvents.length > 100) {
      this.createAlert(event, 'BLOCK', 'Rate limit exceeded');
      this.blockAddress(userAddress);
    }
  }

  /**
   * Check for repeated suspicious activity
   */
  private isRepeatedSuspiciousActivity(userAddress: string): boolean {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const recentSuspiciousEvents = this.events.filter(
      e => e.userAddress === userAddress && e.timestamp > oneHourAgo && e.severity === 'HIGH'
    );

    return recentSuspiciousEvents.length >= 3;
  }

  /**
   * Create a security alert
   */
  private createAlert(
    event: SecurityEvent,
    action: SecurityAlert['action'],
    message: string
  ): void {
    const alert: SecurityAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      event,
      action,
      message,
      resolved: false,
    };

    this.alerts.push(alert);

    // Maintain alerts list size
    if (this.alerts.length > this.MAX_ALERTS) {
      this.alerts = this.alerts.slice(-this.MAX_ALERTS);
    }

    logger.warn('Security alert created', {
      alertId: alert.id,
      action,
      message,
      userAddress: event.userAddress,
    });
  }

  /**
   * Block an address
   */
  private blockAddress(userAddress: string): void {
    this.blockedAddresses.add(userAddress);

    logger.warn('Address blocked due to security threat', {
      userAddress,
      blockedAddressesCount: this.blockedAddresses.size,
    });

    // Schedule unblock after block duration
    setTimeout(() => {
      this.blockedAddresses.delete(userAddress);
      logger.info('Address unblocked', { userAddress });
    }, this.BLOCK_DURATION);
  }

  /**
   * Check if address is blocked
   */
  isAddressBlocked(userAddress: string): boolean {
    return this.blockedAddresses.has(userAddress);
  }

  /**
   * Get security statistics
   */
  getSecurityStats(): SecurityStats {
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    const last24HoursEvents = this.events.filter(e => e.timestamp > oneDayAgo);
    const last24HoursAlerts = this.alerts.filter(a => a.event.timestamp > oneDayAgo);

    return {
      totalEvents: this.events.length,
      blockedUsers: this.blockedAddresses.size,
      suspiciousActivities: this.suspiciousPatterns.size,
      rateLimitViolations: this.events.filter(e => e.type === 'RATE_LIMIT_EXCEEDED').length,
      last24Hours: {
        events: last24HoursEvents.length,
        blocks: last24HoursAlerts.filter(a => a.action === 'BLOCK').length,
        alerts: last24HoursAlerts.length,
      },
    };
  }

  /**
   * Get recent security events
   */
  getRecentEvents(limit: number = 50): SecurityEvent[] {
    return this.events.slice(-limit).reverse();
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): SecurityAlert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      alert.resolvedAt = Date.now();
      logger.info('Security alert resolved', { alertId });
      return true;
    }
    return false;
  }

  /**
   * Clear old events and alerts
   */
  private cleanup(): void {
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    // Remove old events
    this.events = this.events.filter(e => e.timestamp > oneWeekAgo);

    // Remove old alerts
    this.alerts = this.alerts.filter(a => a.event.timestamp > oneWeekAgo);

    // Clear old suspicious patterns
    for (const [key] of this.suspiciousPatterns) {
      const [userAddress, ipAddress] = key.split(':');
      const recentEvents = this.events.filter(
        e => e.userAddress === userAddress && e.ipAddress === ipAddress
      );
      if (recentEvents.length === 0) {
        this.suspiciousPatterns.delete(key);
      }
    }

    logger.info('Security monitoring cleanup completed', {
      eventsCount: this.events.length,
      alertsCount: this.alerts.length,
      suspiciousPatternsCount: this.suspiciousPatterns.size,
    });
  }

  /**
   * Start cleanup interval
   */
  private startCleanupInterval(): void {
    // Clean up every hour
    setInterval(
      () => {
        this.cleanup();
      },
      60 * 60 * 1000
    );
  }

  /**
   * Export security report
   */
  exportSecurityReport(): {
    stats: SecurityStats;
    recentEvents: SecurityEvent[];
    activeAlerts: SecurityAlert[];
    blockedAddresses: string[];
  } {
    return {
      stats: this.getSecurityStats(),
      recentEvents: this.getRecentEvents(100),
      activeAlerts: this.getActiveAlerts(),
      blockedAddresses: Array.from(this.blockedAddresses),
    };
  }
}
