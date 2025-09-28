/**
 * Google OAuth 2.0 Authentication Routes
 */

import { Router, Request, Response, NextFunction } from 'express';
import { Database } from 'sqlite';
import { createLogger } from '../utils/logger.js';
import { getGoogleAuthService } from '../services/googleAuthService.js';
import { AuditService } from '../services/auditService.js';
import { TokenService } from '../services/token.js';
import { Client } from '../types/auth.js';
import { RateLimiters } from '../middleware/rateLimit.js';
import { sanitizeRequest, validateQuery, validateBody } from '../middleware/validation.js';
import { googleSchemas } from '../types/google.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { AuthenticationError, ValidationError, NotFoundError } from '../utils/errors.js';
import { generateGoogleAuthPage } from './auth/templates.js';

const logger = createLogger('google-auth-routes');

export function createGoogleAuthRouter(
  tokenService: TokenService,
  auditService: AuditService,
  clients: Map<string, Client>,
  db: Database,
  rateLimiters: RateLimiters
): Router {
  const router = Router();

  // Initialize Google Auth Service
  let googleAuthService;
  try {
    googleAuthService = getGoogleAuthService();
  } catch (error) {
    logger.error('Failed to initialize Google Auth Service', {
      error: error instanceof Error ? error.message : String(error),
    });
    // Return a router that shows an error for all routes
    router.use((req, res, next) => {
      res.status(503).json({
        error: 'Google OAuth service is not available',
        message: 'Google OAuth configuration is missing or invalid',
      });
    });
    return router;
  }

  /**
   * POST /api/auth/google/challenge
   * Generate Google OAuth challenge and return authorization URL
   */
  router.post(
    '/challenge',
    rateLimiters.challenge,
    sanitizeRequest(),
    validateQuery(googleSchemas.challengeQuery),
    asyncHandler(async (req: Request, res: Response) => {
      const { client_id } = req.query;
      const requestId = (req as Request & { requestId?: string }).requestId;

      // Validate client
      const client = clients.get(client_id as string);
      if (!client) {
        throw new NotFoundError(`Client '${client_id}' not found`, undefined, requestId);
      }

      // Generate challenge
      const challenge = await googleAuthService.generateChallenge(client_id as string, requestId);
      const authUrl = googleAuthService.getAuthorizationUrl(challenge);

      // Log audit event
      await auditService.log({
        type: 'AUTH_ATTEMPT',
        user_address: `google:${challenge.id}`,
        client_id: client_id as string,
        action: 'google_challenge_generated',
        status: 'success',
        details: {
          challenge_id: challenge.id,
          state: challenge.state.substring(0, 8) + '...',
        },
        ip_address: req.ip || 'unknown',
        user_agent: req.get('User-Agent'),
      });

      res.json({
        success: true,
        data: {
          challenge_id: challenge.id,
          auth_url: authUrl,
          expires_at: challenge.expires_at,
          state: challenge.state,
        },
      });
    })
  );

  /**
   * GET /api/auth/google/challenge
   * Generate Google OAuth challenge and return HTML page with redirect
   */
  router.get(
    '/challenge',
    rateLimiters.challenge,
    sanitizeRequest(),
    validateQuery(googleSchemas.challengeQuery),
    asyncHandler(async (req: Request, res: Response) => {
      const { client_id } = req.query;
      const requestId = (req as Request & { requestId?: string }).requestId;

      // Validate client
      const client = clients.get(client_id as string);
      if (!client) {
        throw new NotFoundError(`Client '${client_id}' not found`, undefined, requestId);
      }

      // Generate challenge
      const challenge = await googleAuthService.generateChallenge(client_id as string, requestId);
      const authUrl = googleAuthService.getAuthorizationUrl(challenge);

      // Log audit event
      await auditService.log({
        type: 'AUTH_ATTEMPT',
        user_address: `google:${challenge.id}`,
        client_id: client_id as string,
        action: 'google_challenge_generated',
        status: 'success',
        details: {
          challenge_id: challenge.id,
          state: challenge.state.substring(0, 8) + '...',
        },
        ip_address: req.ip || 'unknown',
        user_agent: req.get('User-Agent'),
      });

      // Return HTML page that redirects to Google OAuth
      res.send(generateGoogleAuthPage(authUrl, client_id as string, res.locals.nonce));
    })
  );

  /**
   * GET /api/auth/google/callback
   * Handle Google OAuth callback
   */
  router.get(
    '/callback',
    rateLimiters.verify,
    sanitizeRequest(),
    validateQuery(googleSchemas.verificationQuery),
    asyncHandler(async (req: Request, res: Response) => {
      const { code, state, client_id } = req.query;
      const requestId = (req as Request & { requestId?: string }).requestId;

      logger.info('Google OAuth callback received', {
        code: (code as string)?.substring(0, 10) + '...',
        state: (state as string)?.substring(0, 8) + '...',
        client_id,
        requestId,
      });

      try {
        // Verify the OAuth callback
        const result = await googleAuthService.verifyCallback(
          {
            code: code as string,
            state: state as string,
            client_id: client_id as string,
          },
          requestId
        );

        if (!result.success || !result.session) {
          throw new AuthenticationError('OAuth verification failed', undefined, requestId);
        }

        // Log successful authentication
        await auditService.log({
          type: 'AUTH_ATTEMPT',
          user_address: `google:${result.session.google_id}`,
          client_id: result.session.client_id,
          action: 'google_oauth_success',
          status: 'success',
          details: {
            google_id: result.session.google_id,
            email: result.session.email,
            name: result.session.name,
          },
          ip_address: req.ip || 'unknown',
          user_agent: req.get('User-Agent'),
        });

        // Redirect to success page or client application
        if (result.redirect_url) {
          res.redirect(result.redirect_url);
        } else {
          res.json({
            success: true,
            message: 'Google OAuth authentication successful',
            session: {
              id: result.session.id,
              google_id: result.session.google_id,
              email: result.session.email,
              name: result.session.name,
              picture: result.session.picture,
            },
          });
        }
      } catch (error) {
        // Log failed authentication
        await auditService.log({
          type: 'AUTH_ATTEMPT',
          user_address: `google:${state}`,
          client_id: client_id as string,
          action: 'google_oauth_callback',
          status: 'failure',
          details: {
            error: error instanceof Error ? error.message : String(error),
            state: (state as string)?.substring(0, 8) + '...',
          },
          ip_address: req.ip || 'unknown',
          user_agent: req.get('User-Agent'),
        });

        throw error;
      }
    })
  );

  /**
   * POST /api/auth/google/verify
   * Alternative verification endpoint for programmatic access
   */
  router.post(
    '/verify',
    rateLimiters.verify,
    sanitizeRequest(),
    validateBody(googleSchemas.verificationBody),
    asyncHandler(async (req: Request, res: Response) => {
      const { code, state, client_id } = req.body;
      const requestId = (req as Request & { requestId?: string }).requestId;

      logger.info('Google OAuth verification request received', {
        code: code?.substring(0, 10) + '...',
        state: state?.substring(0, 8) + '...',
        client_id,
        requestId,
      });

      try {
        // Verify the OAuth callback
        const result = await googleAuthService.verifyCallback(
          { code, state, client_id },
          requestId
        );

        if (!result.success || !result.session) {
          throw new AuthenticationError('OAuth verification failed', undefined, requestId);
        }

        // Log successful authentication
        await auditService.log({
          type: 'AUTH_ATTEMPT',
          user_address: `google:${result.session.google_id}`,
          client_id: result.session.client_id,
          action: 'google_oauth_verify',
          status: 'success',
          details: {
            google_id: result.session.google_id,
            email: result.session.email,
            name: result.session.name,
          },
          ip_address: req.ip || 'unknown',
          user_agent: req.get('User-Agent'),
        });

        res.json({
          success: true,
          data: {
            session: {
              id: result.session.id,
              google_id: result.session.google_id,
              email: result.session.email,
              name: result.session.name,
              picture: result.session.picture,
              access_token: result.session.access_token,
              refresh_token: result.session.refresh_token,
              expires_at: result.session.access_token_expires_at,
            },
            redirect_url: result.redirect_url,
          },
        });
      } catch (error) {
        // Log failed authentication
        await auditService.log({
          type: 'AUTH_ATTEMPT',
          user_address: `google:${state}`,
          client_id,
          action: 'google_oauth_verify',
          status: 'failure',
          details: {
            error: error instanceof Error ? error.message : String(error),
            state: state?.substring(0, 8) + '...',
          },
          ip_address: req.ip || 'unknown',
          user_agent: req.get('User-Agent'),
        });

        throw error;
      }
    })
  );

  /**
   * GET /api/auth/google/status/:challengeId
   * Check the status of a Google OAuth challenge
   */
  router.get(
    '/status/:challengeId',
    rateLimiters.challenge,
    sanitizeRequest(),
    asyncHandler(async (req: Request, res: Response) => {
      const { challengeId } = req.params;
      const requestId = (req as Request & { requestId?: string }).requestId;

      try {
        // Check if challenge exists and is still valid
        const row = await db.get(
          'SELECT * FROM google_challenges WHERE challenge_id = ?',
          [challengeId]
        );

        if (!row) {
          res.json({
            status: 'failed',
            message: 'Challenge not found',
          });
          return;
        }

        const now = Date.now();
        if (row.used) {
          res.json({
            status: 'completed',
            message: 'Authentication completed',
          });
        } else if (now > row.expires_at) {
          res.json({
            status: 'expired',
            message: 'Challenge has expired',
            expiresAt: row.expires_at,
          });
        } else {
          res.json({
            status: 'pending',
            message: 'Authentication in progress',
            expiresAt: row.expires_at,
            challengeId: row.challenge_id,
          });
        }
      } catch (error) {
        logger.error('Failed to check Google OAuth challenge status', {
          error: error instanceof Error ? error.message : String(error),
          challengeId,
          requestId,
        });

        res.json({
          status: 'failed',
          message: 'Failed to check challenge status',
        });
      }
    })
  );

  return router;
}
