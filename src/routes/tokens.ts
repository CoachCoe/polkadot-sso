import { NextFunction, Request, Response, Router } from 'express';
import { Database } from 'sqlite';
import { createRateLimiters } from '../middleware/rateLimit';
import { sanitizeRequest } from '../middleware/validation';
import { AuditService } from '../services/auditService';
import { TokenService } from '../services/token';

export const createTokenRouter = (
  tokenService: TokenService,
  db: Database,
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

        if (!refresh_token) {
          res.status(400).json({ error: 'Refresh token required' });
          return;
        }

        const verification = await tokenService.verifyToken(refresh_token, 'refresh');
        if (!verification.valid || !verification.decoded) {
          res.status(401).json({ error: verification.error });
          return;
        }

        const { decoded } = verification;
        if (!decoded) {
          res.status(401).json({ error: 'Invalid token data' });
          return;
        }

        if (!decoded.address || !decoded.client_id) {
          res.status(401).json({ error: 'Invalid token data' });
          return;
        }

        const tokens = tokenService.generateTokens(decoded.address, decoded.client_id);
        const { accessToken, refreshToken, fingerprint, accessJwtid, refreshJwtid } = tokens;

        await db.run(
          `UPDATE sessions SET
            access_token = ?,
            refresh_token = ?,
            access_token_id = ?,
            refresh_token_id = ?,
            fingerprint = ?,
            access_token_expires_at = ?,
            refresh_token_expires_at = ?,
            last_used_at = ?
          WHERE address = ? AND client_id = ?`,
          [
            accessToken,
            refreshToken,
            accessJwtid,
            refreshJwtid,
            fingerprint,
            Date.now() + 15 * 60 * 1000,
            Date.now() + 7 * 24 * 60 * 60 * 1000,
            Date.now(),
            decoded.address,
            decoded.client_id,
          ]
        );

        res.json({
          access_token: accessToken,
          refresh_token: refreshToken,
          fingerprint,
          expires_in: 900,
        });
      } catch (error) {
        next(error);
      }
    }
  );

  return router;
};
