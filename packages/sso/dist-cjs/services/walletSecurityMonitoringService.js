"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletSecurityMonitoringService = void 0;
const logger_1 = require("../utils/logger");
const logger = (0, logger_1.createLogger)('WalletSecurityMonitoring');
class WalletSecurityMonitoringService {
    constructor(auditService) {
        this.events = [];
        this.alerts = [];
        this.blockedAddresses = new Set();
        this.suspiciousPatterns = new Map();
        this.MAX_EVENTS = 10000;
        this.MAX_ALERTS = 1000;
        this.SUSPICIOUS_THRESHOLD = 5;
        this.BLOCK_DURATION = 24 * 60 * 60 * 1000; // 24 hours
        this.auditService = auditService;
        this.startCleanupInterval();
    }
    logEvent(event) {
        const fullEvent = {
            ...event,
            timestamp: Date.now(),
        };
        this.events.push(fullEvent);
        if (this.events.length > this.MAX_EVENTS) {
            this.events = this.events.slice(-this.MAX_EVENTS);
        }
        this.analyzeEvent(fullEvent);
        void this.auditService.log({
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
    analyzeEvent(event) {
        const { userAddress, ipAddress, type, severity } = event;
        this.checkSuspiciousPatterns(event);
        this.checkRateLimiting(event);
        if (severity === 'CRITICAL') {
            this.createAlert(event, 'BLOCK', 'Critical security event detected');
            this.blockAddress(userAddress);
        }
        if (severity === 'HIGH') {
            this.createAlert(event, 'WARN', 'High severity security event detected');
        }
        if (this.isRepeatedSuspiciousActivity(userAddress)) {
            this.createAlert(event, 'BLOCK', 'Repeated suspicious activity detected');
            this.blockAddress(userAddress);
        }
    }
    checkSuspiciousPatterns(event) {
        const { userAddress, ipAddress, details } = event;
        const key = `${userAddress}:${ipAddress}`;
        const count = this.suspiciousPatterns.get(key) || 0;
        this.suspiciousPatterns.set(key, count + 1);
        if (count + 1 >= this.SUSPICIOUS_THRESHOLD) {
            this.createAlert(event, 'WARN', 'Suspicious activity pattern detected');
        }
    }
    checkRateLimiting(event) {
        const { userAddress, type } = event;
        const oneHourAgo = Date.now() - 60 * 60 * 1000;
        const recentEvents = this.events.filter(e => e.userAddress === userAddress && e.timestamp > oneHourAgo);
        if (recentEvents.length > 100) {
            this.createAlert(event, 'BLOCK', 'Rate limit exceeded');
            this.blockAddress(userAddress);
        }
    }
    isRepeatedSuspiciousActivity(userAddress) {
        const oneHourAgo = Date.now() - 60 * 60 * 1000;
        const recentSuspiciousEvents = this.events.filter(e => e.userAddress === userAddress && e.timestamp > oneHourAgo && e.severity === 'HIGH');
        return recentSuspiciousEvents.length >= 3;
    }
    createAlert(event, action, message) {
        const alert = {
            id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            event,
            action,
            message,
            resolved: false,
        };
        this.alerts.push(alert);
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
    blockAddress(userAddress) {
        this.blockedAddresses.add(userAddress);
        logger.warn('Address blocked due to security threat', {
            userAddress,
            blockedAddressesCount: this.blockedAddresses.size,
        });
        setTimeout(() => {
            this.blockedAddresses.delete(userAddress);
            logger.info('Address unblocked', { userAddress });
        }, this.BLOCK_DURATION);
    }
    isAddressBlocked(userAddress) {
        return this.blockedAddresses.has(userAddress);
    }
    getSecurityStats() {
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
    getRecentEvents(limit = 50) {
        return this.events.slice(-limit).reverse();
    }
    getActiveAlerts() {
        return this.alerts.filter(alert => !alert.resolved);
    }
    resolveAlert(alertId) {
        const alert = this.alerts.find(a => a.id === alertId);
        if (alert && !alert.resolved) {
            alert.resolved = true;
            alert.resolvedAt = Date.now();
            logger.info('Security alert resolved', { alertId });
            return true;
        }
        return false;
    }
    cleanup() {
        const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        this.events = this.events.filter(e => e.timestamp > oneWeekAgo);
        this.alerts = this.alerts.filter(a => a.event.timestamp > oneWeekAgo);
        for (const [key] of this.suspiciousPatterns) {
            const [userAddress, ipAddress] = key.split(':');
            const recentEvents = this.events.filter(e => e.userAddress === userAddress && e.ipAddress === ipAddress);
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
    startCleanupInterval() {
        // Clean up every hour
        setInterval(() => {
            this.cleanup();
        }, 60 * 60 * 1000);
    }
    exportSecurityReport() {
        return {
            stats: this.getSecurityStats(),
            recentEvents: this.getRecentEvents(100),
            activeAlerts: this.getActiveAlerts(),
            blockedAddresses: Array.from(this.blockedAddresses),
        };
    }
}
exports.WalletSecurityMonitoringService = WalletSecurityMonitoringService;
//# sourceMappingURL=walletSecurityMonitoringService.js.map