"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUserRateLimiter = exports.createOwnershipMiddleware = exports.createAuthorizationMiddleware = exports.createAuthenticationMiddleware = void 0;
const logger_1 = require("../utils/logger");
const logger = (0, logger_1.createLogger)('auth-middleware');
/**
 * JWT Authentication Middleware
 */
const createAuthenticationMiddleware = (tokenService, auditService) => {
    return (options = {}) => {
        return async (req, res, next) => {
            const authReq = req;
            try {
                // Extract token from Authorization header
                const authHeader = req.get('Authorization');
                const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
                if (!token) {
                    if (options.required !== false) {
                        await auditService.log({
                            type: 'SECURITY_EVENT',
                            client_id: 'api-auth',
                            action: 'MISSING_TOKEN',
                            status: 'failure',
                            details: { path: req.path, method: req.method },
                            ip_address: req.ip || 'unknown',
                            user_agent: req.get('user-agent') || 'unknown',
                        });
                        return res.status(401).json({
                            error: 'Authentication required',
                            code: 'MISSING_TOKEN',
                        });
                    }
                    return next();
                }
                // Verify token
                const tokenData = await tokenService.verifyToken(token, 'access');
                if (!tokenData) {
                    await auditService.log({
                        type: 'SECURITY_EVENT',
                        client_id: 'api-auth',
                        action: 'INVALID_TOKEN',
                        status: 'failure',
                        details: { path: req.path, method: req.method },
                        ip_address: req.ip || 'unknown',
                        user_agent: req.get('user-agent') || 'unknown',
                    });
                    return res.status(401).json({
                        error: 'Invalid or expired token',
                        code: 'INVALID_TOKEN',
                    });
                }
                // Set user data on request
                authReq.user = {
                    address: tokenData.decoded?.address || '',
                    sessionId: tokenData.session?.id || '',
                    permissions: [],
                    isAdmin: false,
                };
                // Check admin requirement
                if (options.adminOnly && !authReq.user.isAdmin) {
                    await auditService.log({
                        type: 'SECURITY_EVENT',
                        client_id: 'api-auth',
                        action: 'INSUFFICIENT_PRIVILEGES',
                        status: 'failure',
                        details: {
                            path: req.path,
                            method: req.method,
                            userAddress: authReq.user.address,
                            required: 'admin',
                        },
                        ip_address: req.ip || 'unknown',
                        user_agent: req.get('user-agent') || 'unknown',
                    });
                    return res.status(403).json({
                        error: 'Admin privileges required',
                        code: 'INSUFFICIENT_PRIVILEGES',
                    });
                }
                // Check specific permissions
                if (options.permissions && options.permissions.length > 0) {
                    const hasPermission = options.permissions.some(permission => authReq.user.permissions.includes(permission));
                    if (!hasPermission) {
                        await auditService.log({
                            type: 'SECURITY_EVENT',
                            client_id: 'api-auth',
                            action: 'INSUFFICIENT_PERMISSIONS',
                            status: 'failure',
                            details: {
                                path: req.path,
                                method: req.method,
                                userAddress: authReq.user.address,
                                required: options.permissions,
                                userPermissions: authReq.user.permissions,
                            },
                            ip_address: req.ip || 'unknown',
                            user_agent: req.get('user-agent') || 'unknown',
                        });
                        return res.status(403).json({
                            error: 'Insufficient permissions',
                            code: 'INSUFFICIENT_PERMISSIONS',
                            required: options.permissions,
                        });
                    }
                }
                // Log successful authentication
                await auditService.log({
                    type: 'API_ACCESS',
                    client_id: 'api-auth',
                    action: 'AUTHENTICATED_REQUEST',
                    status: 'success',
                    details: {
                        path: req.path,
                        method: req.method,
                        userAddress: authReq.user.address,
                    },
                    ip_address: req.ip || 'unknown',
                    user_agent: req.get('user-agent') || 'unknown',
                });
                next();
            }
            catch (error) {
                logger.error('Authentication middleware error', { error });
                await auditService.log({
                    type: 'SECURITY_EVENT',
                    client_id: 'api-auth',
                    action: 'AUTH_MIDDLEWARE_ERROR',
                    status: 'failure',
                    details: {
                        path: req.path,
                        method: req.method,
                        error: error instanceof Error ? error.message : 'Unknown error',
                    },
                    ip_address: req.ip || 'unknown',
                    user_agent: req.get('user-agent') || 'unknown',
                });
                return res.status(500).json({
                    error: 'Authentication error',
                    code: 'AUTH_ERROR',
                });
            }
        };
    };
};
exports.createAuthenticationMiddleware = createAuthenticationMiddleware;
/**
 * Role-based Authorization Middleware
 */
