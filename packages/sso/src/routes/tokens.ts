import { NextFunction, Request, Response, Router } from 'express';
import { createRateLimiters } from '../middleware/rateLimit';
import { sanitizeRequest } from '../middleware/validation';
import { AuditService } from '../services/auditService';
import { TokenService } from '../services/token';

export const createTokenRouter = (
  tokenService: TokenService,
  auditService: AuditService
): Router => {
  const router = Router();
  const rateLimiters = createRateLimiters(auditService);

  router.post(
    '/refresh',
    rateLimiters.refresh,
    sanitizeRequest(),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const { refresh_token } = req.body;

        if (!refresh_token || typeof refresh_token !== 'string') {
          res.status(400).json({ error: 'Invalid refresh token' });
          return;
        }

        const session = await tokenService.refreshSession(refresh_token);
        if (!session) {
          res.status(401).json({ error: 'Invalid or expired refresh token' });
          return;
        }

        res.json({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          expires_in: 900,
        });
      } catch (error) {
        next(error);
      }
    }
  );

  return router;
};
