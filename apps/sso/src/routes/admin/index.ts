import { Router, Request, Response } from 'express';
import { createLogger } from '../../utils/logger.js';
import { createRateLimiters } from '../../middleware/rateLimit.js';
import { sanitizeRequest } from '../../middleware/validation.js';
import { monitoringService } from '../../services/monitoringService.js';
import { securityService } from '../../services/securityService.js';
import { backupService } from '../../services/backupService.js';
import { z } from 'zod';

const logger = createLogger('admin-routes');
const router = Router();

// Validation schemas
const backupCreateSchema = z.object({
  type: z.enum(['full', 'database_only']).default('full'),
});

const restoreSchema = z.object({
  backupId: z.string().uuid(),
  restoreDatabase: z.boolean().default(true),
  restoreLogs: z.boolean().default(false),
  restoreConfig: z.boolean().default(false),
  overwriteExisting: z.boolean().default(false),
});

const securityBlockSchema = z.object({
  ip: z.string().regex(/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$|^[0-9a-fA-F:]+$/),
  reason: z.string().min(1),
});

const securityUnblockSchema = z.object({
  ip: z.string().regex(/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$|^[0-9a-fA-F:]+$/),
});

// Initialize services (these would be injected in a real application)
let securityServiceInstance: any = null;
let backupServiceInstance: any = null;

export function initializeAdminServices(security?: any, backup?: any): void {
  securityServiceInstance = security;
  backupServiceInstance = backup;
  logger.info('Admin services initialized');
}

/**
 * GET /api/admin/health
 * Get comprehensive system health status
 */
router.get('/health',
  sanitizeRequest(),
  async (req: Request, res: Response) => {
    try {
      const healthCheck = await monitoringService.performHealthCheck();
      
      logger.info('Admin health check requested', {
        status: healthCheck.status,
        requestId: res.locals.requestId,
      });

      res.json(healthCheck);
    } catch (error) {
      logger.error('Failed to get system health', {
        error: error instanceof Error ? error.message : String(error),
        requestId: res.locals.requestId,
      });

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to get system health',
      });
    }
  }
);

/**
 * GET /api/admin/metrics
 * Get system metrics
 */
router.get('/metrics',
  sanitizeRequest(),
  async (req: Request, res: Response) => {
    try {
      const metrics = await monitoringService.getSystemMetrics();
      
      logger.info('Admin metrics requested', {
        requestId: res.locals.requestId,
      });

      res.json(metrics);
    } catch (error) {
      logger.error('Failed to get system metrics', {
        error: error instanceof Error ? error.message : String(error),
        requestId: res.locals.requestId,
      });

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to get system metrics',
      });
    }
  }
);

/**
 * GET /api/admin/security/events
 * Get security events
 */
router.get('/security/events',
  sanitizeRequest(),
  async (req: Request, res: Response) => {
    try {
      if (!securityServiceInstance) {
        return res.status(503).json({
          error: 'Security service not configured',
          message: 'Security service is not available',
        });
      }

      const limit = parseInt(req.query.limit as string) || 100;
      const severity = req.query.severity as string;
      
      const events = securityServiceInstance.getSecurityEvents(limit, severity);
      
      logger.info('Security events requested', {
        limit,
        severity,
        count: events.length,
        requestId: res.locals.requestId,
      });

      res.json({
        events,
        count: events.length,
        limit,
        severity,
      });
    } catch (error) {
      logger.error('Failed to get security events', {
        error: error instanceof Error ? error.message : String(error),
        requestId: res.locals.requestId,
      });

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to get security events',
      });
    }
  }
);

/**
 * GET /api/admin/security/stats
 * Get security statistics
 */
router.get('/security/stats',
  sanitizeRequest(),
  async (req: Request, res: Response) => {
    try {
      if (!securityServiceInstance) {
        return res.status(503).json({
          error: 'Security service not configured',
          message: 'Security service is not available',
        });
      }

      const stats = securityServiceInstance.getSecurityStats();
      
      logger.info('Security stats requested', {
        requestId: res.locals.requestId,
      });

      res.json(stats);
    } catch (error) {
      logger.error('Failed to get security stats', {
        error: error instanceof Error ? error.message : String(error),
        requestId: res.locals.requestId,
      });

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to get security stats',
      });
    }
  }
);

