import { Request, Router } from 'express';
import { Database } from 'sqlite';
import { asyncHandler } from '../middleware/errorHandler.js';
import { createRateLimiters } from '../middleware/rateLimit.js';
import { nonceMiddleware } from '../middleware/security.js';
import { sanitizeRequest, validateBody, validateQuery } from '../middleware/validation.js';
import { AuditService } from '../services/auditService.js';
import { getTelegramAuthService } from '../services/telegramAuthService.js';
import { TokenService } from '../services/token.js';
import { Client } from '../types/auth.js';
import { AuthenticationError, NotFoundError, ValidationError } from '../utils/errors.js';
import { createLogger } from '../utils/logger.js';
import { telegramSchemas } from '../types/telegram.js';
import { generateTelegramWidgetPage } from './auth/templates.js';

const logger = createLogger('telegram-auth-routes');
type RateLimiters = ReturnType<typeof createRateLimiters>;

export const createTelegramAuthRouter = (
  tokenService: TokenService,
  auditService: AuditService,
  clients: Map<string, Client>,
  db: Database,
  rateLimiters: RateLimiters
) => {
  const router = Router();
  const telegramAuthService = getTelegramAuthService();

  // Check if Telegram authentication is enabled
  if (!telegramAuthService.isEnabled()) {
    logger.warn('Telegram authentication is disabled - routes will return 503');
    
    router.use((_req, res) => {
      res.status(503).json({
        error: 'Telegram authentication is not configured',
        message: 'Please configure TELEGRAM_BOT_TOKEN and TELEGRAM_BOT_USERNAME environment variables',
      });
    });
    
    return router;
  }

  /**
   * GET /api/auth/telegram/challenge
   * Generate a Telegram authentication challenge
   */
  router.get(
    '/challenge',
    rateLimiters.challenge,
    sanitizeRequest(),
    nonceMiddleware,
    validateQuery(telegramSchemas.challengeQuery),
    asyncHandler(async (req, res) => {
      const { client_id, state } = req.query;
      const requestId = (req as Request & { requestId?: string }).requestId;

      if (!client_id) {
        throw new ValidationError('Client ID is required', { field: 'client_id' }, requestId);
      }

      const client = clients.get(client_id as string);
      if (!client) {
        throw new AuthenticationError('Invalid client', { client_id }, requestId);
      }

      const challenge = await telegramAuthService.generateChallenge(
        client_id as string,
        state as string
      );

      const botConfig = telegramAuthService.getBotConfig();
      if (!botConfig) {
        throw new Error('Telegram bot configuration not available');
      }

      const html = generateTelegramWidgetPage(
        {
          challengeId: challenge.challenge_id,
          clientId: challenge.client_id,
          botUsername: botConfig.botUsername,
          state: challenge.state,
          codeVerifier: challenge.code_verifier,
          nonce: res.locals.nonce,
        },
        res.locals.nonce
      );

      await auditService.log({
        type: 'AUTH_ATTEMPT',
        user_address: 'telegram:challenge',
        client_id: client_id as string,
        action: 'telegram_challenge_generated',
        status: 'success',
        details: { challenge_id: challenge.challenge_id },
        ip_address: req.ip || 'unknown',
        user_agent: req.get('User-Agent'),
      });

      res.send(html);
    })
  );

  /**
   * GET /api/auth/telegram/status/:challengeId
   * Check the status of a Telegram authentication challenge
   */
  router.get(
    '/status/:challengeId',
    rateLimiters.status,
    sanitizeRequest(),
    asyncHandler(async (req, res) => {
      const { challengeId } = req.params;
      const requestId = (req as Request & { requestId?: string }).requestId;

      if (!challengeId) {
        throw new ValidationError('Challenge ID is required', { field: 'challengeId' }, requestId);
      }

      const challenge = await telegramAuthService.getChallenge(challengeId);
      if (!challenge) {
        throw new NotFoundError('Challenge not found', { challengeId }, requestId);
      }

      const now = Date.now();
      let status: 'pending' | 'completed' | 'expired' | 'used';

      if (challenge.used) {
        status = 'used';
      } else if (now > challenge.expires_at) {
        status = 'expired';
      } else if (challenge.id > 0) {
        status = 'completed';
      } else {
        status = 'pending';
      }

      res.json({
        challenge_id: challenge.challenge_id,
        status,
        expires_at: challenge.expires_at,
        created_at: challenge.created_at,
      });
    })
  );

  /**
   * POST /api/auth/telegram/webapp
   * Authenticate using Telegram Web App (seamless authentication)
   */
  router.post(
    '/webapp',
    rateLimiters.verify,
    sanitizeRequest(),
    validateBody(telegramSchemas.webAppAuthBody),
    asyncHandler(async (req, res) => {
      const { client_id } = req.body;
      const authData = req.body.auth_data;
      const requestId = (req as Request & { requestId?: string }).requestId;

      logger.info('Telegram Web App authentication request received', {
        client_id,
        telegram_id: authData.id,
        username: authData.username,
        requestId,
      });

      // Verify Telegram authentication data
      if (!telegramAuthService.verifyTelegramAuth(authData)) {
        await auditService.log({
          type: 'AUTH_ATTEMPT',
          user_address: `telegram:${authData.id}`,
          client_id,
          action: 'telegram_webapp_verification_failed',
          status: 'failure',
          details: { reason: 'invalid_signature' },
          ip_address: req.ip || 'unknown',
          user_agent: req.get('User-Agent'),
        });

        throw new AuthenticationError('Invalid Telegram authentication data', { client_id }, requestId);
      }

      // Create session
      const session = await telegramAuthService.createSession(
        authData,
        client_id,
        `webapp-${Date.now()}`
      );

      // Generate authorization code
      const authCode = require('crypto').randomBytes(32).toString('hex');
      await db.run(
        `INSERT INTO auth_codes (
         code, address, client_id, created_at, expires_at
       ) VALUES (?, ?, ?, ?, ?)`,
        [authCode, `telegram:${authData.id}`, client_id, Date.now(), Date.now() + 5 * 60 * 1000]
      );

      const client = clients.get(client_id);
      if (!client) {
        throw new AuthenticationError('Invalid client', { client_id }, requestId);
      }

      const redirectUrl = `${client.redirect_uri}?code=${authCode}&state=webapp`;

      await auditService.log({
        type: 'AUTH_SUCCESS',
        user_address: `telegram:${authData.id}`,
        client_id,
        action: 'telegram_webapp_authentication',
        status: 'success',
        details: { 
          telegram_id: authData.id,
          username: authData.username,
          session_id: session.session_id 
        },
        ip_address: req.ip || 'unknown',
        user_agent: req.get('User-Agent'),
      });

      res.json({
        success: true,
        redirectUrl,
        session: {
          sessionId: session.session_id,
          expiresAt: session.expires_at,
        },
        user: {
          id: authData.id,
          username: authData.username,
          firstName: authData.first_name,
          lastName: authData.last_name,
          photoUrl: authData.photo_url,
        },
      });
    })
  );

  /**
   * POST /api/auth/telegram/verify
   * Verify Telegram authentication data and create session
   */
  router.post(
    '/verify',
    rateLimiters.verify,
    sanitizeRequest(),
    validateQuery(telegramSchemas.verificationQuery),
    validateBody(telegramSchemas.verificationBody),
    asyncHandler(async (req, res) => {
      const { challenge_id, code_verifier, state } = req.query;
      const authData = req.body;
      const requestId = (req as Request & { requestId?: string }).requestId;

      logger.info('Telegram verification request received', {
        challenge_id,
        telegram_id: authData.id,
        username: authData.username,
        state,
        requestId,
      });

      // Get and validate challenge
      const challenge = await telegramAuthService.getChallenge(challenge_id as string);
      if (!challenge) {
        throw new NotFoundError('Challenge not found', { challenge_id }, requestId);
      }

      if (challenge.used) {
        throw new ValidationError('Challenge has already been used', { challenge_id }, requestId);
      }

      if (Date.now() > challenge.expires_at) {
        throw new ValidationError('Challenge has expired', { challenge_id }, requestId);
      }

      if (challenge.state !== state) {
        throw new ValidationError('Invalid state parameter', { state }, requestId);
      }

      if (challenge.code_verifier !== code_verifier) {
        throw new ValidationError('Invalid code verifier', { code_verifier }, requestId);
      }

      // Verify Telegram authentication data
      if (!telegramAuthService.verifyTelegramAuth(authData)) {
        await auditService.log({
          type: 'AUTH_ATTEMPT',
          user_address: `telegram:${authData.id}`,
          client_id: challenge.client_id,
          action: 'telegram_verification_failed',
          status: 'failure',
          details: { challenge_id, reason: 'invalid_signature' },
          ip_address: req.ip || 'unknown',
          user_agent: req.get('User-Agent'),
        });

        throw new AuthenticationError('Invalid Telegram authentication data', { challenge_id }, requestId);
      }

      // Mark challenge as used
      await telegramAuthService.markChallengeUsed(challenge_id as string);

      // Create session
      const session = await telegramAuthService.createSession(
        authData,
        challenge.client_id,
        challenge_id as string
      );

      // Generate authorization code
      const authCode = require('crypto').randomBytes(32).toString('hex');
      await db.run(
        `INSERT INTO auth_codes (
         code, address, client_id, created_at, expires_at
       ) VALUES (?, ?, ?, ?, ?)`,
        [authCode, `telegram:${authData.id}`, challenge.client_id, Date.now(), Date.now() + 5 * 60 * 1000]
      );

      const client = clients.get(challenge.client_id);
      if (!client) {
        throw new AuthenticationError('Invalid client', { client_id: challenge.client_id }, requestId);
      }

      await auditService.log({
        type: 'CHALLENGE_VERIFIED',
        user_address: `telegram:${authData.id}`,
        client_id: challenge.client_id,
        action: 'telegram_signature_verified',
        status: 'success',
        details: { challenge_id, telegram_id: authData.id, username: authData.username },
        ip_address: req.ip || 'unknown',
        user_agent: req.get('User-Agent'),
      });

      // Return redirect URL for the callback
      const redirectUrl = `${client.redirect_url}?code=${authCode}&state=${state}`;

      // Check if this is an AJAX request (from the widget)
      if (req.headers.accept?.includes('application/json')) {
        res.json({
          success: true,
          redirectUrl,
        });
      } else {
        // Redirect directly for non-AJAX requests
        res.redirect(redirectUrl);
      }
    })
  );

  /**
   * GET /api/auth/telegram/session
   * Get current Telegram session information
   */
  router.get(
    '/session',
    rateLimiters.status,
    sanitizeRequest(),
    asyncHandler(async (req, res) => {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authorization header required' });
      }

      const token = authHeader.substring(7);
      const verificationResult = await tokenService.verifyToken(token, 'access');

      if (!verificationResult.valid || !verificationResult.session) {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }

      const session = verificationResult.session;
      
      // Extract Telegram ID from address (format: "telegram:123456789")
      const telegramId = parseInt(session.address.replace('telegram:', ''));
      const telegramSession = await telegramAuthService.getSession(telegramId, session.client_id);

      if (!telegramSession) {
        return res.status(404).json({ error: 'Telegram session not found' });
      }

      res.json({
        user: {
          telegram_id: telegramSession.telegram_id,
          username: telegramSession.username,
          first_name: telegramSession.first_name,
          last_name: telegramSession.last_name,
          photo_url: telegramSession.photo_url,
          provider: 'telegram',
        },
        accessToken: token,
        refreshToken: telegramSession.refresh_token,
        expiresAt: new Date(telegramSession.access_token_expires_at).toISOString(),
      });
    })
  );

  /**
   * POST /api/auth/telegram/logout
   * Logout and invalidate Telegram session
   */
  router.post(
    '/logout',
    rateLimiters.logout,
    sanitizeRequest(),
    asyncHandler(async (req, res) => {
      const { access_token } = req.body;

      if (!access_token) {
        return res.status(400).json({ error: 'Access token required' });
      }

      await tokenService.invalidateSession(access_token);

      await auditService.log({
        type: 'SECURITY_EVENT',
        user_address: req.body.telegram_id ? `telegram:${req.body.telegram_id}` : 'unknown',
        client_id: req.body.client_id || 'unknown',
        action: 'telegram_session_invalidated',
        status: 'success',
        details: { access_token: access_token.substring(0, 16) + '...' },
        ip_address: req.ip || 'unknown',
        user_agent: req.get('User-Agent'),
      });

      res.json({ message: 'Logged out successfully' });
    })
  );

  return router;
};
