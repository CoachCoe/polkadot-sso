"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBruteForceProtection = void 0;
const bruteForceProtection = new Map();
const createBruteForceProtection = (auditService) => {
    setInterval(() => {
        const now = Date.now();
        bruteForceProtection.forEach((attempts, ip) => {
            const validAttempts = attempts.filter(time => now - time < 3600000);
            if (validAttempts.length === 0) {
                bruteForceProtection.delete(ip);
            }
            else {
                bruteForceProtection.set(ip, validAttempts);
            }
        });
    }, 3600000);
    return (req, res, next) => {
        const ip = req.ip || '0.0.0.0';
        const now = Date.now();
        if (bruteForceProtection.has(ip)) {
            const attempts = bruteForceProtection.get(ip).filter(time => now - time < 3600000);
            if (attempts.length >= 100) {
                void auditService.log({
                    type: 'SECURITY_EVENT',
                    client_id: String(req.query.client_id || 'unknown'),
                    action: 'BRUTE_FORCE_DETECTED',
                    status: 'failure',
                    details: { ip, attempts: attempts.length },
                    ip_address: ip,
                    user_agent: req.get('user-agent') || 'unknown',
                });
                return res.status(429).json({
                    error: 'Too many requests',
                    retryAfter: 3600,
                });
            }
            bruteForceProtection.set(ip, [...attempts, now]);
        }
        else {
            bruteForceProtection.set(ip, [now]);
        }
        next();
    };
};
exports.createBruteForceProtection = createBruteForceProtection;
//# sourceMappingURL=bruteForce.js.map