/**
 * POST /api/admin/security/block
 * Block an IP address
 */
router.post('/security/block',
  sanitizeRequest(),
  async (req: Request, res: Response) => {
    try {
      if (!securityServiceInstance) {
        return res.status(503).json({
          error: 'Security service not configured',
          message: 'Security service is not available',
        });
      }

      const { ip, reason } = securityBlockSchema.parse(req.body);
      
      securityServiceInstance.blockIP(ip, reason);
      
      logger.info('IP blocked manually', {
        ip,
        reason,
        requestId: res.locals.requestId,
      });

      res.json({
        message: 'IP blocked successfully',
        ip,
        reason,
      });
    } catch (error) {
      logger.error('Failed to block IP', {
        error: error instanceof Error ? error.message : String(error),
        requestId: res.locals.requestId,
      });

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Invalid request parameters',
          details: error.errors,
        });
      }

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to block IP',
      });
    }
  }
);

/**
 * POST /api/admin/security/unblock
 * Unblock an IP address
 */
router.post('/security/unblock',
  sanitizeRequest(),
  async (req: Request, res: Response) => {
    try {
      if (!securityServiceInstance) {
        return res.status(503).json({
          error: 'Security service not configured',
          message: 'Security service is not available',
        });
      }

      const { ip } = securityUnblockSchema.parse(req.body);
      
      securityServiceInstance.unblockIP(ip);
      
      logger.info('IP unblocked manually', {
        ip,
        requestId: res.locals.requestId,
      });

      res.json({
        message: 'IP unblocked successfully',
        ip,
      });
    } catch (error) {
      logger.error('Failed to unblock IP', {
        error: error instanceof Error ? error.message : String(error),
        requestId: res.locals.requestId,
      });

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Invalid request parameters',
          details: error.errors,
        });
      }

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to unblock IP',
      });
    }
  }
);

/**
 * GET /api/admin/backups
 * List available backups
 */
router.get('/backups',
  sanitizeRequest(),
  async (req: Request, res: Response) => {
    try {
      if (!backupServiceInstance) {
        return res.status(503).json({
          error: 'Backup service not configured',
          message: 'Backup service is not available',
        });
      }

      const backups = backupServiceInstance.getBackups();
      
      logger.info('Backups list requested', {
        count: backups.length,
        requestId: res.locals.requestId,
      });

      res.json({
        backups,
        count: backups.length,
      });
    } catch (error) {
      logger.error('Failed to list backups', {
        error: error instanceof Error ? error.message : String(error),
        requestId: res.locals.requestId,
      });

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to list backups',
      });
    }
  }
);

/**
 * POST /api/admin/backups
 * Create a new backup
 */
router.post('/backups',
  sanitizeRequest(),
  async (req: Request, res: Response) => {
    try {
      if (!backupServiceInstance) {
        return res.status(503).json({
          error: 'Backup service not configured',
          message: 'Backup service is not available',
        });
      }

      const { type } = backupCreateSchema.parse(req.body);
      
      let backup;
      if (type === 'database_only') {
        backup = await backupServiceInstance.createDatabaseBackup();
      } else {
        backup = await backupServiceInstance.createFullBackup();
      }
      
      logger.info('Backup created', {
        backupId: backup.id,
        type: backup.type,
        size: backup.size,
        requestId: res.locals.requestId,
      });

      res.status(201).json({
        message: 'Backup created successfully',
        backup,
      });
    } catch (error) {
      logger.error('Failed to create backup', {
        error: error instanceof Error ? error.message : String(error),
        requestId: res.locals.requestId,
      });

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Invalid request parameters',
          details: error.errors,
        });
      }

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to create backup',
      });
    }
  }
);

/**
 * POST /api/admin/backups/:backupId/restore
 * Restore from backup
 */
