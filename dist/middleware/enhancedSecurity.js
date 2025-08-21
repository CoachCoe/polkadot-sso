"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditKusamaOperation = exports.sanitizeKusamaRequest = exports.enhancedCORS = exports.validateKusamaRequest = exports.validateRequestSize = exports.enhancedRateLimiter = exports.EnhancedSecurityMiddleware = void 0;
const logger_1 = require("../utils/logger");
const logger = (0, logger_1.createLogger)('enhanced-security');
// Security configuration
const SECURITY_CONFIG = {
    MAX_REQUEST_SIZE: 1024 * 1024, // 1MB
    MAX_CREDENTIAL_SIZE: 100 * 1024, // 100KB
    RATE_LIMIT_WINDOW: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS_PER_WINDOW: 100,
    SUSPICIOUS_PATTERNS: [
        /<script/i,
        /javascript:/i,
        /on\w+\s*=/i,
        /eval\s*\(/i,
        /document\./i,
        /window\./i,
    ],
    BLOCKED_HEADERS: ['x-forwarded-for', 'x-real-ip', 'x-forwarded-proto', 'x-forwarded-host'],
};
// Request tracking for anomaly detection
const requestTracker = new Map();
/**
 * Enhanced security middleware for Kusama operations
 */
class EnhancedSecurityMiddleware {
    /**
     * Validate Kusama address format
     */
    static validateKusamaAddress(address) {
        // Kusama addresses start with 5 and are 47 characters long
        const kusamaAddressRegex = /^5[a-km-zA-HJ-NP-Z1-9]{46}$/;
        return kusamaAddressRegex.test(address);
    }
    /**
     * Validate credential data structure and size
     */
    static validateCredentialData(data) {
        const errors = [];
        const dataString = JSON.stringify(data);
        const size = Buffer.byteLength(dataString, 'utf8');
        // Check size limits
        if (size > SECURITY_CONFIG.MAX_CREDENTIAL_SIZE) {
            errors.push(`Credential data too large: ${size} bytes (max: ${SECURITY_CONFIG.MAX_CREDENTIAL_SIZE})`);
        }
        // Check for required fields
        if (!data.type) {
            errors.push('Credential type is required');
        }
        // Check for suspicious content
        if (SECURITY_CONFIG.SUSPICIOUS_PATTERNS.some(pattern => pattern.test(dataString))) {
            errors.push('Suspicious content detected in credential data');
        }
        // Validate data types
        for (const [key, value] of Object.entries(data)) {
            if (typeof value === 'string' && value.length > 10000) {
                errors.push(`Field '${key}' is too long (max: 10000 characters)`);
            }
        }
        return {
            valid: errors.length === 0,
            errors,
            size,
        };
    }
    /**
     * Rate limiting with anomaly detection
     */
    static createEnhancedRateLimiter() {
        return (req, res, next) => {
            const ip = req.ip || '0.0.0.0';
            const now = Date.now();
            const _windowStart = now - SECURITY_CONFIG.RATE_LIMIT_WINDOW;
            // Get or create tracker for this IP
            let tracker = requestTracker.get(ip);
            if (!tracker) {
                tracker = {
                    count: 0,
                    lastRequest: now,
                    suspiciousActivity: 0,
                    blocked: false,
                };
                requestTracker.set(ip, tracker);
            }
            // Check if IP is blocked
            if (tracker.blocked) {
                logger.warn('Blocked IP attempted access', { ip, path: req.path });
                return res.status(403).json({
                    error: 'Access denied',
                    reason: 'IP address blocked due to suspicious activity',
                });
            }
            // Update request count
            tracker.count++;
            tracker.lastRequest = now;
            // Check rate limit
            if (tracker.count > SECURITY_CONFIG.MAX_REQUESTS_PER_WINDOW) {
                tracker.suspiciousActivity++;
                logger.warn('Rate limit exceeded', { ip, count: tracker.count, path: req.path });
                // Block IP if too many violations
                if (tracker.suspiciousActivity >= 3) {
                    tracker.blocked = true;
                    logger.error('IP blocked due to repeated violations', { ip });
                }
                return res.status(429).json({
                    error: 'Too many requests',
                    retryAfter: Math.ceil(SECURITY_CONFIG.RATE_LIMIT_WINDOW / 1000),
                });
            }
            next();
        };
    }
    /**
     * Request size validation
     */
    static validateRequestSize() {
        return (req, res, next) => {
            const contentLength = parseInt(req.get('content-length') || '0');
            if (contentLength > SECURITY_CONFIG.MAX_REQUEST_SIZE) {
                logger.warn('Request too large', {
                    ip: req.ip,
                    size: contentLength,
                    path: req.path,
                });
                return res.status(413).json({
                    error: 'Request too large',
                    maxSize: SECURITY_CONFIG.MAX_REQUEST_SIZE,
                });
            }
            next();
        };
    }
    /**
     * Kusama-specific security validation
     */
    static validateKusamaRequest() {
        return (req, res, next) => {
            const { userAddress, credentialData, storageMethod } = req.body;
            // Validate user address
            if (userAddress && !EnhancedSecurityMiddleware.validateKusamaAddress(String(userAddress))) {
                logger.warn('Invalid Kusama address', {
                    ip: req.ip,
                    address: userAddress,
                });
                return res.status(400).json({
                    error: 'Invalid Kusama address format',
                });
            }
            // Validate credential data
            if (credentialData) {
                const validation = EnhancedSecurityMiddleware.validateCredentialData(credentialData);
                if (!validation.valid) {
                    logger.warn('Invalid credential data', {
                        ip: req.ip,
                        errors: validation.errors,
                    });
                    return res.status(400).json({
                        error: 'Invalid credential data',
                        details: validation.errors,
                    });
                }
            }
            // Validate storage method
            const validMethods = ['remark', 'batch', 'custom_pallet'];
            if (storageMethod && !validMethods.includes(String(storageMethod))) {
                logger.warn('Invalid storage method', {
                    ip: req.ip,
                    method: storageMethod,
                });
                return res.status(400).json({
                    error: 'Invalid storage method',
                    validMethods,
                });
            }
            next();
        };
    }
    /**
     * Enhanced CORS with Kusama-specific origins
     */
    static createEnhancedCORS() {
        return (req, res, next) => {
            const origin = req.get('origin');
            const allowedOrigins = [
                'http://localhost:3001',
                'https://polkadot.js.org',
                'https://kusama.network',
            ];
            // Add environment-specific origins
            if (process.env.ALLOWED_ORIGINS) {
                allowedOrigins.push(...process.env.ALLOWED_ORIGINS.split(','));
            }
            if (origin && allowedOrigins.includes(origin)) {
                res.setHeader('Access-Control-Allow-Origin', origin);
            }
            else if (!origin) {
                // Allow requests without origin (same-origin)
                res.setHeader('Access-Control-Allow-Origin', '*');
            }
            else {
                logger.warn('CORS violation', {
                    ip: req.ip,
                    origin,
                    path: req.path,
                });
                return res.status(403).json({
                    error: 'CORS violation',
                });
            }
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
            res.setHeader('Access-Control-Allow-Credentials', 'true');
            if (req.method === 'OPTIONS') {
                return res.status(200).end();
            }
            next();
        };
    }
    /**
     * Request sanitization for Kusama operations
     */
    static sanitizeKusamaRequest() {
        return (req, res, next) => {
            // Sanitize headers
            SECURITY_CONFIG.BLOCKED_HEADERS.forEach(header => {
                delete req.headers[header];
            });
            // Sanitize body
            if (req.body) {
                // Remove any script-like content
                const bodyString = JSON.stringify(req.body);
                if (SECURITY_CONFIG.SUSPICIOUS_PATTERNS.some(pattern => pattern.test(bodyString))) {
                    logger.warn('Suspicious content in request body', {
                        ip: req.ip,
                        path: req.path,
                    });
                    return res.status(400).json({
                        error: 'Suspicious content detected',
                    });
                }
            }
            // Sanitize query parameters
            if (req.query) {
                for (const [key, value] of Object.entries(req.query)) {
                    if (typeof value === 'string' &&
                        SECURITY_CONFIG.SUSPICIOUS_PATTERNS.some(pattern => pattern.test(value))) {
                        logger.warn('Suspicious content in query parameter', {
                            ip: req.ip,
                            key,
                            path: req.path,
                        });
                        return res.status(400).json({
                            error: 'Suspicious content detected in query parameters',
                        });
                    }
                }
            }
            next();
        };
    }
    /**
     * Audit logging for Kusama operations
     */
    static auditKusamaOperation(operation) {
        return (req, res, next) => {
            const auditData = {
                operation,
                ip: req.ip,
                userAgent: req.get('user-agent'),
                method: req.method,
                path: req.path,
                timestamp: new Date().toISOString(),
                userAddress: req.body?.userAddress,
                storageMethod: req.body?.storageMethod,
                dataSize: req.body?.credentialData ? JSON.stringify(req.body.credentialData).length : 0,
            };
            logger.info('Kusama operation audit', auditData);
            // Add audit data to response locals for later use
            res.locals.auditData = auditData;
            next();
        };
    }
    /**
     * Clean up old request trackers
     */
    static cleanupRequestTrackers() {
        setInterval(() => {
            const now = Date.now();
            const cutoff = now - SECURITY_CONFIG.RATE_LIMIT_WINDOW;
            for (const [ip, tracker] of requestTracker.entries()) {
                if (tracker.lastRequest < cutoff && !tracker.blocked) {
                    requestTracker.delete(ip);
                }
            }
        }, 60000); // Clean up every minute
    }
}
exports.EnhancedSecurityMiddleware = EnhancedSecurityMiddleware;
// Initialize cleanup
EnhancedSecurityMiddleware.cleanupRequestTrackers();
// Export middleware functions
exports.enhancedRateLimiter = EnhancedSecurityMiddleware.createEnhancedRateLimiter();
exports.validateRequestSize = EnhancedSecurityMiddleware.validateRequestSize();
exports.validateKusamaRequest = EnhancedSecurityMiddleware.validateKusamaRequest();
exports.enhancedCORS = EnhancedSecurityMiddleware.createEnhancedCORS();
exports.sanitizeKusamaRequest = EnhancedSecurityMiddleware.sanitizeKusamaRequest();
const auditKusamaOperation = (operation) => EnhancedSecurityMiddleware.auditKusamaOperation(operation);
exports.auditKusamaOperation = auditKusamaOperation;
//# sourceMappingURL=enhancedSecurity.js.map