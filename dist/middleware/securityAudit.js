"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSecurityAudit = void 0;
const createSecurityAudit = (auditService) => {
    return {
        rateLimitHandler: (req, res) => {
            void auditService.log({
                type: 'SECURITY_EVENT',
                client_id: String(req.query.client_id || 'unknown'),
                action: 'RATE_LIMIT_EXCEEDED',
                status: 'failure',
                details: {
                    endpoint: req.path,
                    ip: req.ip,
                },
                ip_address: req.ip || '0.0.0.0',
                user_agent: req.get('user-agent') || 'unknown',
            });
            res.status(429).json({
                error: 'Too many requests',
                retryAfter: res.get('Retry-After'),
            });
        },
        corsErrorHandler: (req) => {
            void auditService.log({
                type: 'SECURITY_EVENT',
                client_id: String(req.query.client_id || 'unknown'),
                action: 'CORS_VIOLATION',
                status: 'failure',
                details: {
                    origin: req.get('origin'),
                    ip: 'unknown',
                },
                ip_address: req.ip || '0.0.0.0',
                user_agent: req.get('user-agent') || 'unknown',
            });
        },
    };
};
exports.createSecurityAudit = createSecurityAudit;
//# sourceMappingURL=securityAudit.js.map