router.post('/backups/:backupId/restore',
  sanitizeRequest(),
  async (req: Request, res: Response) => {
    try {
      if (!backupServiceInstance) {
        return res.status(503).json({
          error: 'Backup service not configured',
          message: 'Backup service is not available',
        });
      }

      const { backupId } = req.params;
      const restoreOptions = restoreSchema.parse({
        backupId,
        ...req.body,
      });
      
      await backupServiceInstance.restoreBackup(restoreOptions);
      
      logger.info('Backup restored', {
        backupId,
        options: restoreOptions,
        requestId: res.locals.requestId,
      });

      res.json({
        message: 'Backup restored successfully',
        backupId,
        options: restoreOptions,
      });
    } catch (error) {
      logger.error('Failed to restore backup', {
        error: error instanceof Error ? error.message : String(error),
        requestId: res.locals.requestId,
      });

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Invalid request parameters',
          details: error.errors,
        });
      }

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to restore backup',
      });
    }
  }
);

/**
 * DELETE /api/admin/backups/:backupId
 * Delete a backup
 */
router.delete('/backups/:backupId',
  sanitizeRequest(),
  async (req: Request, res: Response) => {
    try {
      if (!backupServiceInstance) {
        return res.status(503).json({
          error: 'Backup service not configured',
          message: 'Backup service is not available',
        });
      }

      const { backupId } = req.params;
      
      await backupServiceInstance.deleteBackup(backupId);
      
      logger.info('Backup deleted', {
        backupId,
        requestId: res.locals.requestId,
      });

      res.json({
        message: 'Backup deleted successfully',
        backupId,
      });
    } catch (error) {
      logger.error('Failed to delete backup', {
        error: error instanceof Error ? error.message : String(error),
        requestId: res.locals.requestId,
      });

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to delete backup',
      });
    }
  }
);

/**
 * GET /api/admin/backups/stats
 * Get backup statistics
 */
router.get('/backups/stats',
  sanitizeRequest(),
  async (req: Request, res: Response) => {
    try {
      if (!backupServiceInstance) {
        return res.status(503).json({
          error: 'Backup service not configured',
          message: 'Backup service is not available',
        });
      }

      const stats = backupServiceInstance.getBackupStats();
      
      logger.info('Backup stats requested', {
        requestId: res.locals.requestId,
      });

      res.json(stats);
    } catch (error) {
      logger.error('Failed to get backup stats', {
        error: error instanceof Error ? error.message : String(error),
        requestId: res.locals.requestId,
      });

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to get backup stats',
      });
    }
  }
);

export function createAdminRouter(rateLimiters: ReturnType<typeof createRateLimiters>): Router {
  // Create a new router with rate limiters applied to each route
  const rateLimitedRouter = Router();
  
  // Mount each route with its rate limiter
  rateLimitedRouter.get('/health', rateLimiters.api, sanitizeRequest(), router);
  rateLimitedRouter.get('/metrics', rateLimiters.api, sanitizeRequest(), router);
  rateLimitedRouter.get('/security/events', rateLimiters.api, sanitizeRequest(), router);
  rateLimitedRouter.get('/security/stats', rateLimiters.api, sanitizeRequest(), router);
  rateLimitedRouter.post('/security/block', rateLimiters.api, sanitizeRequest(), router);
  rateLimitedRouter.post('/security/unblock', rateLimiters.api, sanitizeRequest(), router);
  rateLimitedRouter.get('/backups', rateLimiters.api, sanitizeRequest(), router);
  rateLimitedRouter.post('/backups', rateLimiters.api, sanitizeRequest(), router);
  rateLimitedRouter.post('/backups/:backupId/restore', rateLimiters.api, sanitizeRequest(), router);
  rateLimitedRouter.delete('/backups/:backupId', rateLimiters.api, sanitizeRequest(), router);
  rateLimitedRouter.get('/backups/stats', rateLimiters.api, sanitizeRequest(), router);
  
  return rateLimitedRouter;
}
