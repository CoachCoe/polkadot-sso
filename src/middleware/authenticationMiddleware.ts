import { NextFunction, Request, Response } from 'express';
import { AuditService, TokenService } from '../modules';
import { createLogger } from '../utils/logger';
const logger = createLogger('auth-middleware');
export interface AuthenticatedRequest extends Request {
  user?: {
    address: string;
    sessionId?: string;
    permissions?: string[];
    isAdmin?: boolean;
  };
}
export interface AuthOptions {
  required?: boolean;
  adminOnly?: boolean;
  permissions?: string[];
  allowedRoles?: string[];
}
export const createAuthenticationMiddleware = (
  tokenService: TokenService,
  auditService: AuditService
) => {
  return (options: AuthOptions = {}) => {
    return async (req: Request, res: Response, next: NextFunction) => {
      const authReq = req as AuthenticatedRequest;
      try {
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
        authReq.user = {
          address: tokenData.decoded?.address || '',
          sessionId: tokenData.session?.id || '',
          permissions: [],
          isAdmin: false,
        };
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
        if (options.permissions && options.permissions.length > 0) {
          const hasPermission = options.permissions.some(permission =>
            authReq.user!.permissions!.includes(permission)
          );
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
        return next();
      } catch (error) {
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
export const createAuthorizationMiddleware = (auditService: AuditService) => {
  return (allowedRoles: string[]) => {
    return async (req: Request, res: Response, next: NextFunction) => {
      const authReq = req as AuthenticatedRequest;
      if (!authReq.user) {
        return res.status(401).json({
          error: 'Authentication required',
          code: 'NOT_AUTHENTICATED',
        });
      }
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
      return next();
    };
  };
};
export const createOwnershipMiddleware = (
  getResourceOwnerId: (req: Request) => Promise<string | null>
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthenticatedRequest;
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
      if (!authReq.user.isAdmin && authReq.user.address !== resourceOwnerId) {
        return res.status(403).json({
          error: 'Access denied - resource ownership required',
          code: 'RESOURCE_ACCESS_DENIED',
        });
      }
      return next();
    } catch (error) {
      logger.error('Ownership middleware error', { error });
      return res.status(500).json({
        error: 'Authorization error',
        code: 'OWNERSHIP_CHECK_ERROR',
      });
    }
  };
};
export const createUserRateLimiter = (auditService: AuditService) => {
  const userRequestCounts = new Map<string, { count: number; resetTime: number }>();
  return (maxRequests: number, windowMs: number) => {
    return async (req: Request, res: Response, next: NextFunction) => {
      const authReq = req as AuthenticatedRequest;
      if (!authReq.user) {
        return next();
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
      return next();
    };
  };
};
setInterval(() => {}, 60000);
