import { Request, Router } from 'express';
import { Database } from 'sqlite';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { createRateLimiters } from '../../middleware/rateLimit.js';
import { nonceMiddleware } from '../../middleware/security.js';
import { sanitizeRequest, validateBody, validateQuery } from '../../middleware/validation.js';
import { AuditService } from '../../services/auditService.js';
import { ChallengeService } from '../../services/challengeService.js';
import { TokenService } from '../../services/token.js';
import { Client } from '../../types/auth.js';
import { AuthenticationError, NotFoundError, ValidationError } from '../../utils/errors.js';
// import { createLogger } from '../../utils/logger.js';
import { schemas } from '../../utils/schemas.js';
import { createLoginHandler, createTokenHandler, createVerifyHandler } from './handlers.js';
import { generateApiDocsPage, generateChallengePage } from './templates.js';
import { createGoogleRouter, initializeGoogleAuth } from './googleRoutes.js';
import { generateGoogleChallengePage } from './googleTemplate.js';
import { createPapiRouter, initializePapi } from './papiRoutes.js';

type RateLimiters = ReturnType<typeof createRateLimiters>;

export const createAuthRouter = (
  tokenService: TokenService,
  challengeService: ChallengeService,
  auditService: AuditService,
  clients: Map<string, Client>,
  db: Database,
  rateLimiters: RateLimiters,
  jwtSecret: string
) => {
  const router = Router();
  // const logger = createLogger('auth-router');

  // Initialize Google OAuth2 if configured
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const googleRedirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/auth/google/callback';

  if (googleClientId && googleClientSecret) {
    try {
      initializeGoogleAuth({
        clientId: googleClientId,
        clientSecret: googleClientSecret,
        redirectUri: googleRedirectUri,
        scopes: ['openid', 'email', 'profile'],
      }, jwtSecret);
      
      // Mount Google OAuth2 routes
      router.use('/google', createGoogleRouter(rateLimiters));
    } catch (error) {
      // Google OAuth2 initialization failed - service will be unavailable
    }
  }


  // Initialize PAPI if configured
  const papiPolkadotRpc = process.env.PAPI_POLKADOT_RPC || 'wss://polkadot-rpc.polkadot.io';
  const papiKusamaRpc = process.env.PAPI_KUSAMA_RPC || 'wss://kusama-rpc.polkadot.io';
  const papiLightClientEnabled = process.env.PAPI_LIGHT_CLIENT_ENABLED === 'true';
  const papiFallbackToPolkadotJs = process.env.PAPI_FALLBACK_TO_POLKADOT_JS !== 'false';
  const papiPreferredMethod = (process.env.PAPI_PREFERRED_METHOD as 'papi' | 'polkadot-js') || 'papi';

  try {
    initializePapi({
      papi: {
        polkadotRpc: papiPolkadotRpc,
        kusamaRpc: papiKusamaRpc,
        lightClientEnabled: papiLightClientEnabled,
        fallbackToPolkadotJs: papiFallbackToPolkadotJs,
        typeDescriptors: {
          polkadot: '',
          kusama: '',
        },
      },
      fallbackToPolkadotJs: papiFallbackToPolkadotJs,
      preferredMethod: papiPreferredMethod,
    });
    
    // Mount PAPI routes
    router.use('/papi', createPapiRouter(rateLimiters));
  } catch (error) {
    // PAPI initialization failed - service will be unavailable
  }

  const loginHandler = createLoginHandler(
    tokenService,
    challengeService,
    auditService,
    clients,
    db
  );
  const verifyHandler = createVerifyHandler(challengeService, auditService, clients, db);
  const tokenHandler = createTokenHandler(tokenService, auditService, db, clients);

  router.get(
    '/challenge',
    rateLimiters.challenge,
    sanitizeRequest(),
    nonceMiddleware,
    validateQuery(schemas.challengeQuery),
    asyncHandler(async (req, res) => {
      const { client_id, address, wallet } = req.query;
      const requestId = (req as Request & { requestId?: string }).requestId;

      if (!client_id) {
        throw new ValidationError('Client ID is required', { field: 'client_id' }, requestId);
      }

      const client = clients.get(client_id as string);
      if (!client) {
        throw new AuthenticationError('Invalid client', { client_id }, requestId);
      }

      // Handle Google OAuth2 challenge
      if (wallet === 'google') {
        if (!googleClientId || !googleClientSecret) {
          throw new AuthenticationError('Google OAuth2 not configured', { client_id }, requestId);
        }

        // Redirect to Google OAuth2 challenge endpoint
        return res.redirect(`/api/auth/google/challenge?client_id=${client_id}`);
      }


      // Handle Polkadot.js Extension challenge
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
    })
  );

  router.get('/docs', (_req, res) => {
    const html = generateApiDocsPage();
    res.send(html);
  });

  // Google OAuth2 challenge page route
  router.get('/google-challenge', 
    rateLimiters.challenge,
    sanitizeRequest(),
    nonceMiddleware,
    asyncHandler(async (req, res) => {
      const { client_id } = req.query;
      const requestId = (req as Request & { requestId?: string }).requestId;

      if (!client_id) {
        throw new ValidationError('Client ID is required', { field: 'client_id' }, requestId);
      }

      if (!googleClientId || !googleClientSecret) {
        throw new AuthenticationError('Google OAuth2 not configured', { client_id }, requestId);
      }

      // Generate Google OAuth2 challenge
      const { GoogleAuthService } = await import('../../services/googleAuthService.js');
      const googleAuth = new GoogleAuthService({
        clientId: googleClientId,
        clientSecret: googleClientSecret,
        redirectUri: googleRedirectUri,
        scopes: ['openid', 'email', 'profile'],
      }, jwtSecret);

      const challenge = googleAuth.generateChallenge();

      const html = generateGoogleChallengePage({
        challengeId: challenge.challengeId,
        authUrl: challenge.authUrl,
        state: challenge.state,
        nonce: challenge.nonce,
        expiresAt: challenge.expiresAt,
        clientId: client_id as string,
        nonce: res.locals.nonce,
      });

      res.send(html);
    })
  );


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

      // Get challenge from database
      const challenge = await challengeService.getChallenge(challengeId);

      if (!challenge) {
        throw new NotFoundError('Challenge not found', { challengeId }, requestId);
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
    })
  );

  router.get(
    '/login',
    rateLimiters.login,
    sanitizeRequest(),
    validateQuery(schemas.challengeQuery),
    loginHandler
  );

  router.get(
    '/verify',
    rateLimiters.verify,
    sanitizeRequest(),
    validateQuery(schemas.verificationQuery),
    verifyHandler
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

  router.post(
    '/refresh',
    rateLimiters.refresh,
    sanitizeRequest(),
    validateBody(schemas.refreshRequest),
    async (req, res) => {
      try {
        const { refresh_token } = req.body;

        if (!refresh_token || typeof refresh_token !== 'string') {
          return res.status(400).json({ error: 'Invalid refresh token' });
        }

        const session = await tokenService.refreshSession(refresh_token);
        if (!session) {
          return res.status(401).json({ error: 'Invalid or expired refresh token' });
        }

        await auditService.log({
          type: 'TOKEN_REFRESH',
          user_address: session.address,
          client_id: session.client_id,
          action: 'token_refreshed',
          status: 'success',
          details: { sessionId: session.id },
          ip_address: req.ip || 'unknown',
          user_agent: req.get('User-Agent'),
        });

        return res.json({
          access_token: session.access_token,
          token_type: 'Bearer',
          expires_in: 900, // 15 minutes
          refresh_token: session.refresh_token,
        });
      } catch (error) {
        logger.error('Failed to refresh token', {
          error: error instanceof Error ? error.message : String(error),
          requestId: res.locals.requestId,
        });

        return res.status(500).json({ error: 'Failed to refresh token' });
      }
    }
  );

  router.get('/callback', (req, res) => {
    const { code, state, error } = req.query;

    if (error) {
      return res.status(400).json({ error: 'Authorization failed', details: error });
    }

    if (!code || !state) {
      return res.status(400).json({ error: 'Missing authorization code or state' });
    }

    return res.json({
      message: 'Authorization successful',
      code,
      state,
      next_step: 'Exchange code for tokens using POST /token',
    });
  });

  router.get('/session', rateLimiters.status, sanitizeRequest(), async (req, res) => {
    try {
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

      return res.json({
        user: {
          address: session.address,
          chain: 'westend', // You might want to store this in the session
          wallet: 'polkadot-js', // You might want to store this in the session
        },
        accessToken: token,
        refreshToken: session.refresh_token,
        expiresAt: new Date(session.access_token_expires_at).toISOString(),
      });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to get session' });
    }
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

      return res.json({ message: 'Logged out successfully' });
    } catch (error) {
      return res.status(500).json({ error: 'Logout failed' });
    }
  });

  return router;
};