const createAuthorizationMiddleware = (auditService) => {
    return (allowedRoles) => {
        return async (req, res, next) => {
            const authReq = req;
            if (!authReq.user) {
                return res.status(401).json({
                    error: 'Authentication required',
                    code: 'NOT_AUTHENTICATED',
                });
            }
            // For now, simple role check (can be expanded)
            const userRole = authReq.user.isAdmin ? 'admin' : 'user';
            if (!allowedRoles.includes(userRole)) {
                await auditService.log({
                    type: 'SECURITY_EVENT',
                    client_id: 'api-auth',
                    action: 'INSUFFICIENT_ROLE',
                    status: 'failure',
                    details: {
                        path: req.path,
                        method: req.method,
                        userAddress: authReq.user.address,
                        userRole,
                        allowedRoles,
                    },
                    ip_address: req.ip || 'unknown',
                    user_agent: req.get('user-agent') || 'unknown',
                });
                return res.status(403).json({
                    error: 'Insufficient role privileges',
                    code: 'INSUFFICIENT_ROLE',
                    required: allowedRoles,
                    current: userRole,
                });
            }
            next();
        };
    };
};
exports.createAuthorizationMiddleware = createAuthorizationMiddleware;
/**
 * Resource Ownership Middleware
 */
const createOwnershipMiddleware = (getResourceOwnerId) => {
    return async (req, res, next) => {
        const authReq = req;
        if (!authReq.user) {
            return res.status(401).json({
                error: 'Authentication required',
                code: 'NOT_AUTHENTICATED',
            });
        }
        try {
            const resourceOwnerId = await getResourceOwnerId(req);
            if (!resourceOwnerId) {
                return res.status(404).json({
                    error: 'Resource not found',
                    code: 'RESOURCE_NOT_FOUND',
                });
            }
            // Allow access if user is admin or owns the resource
            if (!authReq.user.isAdmin && authReq.user.address !== resourceOwnerId) {
                return res.status(403).json({
                    error: 'Access denied - resource ownership required',
                    code: 'RESOURCE_ACCESS_DENIED',
                });
            }
            next();
        }
        catch (error) {
            logger.error('Ownership middleware error', { error });
            return res.status(500).json({
                error: 'Authorization error',
                code: 'OWNERSHIP_CHECK_ERROR',
            });
        }
    };
};
exports.createOwnershipMiddleware = createOwnershipMiddleware;
/**
 * API Rate Limiting per User
 */
const createUserRateLimiter = (auditService) => {
    const userRequestCounts = new Map();
    return (maxRequests, windowMs) => {
        return async (req, res, next) => {
            const authReq = req;
            if (!authReq.user) {
                return next(); // Skip rate limiting for unauthenticated requests
            }
            const userId = authReq.user.address;
            const now = Date.now();
            const windowStart = now - windowMs;
            let userStats = userRequestCounts.get(userId);
            if (!userStats || userStats.resetTime < windowStart) {
                userStats = { count: 0, resetTime: now + windowMs };
                userRequestCounts.set(userId, userStats);
            }
            userStats.count++;
            if (userStats.count > maxRequests) {
                await auditService.log({
                    type: 'SECURITY_EVENT',
                    client_id: 'api-auth',
                    action: 'USER_RATE_LIMIT_EXCEEDED',
                    status: 'failure',
                    details: {
                        path: req.path,
                        method: req.method,
                        userAddress: userId,
                        requestCount: userStats.count,
                        limit: maxRequests,
                    },
                    ip_address: req.ip || 'unknown',
                    user_agent: req.get('user-agent') || 'unknown',
                });
                return res.status(429).json({
                    error: 'User rate limit exceeded',
                    code: 'USER_RATE_LIMIT',
                    limit: maxRequests,
                    windowMs,
                    retryAfter: Math.ceil((userStats.resetTime - now) / 1000),
                });
            }
            next();
        };
    };
};
exports.createUserRateLimiter = createUserRateLimiter;
// Cleanup function for rate limiter
setInterval(() => {
    const now = Date.now();
    // This would need to be implemented in the actual rate limiter
    // userRequestCounts.forEach((stats, userId) => {
    //   if (stats.resetTime < now) {
    //     userRequestCounts.delete(userId);
    //   }
    // });
}, 60000); // Cleanup every minute
//# sourceMappingURL=authenticationMiddleware.js.map