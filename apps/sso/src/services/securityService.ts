import { createLogger } from '../utils/logger.js';
import crypto from 'crypto';
import { z } from 'zod';

const logger = createLogger('security-service');

export interface SecurityConfig {
  maxLoginAttempts: number;
  lockoutDuration: number; // in milliseconds
  passwordMinLength: number;
  requireSpecialChars: boolean;
  sessionTimeout: number; // in milliseconds
  ipWhitelist: string[];
  ipBlacklist: string[];
  rateLimitEnabled: boolean;
  auditLogging: boolean;
}

export interface SecurityEvent {
  id: string;
  timestamp: number;
  type: 'login_attempt' | 'login_success' | 'login_failure' | 'suspicious_activity' | 'rate_limit_exceeded' | 'ip_blocked';
  ip: string;
  userAgent?: string;
  details: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface ThreatDetection {
  isThreat: boolean;
  riskScore: number; // 0-100
  reasons: string[];
  recommendedAction: 'allow' | 'monitor' | 'block' | 'investigate';
}

export class SecurityService {
  private config: SecurityConfig;
  private loginAttempts: Map<string, { count: number; lastAttempt: number; lockedUntil?: number }> = new Map();
  private securityEvents: SecurityEvent[] = [];
  private suspiciousIPs: Set<string> = new Set();
  private blockedIPs: Set<string> = new Set();

  constructor(config: SecurityConfig) {
    this.config = config;
    
    // Clean up old events periodically
    setInterval(() => {
      this.cleanupOldEvents();
    }, 60000); // Every minute

    logger.info('Security service initialized', {
      maxLoginAttempts: config.maxLoginAttempts,
      lockoutDuration: config.lockoutDuration,
      auditLogging: config.auditLogging,
    });
  }

  /**
   * Validate password strength
   */
  validatePassword(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < this.config.passwordMinLength) {
      errors.push(`Password must be at least ${this.config.passwordMinLength} characters long`);
    }

    if (this.config.requireSpecialChars) {
      if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        errors.push('Password must contain at least one special character');
      }
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Check if IP is blocked
   */
  isIPBlocked(ip: string): boolean {
    return this.blockedIPs.has(ip) || this.config.ipBlacklist.includes(ip);
  }

  /**
   * Check if IP is whitelisted
   */
  isIPWhitelisted(ip: string): boolean {
    return this.config.ipWhitelist.includes(ip);
  }

  /**
   * Record login attempt
   */
  recordLoginAttempt(ip: string, success: boolean, userAgent?: string, details?: Record<string, any>): void {
    const now = Date.now();
    const attempt = this.loginAttempts.get(ip) || { count: 0, lastAttempt: now };

    if (success) {
      // Reset on successful login
      this.loginAttempts.delete(ip);
      this.logSecurityEvent({
        type: 'login_success',
        ip,
        userAgent,
        details: details || {},
        severity: 'low',
      });
    } else {
      // Increment failed attempts
      attempt.count++;
      attempt.lastAttempt = now;

      if (attempt.count >= this.config.maxLoginAttempts) {
        attempt.lockedUntil = now + this.config.lockoutDuration;
        this.blockedIPs.add(ip);
        
        this.logSecurityEvent({
          type: 'ip_blocked',
          ip,
          userAgent,
          details: { 
            reason: 'max_login_attempts_exceeded',
            attempts: attempt.count,
            lockoutDuration: this.config.lockoutDuration,
            ...details,
          },
          severity: 'high',
        });
      } else {
        this.logSecurityEvent({
          type: 'login_failure',
          ip,
          userAgent,
          details: { 
            attempt: attempt.count,
            maxAttempts: this.config.maxLoginAttempts,
            ...details,
          },
          severity: 'medium',
        });
      }

      this.loginAttempts.set(ip, attempt);
    }
  }

  /**
   * Check if IP is locked out
   */
  isIPLockedOut(ip: string): boolean {
    const attempt = this.loginAttempts.get(ip);
    if (!attempt || !attempt.lockedUntil) {
      return false;
    }

    if (Date.now() > attempt.lockedUntil) {
      // Lockout expired
      this.loginAttempts.delete(ip);
      this.blockedIPs.delete(ip);
      return false;
    }

    return true;
  }

  /**
   * Detect threats based on request patterns
   */
  detectThreat(ip: string, userAgent?: string, requestDetails?: Record<string, any>): ThreatDetection {
    const reasons: string[] = [];
    let riskScore = 0;

    // Check for blocked IP
    if (this.isIPBlocked(ip)) {
      reasons.push('IP is blocked');
      riskScore += 50;
    }

    // Check for suspicious user agent
    if (userAgent) {
      const suspiciousPatterns = [
        /bot/i,
        /crawler/i,
        /spider/i,
        /scraper/i,
        /curl/i,
        /wget/i,
        /python/i,
        /java/i,
      ];

      if (suspiciousPatterns.some(pattern => pattern.test(userAgent))) {
        reasons.push('Suspicious user agent');
        riskScore += 20;
      }
    }

    // Check for rapid requests (basic rate limiting)
    const recentEvents = this.securityEvents.filter(
      event => event.ip === ip && Date.now() - event.timestamp < 60000 // Last minute
    );

    if (recentEvents.length > 10) {
      reasons.push('High request frequency');
      riskScore += 30;
    }

    // Check for multiple failed login attempts
    const failedAttempts = recentEvents.filter(event => event.type === 'login_failure');
    if (failedAttempts.length > 3) {
      reasons.push('Multiple failed login attempts');
      riskScore += 25;
    }

    // Determine recommended action
    let recommendedAction: 'allow' | 'monitor' | 'block' | 'investigate';
    if (riskScore >= 80) {
      recommendedAction = 'block';
    } else if (riskScore >= 60) {
      recommendedAction = 'investigate';
    } else if (riskScore >= 30) {
      recommendedAction = 'monitor';
    } else {
      recommendedAction = 'allow';
    }

    return {
      isThreat: riskScore >= 50,
      riskScore,
      reasons,
      recommendedAction,
    };
  }

