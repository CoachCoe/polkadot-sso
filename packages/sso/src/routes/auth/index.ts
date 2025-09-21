import { Router } from 'express';
import { Database } from 'sqlite';
import { createRateLimiters } from '../../middleware/rateLimit.js';
import { nonceMiddleware } from '../../middleware/security.js';
import { sanitizeRequest, validateBody, validateQuery } from '../../middleware/validation.js';
import { AuditService } from '../../services/auditService.js';
import { ChallengeService } from '../../services/challengeService.js';
import { TokenService } from '../../services/token.js';
import { Client } from '../../types/auth.js';
import { createLogger } from '../../utils/logger.js';
import { schemas } from '../../utils/schemas.js';
import { createLoginHandler, createTokenHandler, createVerifyHandler } from './handlers.js';
import { generateApiDocsPage, generateChallengePage } from './templates.js';

type RateLimiters = ReturnType<typeof createRateLimiters>;

export const createAuthRouter = (
  tokenService: TokenService,
  challengeService: ChallengeService,
  auditService: AuditService,
  clients: Map<string, Client>,
  db: Database,
  rateLimiters: RateLimiters
) => {
  const router = Router();
  const logger = createLogger('auth-router');

  const loginHandler = createLoginHandler(
    tokenService,
    challengeService,
    auditService,
    clients,
    db
  );
  const verifyHandler = createVerifyHandler(challengeService, auditService, clients, db);
  const tokenHandler = createTokenHandler(tokenService, auditService, db);

  router.get(
    '/challenge',
    rateLimiters.challenge,
    sanitizeRequest(),
    nonceMiddleware as any,
    validateQuery(schemas.challengeQuery),
    async (req, res) => {
      try {
        const { client_id, address } = req.query;
        const client = clients.get(client_id as string);

        if (!client) {
          return res.status(400).json({ error: 'Invalid client' });
        }

        const challenge = await challengeService.generateChallenge(
          client_id as string,
          address as string
        );

        const html = generateChallengePage(
          {
            address: address as string,
            message: challenge.message,
            challengeId: challenge.id,
            codeVerifier: challenge.code_verifier,
            state: challenge.state,
            nonce: res.locals.nonce,
          },
          res.locals.nonce
        );

        res.send(html);
      } catch (error) {
        res.status(500).json({ error: 'Failed to generate challenge page' });
      }
    }
  );

  router.get('/docs', (req, res) => {
    const html = generateApiDocsPage();
    res.send(html);
  });

  router.get(
    '/status/:challengeId',
    rateLimiters.status,
    sanitizeRequest(),
    async (req, res) => {
      try {
        const { challengeId } = req.params;

        if (!challengeId) {
          return res.status(400).json({
            status: 'error',
            message: 'Challenge ID is required'
          });
        }

        // Get challenge from database
        const challenge = await challengeService.getChallenge(challengeId);

        if (!challenge) {
          return res.status(404).json({
            status: 'not_found',
            message: 'Challenge not found'
          });
        }

        // Check if challenge is expired
        const now = Date.now();
        const expiresAt = new Date(challenge.expires_at).getTime();

        if (now > expiresAt) {
          return res.status(200).json({
            status: 'expired',
            message: 'Challenge has expired',
            expiresAt: challenge.expires_at_timestamp
          });
        }

        // Check if challenge has been used
        if (challenge.used) {
          return res.status(200).json({
            status: 'used',
            message: 'Challenge has already been used',
            expiresAt: challenge.expires_at_timestamp
          });
        }

        // Challenge is valid and pending
        return res.status(200).json({
          status: 'pending',
          message: 'Challenge is pending verification',
          expiresAt: challenge.expires_at_timestamp,
          challengeId: challenge.id
        });

      } catch (error) {
        logger.error('Failed to get challenge status', {
          error: error instanceof Error ? error.message : String(error),
          challengeId: req.params.challengeId,
        });

        res.status(500).json({
          status: 'error',
          message: 'Failed to get challenge status'
        });
      }
    }
  );

  router.get(
    '/login',
    rateLimiters.login,
    sanitizeRequest(),
    validateQuery(schemas.challengeQuery),
    loginHandler
  );

  router.post(
    '/verify',
    rateLimiters.verify,
    sanitizeRequest(),
    validateQuery(schemas.verificationQuery),
    verifyHandler
  );

  router.post(
    '/token',
    rateLimiters.token,
    sanitizeRequest(),
    validateBody(schemas.tokenRequest),
    tokenHandler
  );

  router.get('/callback', (req, res) => {
    const { code, state, error } = req.query;

    if (error) {
      return res.status(400).json({ error: 'Authorization failed', details: error });
    }

    if (!code || !state) {
      return res.status(400).json({ error: 'Missing authorization code or state' });
    }

    res.json({
      message: 'Authorization successful',
      code,
      state,
      next_step: 'Exchange code for tokens using POST /token',
    });
  });

  router.post('/logout', rateLimiters.logout, sanitizeRequest(), async (req, res) => {
    try {
      const { access_token } = req.body;

      if (!access_token) {
        return res.status(400).json({ error: 'Access token required' });
      }

      await tokenService.invalidateSession(access_token);

      await auditService.log({
        type: 'SECURITY_EVENT',
        user_address: req.body.address,
        client_id: req.body.client_id || 'unknown',
        action: 'session_invalidated',
        status: 'success',
        details: { access_token: access_token.substring(0, 16) + '...' },
        ip_address: req.ip || 'unknown',
        user_agent: req.get('User-Agent'),
      });

      res.json({ message: 'Logged out successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Logout failed' });
    }
  });

  return router;
};
