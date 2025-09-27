import { Router, Request, Response } from 'express';
import { GoogleAuthService, GoogleAuthConfig } from '../../services/googleAuthService.js';
import { createLogger } from '../../utils/logger.js';
import { createRateLimiters } from '../../middleware/rateLimit.js';
import { sanitizeRequest } from '../../middleware/validation.js';
import { z } from 'zod';

const logger = createLogger('google-routes');
const router = Router();

// Validation schemas
const googleChallengeSchema = z.object({
  client_id: z.string().min(1, 'Client ID is required'),
});

const googleCallbackSchema = z.object({
  code: z.string().min(1, 'Authorization code is required'),
  state: z.string().min(1, 'State parameter is required'),
});

const googleVerifySchema = z.object({
  authorization_code: z.string().min(1, 'Authorization code is required'),
  state: z.string().min(1, 'State parameter is required'),
  challenge_id: z.string().min(1, 'Challenge ID is required'),
});

// Initialize Google Auth Service
let googleAuthService: GoogleAuthService | null = null;

export function initializeGoogleAuth(config: GoogleAuthConfig, jwtSecret: string): void {
  try {
    googleAuthService = new GoogleAuthService(config, jwtSecret);
    logger.info('Google OAuth2 service initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize Google OAuth2 service', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * GET /api/auth/google/challenge
 * Generate Google OAuth2 challenge
 */
router.get('/challenge', 
  sanitizeRequest(),
  async (req: Request, res: Response) => {
    try {
      if (!googleAuthService) {
        return res.status(503).json({
          error: 'Google OAuth2 service not configured',
          message: 'Google authentication is not available',
        });
      }

      const { client_id } = googleChallengeSchema.parse(req.query);

      // Validate client
      if (client_id !== 'demo-client' && client_id !== 'polkadot-password-manager') {
        return res.status(400).json({
          error: 'Invalid client ID',
          message: 'Client not registered',
        });
      }

      const challenge = googleAuthService.generateChallenge();

      logger.info('Google OAuth2 challenge generated', {
        challengeId: challenge.challengeId,
        clientId: client_id,
        requestId: res.locals.requestId,
      });

      res.json({
        challenge_id: challenge.challengeId,
        auth_url: challenge.authUrl,
        state: challenge.state,
        nonce: challenge.nonce,
        expires_at: challenge.expiresAt,
        provider: 'google',
        client_id,
      });
    } catch (error) {
      logger.error('Failed to generate Google OAuth2 challenge', {
        error: error instanceof Error ? error.message : String(error),
        requestId: res.locals.requestId,
      });

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Invalid request parameters',
          details: error.issues,
        });
      }

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to generate Google OAuth2 challenge',
      });
    }
  }
);

/**
 * GET /api/auth/google/callback
 * Handle Google OAuth2 callback
 */
router.get('/callback',
  sanitizeRequest(),
  async (req: Request, res: Response) => {
    try {
      if (!googleAuthService) {
        return res.status(503).json({
          error: 'Google OAuth2 service not configured',
          message: 'Google authentication is not available',
        });
      }

      const { code, state } = googleCallbackSchema.parse(req.query);

      // Extract challenge ID from state
      const [challengeId] = state.split(':');
      if (!challengeId) {
        return res.status(400).json({
          error: 'Invalid state parameter',
          message: 'State parameter must contain challenge ID',
        });
      }

      const authResponse = await googleAuthService.exchangeCodeForTokens(
        code,
        state,
        challengeId
      );

      // Generate JWT token
      const jwtToken = googleAuthService.generateJWT(
        authResponse.user,
        state.split(':')[2] || 'unknown'
      );

      logger.info('Google OAuth2 callback processed successfully', {
        challengeId,
        userId: authResponse.user.id,
        email: authResponse.user.email,
        requestId: res.locals.requestId,
      });

      res.json({
        access_token: jwtToken,
        refresh_token: authResponse.refreshToken,
        expires_in: authResponse.expiresIn,
        user: {
          id: authResponse.user.id,
          email: authResponse.user.email,
          name: authResponse.user.name,
          picture: authResponse.user.picture,
          verified: authResponse.user.verified_email,
        },
        provider: 'google',
        challenge_id: challengeId,
      });
    } catch (error) {
      logger.error('Failed to process Google OAuth2 callback', {
        error: error instanceof Error ? error.message : String(error),
        requestId: res.locals.requestId,
      });

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Invalid request parameters',
          details: error.issues,
        });
      }

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to process Google OAuth2 callback',
      });
    }
  }
);

/**
 * POST /api/auth/google/verify
 * Verify Google OAuth2 authorization code
 */
router.post('/verify',
  sanitizeRequest(),
  async (req: Request, res: Response) => {
    try {
      if (!googleAuthService) {
        return res.status(503).json({
          error: 'Google OAuth2 service not configured',
          message: 'Google authentication is not available',
        });
      }

      const { authorization_code, state, challenge_id } = googleVerifySchema.parse(req.body);

      const authResponse = await googleAuthService.exchangeCodeForTokens(
        authorization_code,
        state,
        challenge_id
      );

      // Generate JWT token
      const jwtToken = googleAuthService.generateJWT(
        authResponse.user,
        state.split(':')[2] || 'unknown'
      );

      logger.info('Google OAuth2 verification completed successfully', {
        challengeId: challenge_id,
        userId: authResponse.user.id,
        email: authResponse.user.email,
        requestId: res.locals.requestId,
      });

      res.json({
        access_token: jwtToken,
        refresh_token: authResponse.refreshToken,
        expires_in: authResponse.expiresIn,
        user: {
          id: authResponse.user.id,
          email: authResponse.user.email,
          name: authResponse.user.name,
          picture: authResponse.user.picture,
          verified: authResponse.user.verified_email,
        },
        provider: 'google',
        challenge_id,
      });
    } catch (error) {
      logger.error('Failed to verify Google OAuth2 authorization code', {
        error: error instanceof Error ? error.message : String(error),
        requestId: res.locals.requestId,
      });

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Invalid request parameters',
          details: error.issues,
        });
      }

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to verify Google OAuth2 authorization code',
      });
    }
  }
);

export function createGoogleRouter(rateLimiters: ReturnType<typeof createRateLimiters>): Router {
  // Create a new router with rate limiters applied
  const rateLimitedRouter = Router();
  
  // Apply rate limiters to each route by wrapping the existing router
  rateLimitedRouter.use('/challenge', rateLimiters.challenge, router);
  rateLimitedRouter.use('/callback', rateLimiters.api, router);
  rateLimitedRouter.use('/verify', rateLimiters.verify, router);
  
  return rateLimitedRouter;
}
