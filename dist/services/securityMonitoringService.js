"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSecurityMonitoringMiddleware = exports.SecurityMonitoringService = void 0;
const events_1 = __importDefault(require("events"));
const logger_1 = require("../utils/logger");
const logger = (0, logger_1.createLogger)('security-monitoring');
/**
 * Security Monitoring and Alerting Service
 */
class SecurityMonitoringService extends events_1.default {
    constructor(auditService) {
        super();
        this.events = [];
        this.alertRules = [];
        this.blockedIPs = new Set();
        this.disabledUsers = new Set();
        this.alertCooldowns = new Map();
        this.auditService = auditService;
        this.initializeDefaultRules();
        this.startCleanupTimer();
    }
    /**
     * Record a security event
     */
    async recordEvent(event) {
        const securityEvent = {
            ...event,
            id: this.generateEventId(),
            timestamp: Date.now(),
        };
        // Add to events list
        this.events.push(securityEvent);
        // Keep only last 10000 events
        if (this.events.length > 10000) {
            this.events = this.events.slice(-10000);
        }
        // Log the event
        logger.warn('Security event recorded', {
            eventId: securityEvent.id,
            type: securityEvent.type,
            severity: securityEvent.severity,
            source: securityEvent.source,
            ip: securityEvent.ip,
        });
        // Audit the security event
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
        // Check alert rules
        await this.checkAlertRules(securityEvent);
        // Emit event for listeners
        this.emit('securityEvent', securityEvent);
    }
    /**
     * Check if event triggers any alert rules
     */
    async checkAlertRules(event) {
        for (const rule of this.alertRules) {
            if (!rule.enabled)
                continue;
            // Check if event matches rule criteria
            if (!rule.eventTypes.includes(event.type))
                continue;
            if (!rule.severity.includes(event.severity))
                continue;
            // Check if we're in cooldown period
            const cooldownKey = `${rule.id}_${event.ip || 'global'}`;
            const lastAlert = this.alertCooldowns.get(cooldownKey);
            if (lastAlert && Date.now() - lastAlert < 300000) {
                // 5 min cooldown
                continue;
            }
            // Count matching events in time window
            const windowStart = Date.now() - rule.timeWindow;
            const matchingEvents = this.events.filter(e => e.timestamp >= windowStart &&
                rule.eventTypes.includes(e.type) &&
                rule.severity.includes(e.severity) &&
                (event.ip ? e.ip === event.ip : true));
            if (matchingEvents.length >= rule.threshold) {
                await this.triggerAlert(rule, matchingEvents);
                this.alertCooldowns.set(cooldownKey, Date.now());
            }
        }
    }
    /**
     * Trigger alert actions
     */
    async triggerAlert(rule, events) {
        logger.error(`Security alert triggered: ${rule.name}`, {
            ruleId: rule.id,
            eventCount: events.length,
            timeWindow: rule.timeWindow,
        });
        // Execute alert actions
        for (const action of rule.actions) {
            try {
                await this.executeAlertAction(action, rule, events);
            }
            catch (error) {
                logger.error(`Failed to execute alert action: ${action.type}`, { error });
            }
        }
        // Record alert in audit log
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
    /**
     * Execute specific alert action
     */
    async executeAlertAction(action, rule, events) {
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
    /**
     * Block suspicious IP addresses
     */
    async blockIP(events, config) {
        const ipsToBlock = [...new Set(events.map(e => e.ip).filter(Boolean))];
        for (const ip of ipsToBlock) {
            this.blockedIPs.add(ip);
            logger.warn(`IP address blocked: ${ip}`, { reason: 'Security alert triggered' });
            // Auto-unblock after configured time (default 1 hour)
            const blockDuration = config.blockDuration || 3600000; // 1 hour
            setTimeout(() => {
                this.blockedIPs.delete(ip);
                logger.info(`IP address unblocked: ${ip}`, { reason: 'Block duration expired' });
            }, blockDuration);
        }
    }
    /**
     * Disable suspicious user accounts
     */
    async disableUser(events, _config) {
        const usersToDisable = [...new Set(events.map(e => e.userId).filter(Boolean))];
        for (const userId of usersToDisable) {
            this.disabledUsers.add(userId);
            logger.warn(`User account disabled: ${userId}`, { reason: 'Security alert triggered' });
            // In a real implementation, you would update the user's status in the database
            // and notify them via email
        }
    }
    /**
     * Send email alert (placeholder - implement with your email service)
     */
    async sendEmailAlert(rule, events, _config) {
        logger.info('Email alert would be sent', {
            rule: rule.name,
            eventCount: events.length,
            recipients: _config.recipients,
        });
        // In production, integrate with email service:
        // await emailService.send({
        //   to: config.recipients,
        //   subject: `Security Alert: ${rule.name}`,
        //   body: this.formatAlertEmail(rule, events)
        // });
    }
    /**
     * Send webhook alert
     */
    async sendWebhookAlert(rule, events, _config) {
        logger.info('Webhook alert would be sent', {
            rule: rule.name,
            eventCount: events.length,
            url: _config.url,
        });
        // In production, send HTTP POST to webhook URL:
        // await fetch(config.url, {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify({
        //     rule: rule.name,
        //     events: events.map(e => ({
        //       type: e.type,
        //       severity: e.severity,
        //       timestamp: e.timestamp,
        //       ip: e.ip
        //     }))
        //   })
        // });
    }
    /**
     * Check if IP is blocked
     */
    isIPBlocked(ip) {
        return this.blockedIPs.has(ip);
    }
    /**
     * Check if user is disabled
     */
    isUserDisabled(userId) {
        return this.disabledUsers.has(userId);
    }
    /**
     * Get security metrics
     */
    getSecurityMetrics() {
        const now = Date.now();
        const last24Hours = now - 24 * 60 * 60 * 1000;
        const recentEvents = this.events.filter(e => e.timestamp >= last24Hours);
        const eventsBySeverity = recentEvents.reduce((acc, event) => {
            acc[event.severity] = (acc[event.severity] || 0) + 1;
            return acc;
        }, {});
        const eventsByType = recentEvents.reduce((acc, event) => {
            acc[event.type] = (acc[event.type] || 0) + 1;
            return acc;
        }, {});
        const ipCounts = recentEvents.reduce((acc, event) => {
            if (event.ip) {
                acc[event.ip] = (acc[event.ip] || 0) + 1;
            }
            return acc;
        }, {});
        const topSourceIPs = Object.entries(ipCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)
            .map(([ip, count]) => ({ ip, count }));
        // Determine system health
        const criticalEvents = recentEvents.filter(e => e.severity === 'critical').length;
        const highEvents = recentEvents.filter(e => e.severity === 'high').length;
        let status = 'healthy';
        const issues = [];
        if (criticalEvents > 0) {
            status = 'critical';
            issues.push(`${criticalEvents} critical security events in last 24h`);
        }
        else if (highEvents > 10) {
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
    /**
     * Initialize default alert rules
     */
    initializeDefaultRules() {
        this.alertRules = [
            {
                id: 'brute-force-detection',
                name: 'Brute Force Attack Detection',
                eventTypes: ['BRUTE_FORCE_ATTACK', 'INVALID_TOKEN_USAGE'],
                severity: ['medium', 'high', 'critical'],
                threshold: 5,
                timeWindow: 300000, // 5 minutes
                enabled: true,
                actions: [
                    { type: 'block_ip', config: { blockDuration: 3600000 } }, // 1 hour
                    { type: 'log', config: {} },
                ],
            },
            {
                id: 'sql-injection-detection',
                name: 'SQL Injection Attempt Detection',
                eventTypes: ['SQL_INJECTION_ATTEMPT'],
                severity: ['high', 'critical'],
                threshold: 1,
                timeWindow: 60000, // 1 minute
                enabled: true,
                actions: [
                    { type: 'block_ip', config: { blockDuration: 7200000 } }, // 2 hours
                    { type: 'log', config: {} },
                ],
            },
            {
                id: 'privilege-escalation',
                name: 'Privilege Escalation Detection',
                eventTypes: ['PRIVILEGE_ESCALATION', 'UNAUTHORIZED_ACCESS'],
                severity: ['high', 'critical'],
                threshold: 1,
                timeWindow: 300000, // 5 minutes
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
                timeWindow: 60000, // 1 minute
                enabled: true,
                actions: [
                    { type: 'block_ip', config: { blockDuration: 86400000 } }, // 24 hours
                    { type: 'disable_user', config: {} },
                    { type: 'log', config: {} },
                ],
            },
        ];
    }
    /**
     * Generate unique event ID
     */
    generateEventId() {
        return `sec_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    }
    /**
     * Cleanup old events periodically
     */
    startCleanupTimer() {
        setInterval(() => {
            const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
            this.events = this.events.filter(e => e.timestamp >= oneWeekAgo);
            // Clear old alert cooldowns
            const fiveMinutesAgo = Date.now() - 300000;
            for (const [key, timestamp] of this.alertCooldowns.entries()) {
                if (timestamp < fiveMinutesAgo) {
                    this.alertCooldowns.delete(key);
                }
            }
        }, 60 * 60 * 1000); // Run every hour
    }
}
exports.SecurityMonitoringService = SecurityMonitoringService;
/**
 * Security monitoring middleware
 */
const createSecurityMonitoringMiddleware = (securityMonitoring) => {
    return (req, res, next) => {
        // Check if IP is blocked
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
exports.createSecurityMonitoringMiddleware = createSecurityMonitoringMiddleware;
//# sourceMappingURL=securityMonitoringService.js.map