  /**
   * Log security event
   */
  private logSecurityEvent(event: Omit<SecurityEvent, 'id' | 'timestamp'>): void {
    if (!this.config.auditLogging) {
      return;
    }

    const securityEvent: SecurityEvent = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      ...event,
    };

    this.securityEvents.push(securityEvent);

    // Keep only last 1000 events
    if (this.securityEvents.length > 1000) {
      this.securityEvents.shift();
    }

    logger.info('Security event logged', {
      type: event.type,
      ip: event.ip,
      severity: event.severity,
      details: event.details,
    });
  }

  /**
   * Get security events
   */
  getSecurityEvents(limit: number = 100, severity?: string): SecurityEvent[] {
    let events = this.securityEvents;

    if (severity) {
      events = events.filter(event => event.severity === severity);
    }

    return events
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Get security statistics
   */
  getSecurityStats(): Record<string, any> {
    const now = Date.now();
    const last24h = now - (24 * 60 * 60 * 1000);
    const last1h = now - (60 * 60 * 1000);

    const events24h = this.securityEvents.filter(event => event.timestamp > last24h);
    const events1h = this.securityEvents.filter(event => event.timestamp > last1h);

    const stats = {
      totalEvents: this.securityEvents.length,
      events24h: events24h.length,
      events1h: events1h.length,
      blockedIPs: this.blockedIPs.size,
      suspiciousIPs: this.suspiciousIPs.size,
      activeLockouts: Array.from(this.loginAttempts.values()).filter(
        attempt => attempt.lockedUntil && attempt.lockedUntil > now
      ).length,
      eventTypes: {} as Record<string, number>,
      severityCounts: {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0,
      },
    };

    // Count event types and severities
    for (const event of events24h) {
      stats.eventTypes[event.type] = (stats.eventTypes[event.type] || 0) + 1;
      stats.severityCounts[event.severity]++;
    }

    return stats;
  }

  /**
   * Unblock IP
   */
  unblockIP(ip: string): void {
    this.blockedIPs.delete(ip);
    this.loginAttempts.delete(ip);
    
    logger.info('IP unblocked', { ip });
  }

  /**
   * Block IP manually
   */
  blockIP(ip: string, reason: string): void {
    this.blockedIPs.add(ip);
    
    this.logSecurityEvent({
      type: 'ip_blocked',
      ip,
      details: { reason, manual: true },
      severity: 'high',
    });

    logger.info('IP blocked manually', { ip, reason });
  }

  /**
   * Clean up old events
   */
  private cleanupOldEvents(): void {
    const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days
    const initialLength = this.securityEvents.length;
    
    this.securityEvents = this.securityEvents.filter(event => event.timestamp > cutoff);
    
    if (this.securityEvents.length < initialLength) {
      logger.debug('Cleaned up old security events', {
        removed: initialLength - this.securityEvents.length,
        remaining: this.securityEvents.length,
      });
    }
  }

  /**
   * Generate security report
   */
  generateSecurityReport(): Record<string, any> {
    const stats = this.getSecurityStats();
    const recentEvents = this.getSecurityEvents(50);
    const highSeverityEvents = this.getSecurityEvents(20, 'high');
    const criticalEvents = this.getSecurityEvents(10, 'critical');

    return {
      timestamp: Date.now(),
      summary: stats,
      recentEvents,
      highSeverityEvents,
      criticalEvents,
      recommendations: this.generateRecommendations(stats),
    };
  }

  /**
   * Generate security recommendations
   */
  private generateRecommendations(stats: Record<string, any>): string[] {
    const recommendations: string[] = [];

    if (stats.events1h > 100) {
      recommendations.push('High event volume detected - consider reviewing rate limiting settings');
    }

    if (stats.blockedIPs > 50) {
      recommendations.push('Many blocked IPs - consider reviewing IP whitelist/blacklist configuration');
    }

    if (stats.severityCounts.critical > 0) {
      recommendations.push('Critical security events detected - immediate investigation required');
    }

    if (stats.severityCounts.high > 10) {
      recommendations.push('Multiple high-severity events - review security configuration');
    }

    if (stats.activeLockouts > 20) {
      recommendations.push('Many active lockouts - consider adjusting lockout duration or max attempts');
    }

    return recommendations;
  }
}

// Default security configuration
export const defaultSecurityConfig: SecurityConfig = {
  maxLoginAttempts: 5,
  lockoutDuration: 15 * 60 * 1000, // 15 minutes
  passwordMinLength: 8,
  requireSpecialChars: true,
  sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
  ipWhitelist: [],
  ipBlacklist: [],
  rateLimitEnabled: true,
  auditLogging: true,
};
