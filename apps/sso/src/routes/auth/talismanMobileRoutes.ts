import { Router, Request, Response } from 'express';
import { TalismanMobileService, TalismanMobileConfig } from '../../services/talismanMobileService.js';
import { createLogger } from '../../utils/logger.js';
import { createRateLimiters } from '../../middleware/rateLimit.js';
import { sanitizeRequest } from '../../middleware/validation.js';
import { z } from 'zod';

const logger = createLogger('talisman-mobile-routes');
const router = Router();

// Validation schemas
const talismanMobileChallengeSchema = z.object({
  provider: z.literal('talisman-mobile'),
  address: z.string().min(1, 'Address is required'),
  client_id: z.string().min(1, 'Client ID is required'),
});

const talismanMobileVerifySchema = z.object({
  challenge_id: z.string().min(1, 'Challenge ID is required'),
  signature: z.string().min(1, 'Signature is required'),
  address: z.string().min(1, 'Address is required'),
});

// Initialize Talisman Mobile Service
let talismanMobileService: TalismanMobileService | null = null;

export function initializeTalismanMobile(config: TalismanMobileConfig, jwtSecret: string): void {
  try {
    talismanMobileService = new TalismanMobileService(config, jwtSecret);
    logger.info('Talisman Mobile service initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize Talisman Mobile service', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * GET /api/auth/mobile/challenge
 * Generate Talisman Mobile challenge
 */
router.get('/challenge',
  sanitizeRequest(),
  async (req: Request, res: Response) => {
    try {
      if (!talismanMobileService) {
        return res.status(503).json({
          error: 'Talisman Mobile service not configured',
          message: 'Talisman Mobile authentication is not available',
        });
      }

      const { provider, address, client_id } = talismanMobileChallengeSchema.parse(req.query);

      // Validate client
      if (client_id !== 'demo-client' && client_id !== 'polkadot-password-manager') {
        return res.status(400).json({
          error: 'Invalid client ID',
          message: 'Client not registered',
        });
      }

      const challenge = talismanMobileService.generateChallenge(address, client_id);

      logger.info('Talisman Mobile challenge generated', {
        challengeId: challenge.challengeId,
        address,
        clientId: client_id,
        requestId: res.locals.requestId,
      });

      res.json({
        challenge_id: challenge.challengeId,
        deep_link_url: challenge.deepLinkUrl,
        qr_code_data: challenge.qrCodeData,
        polling_token: challenge.pollingToken,
        expires_at: challenge.expiresAt,
        provider: 'talisman-mobile',
        client_id,
      });
    } catch (error) {
      logger.error('Failed to generate Talisman Mobile challenge', {
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
        message: 'Failed to generate Talisman Mobile challenge',
      });
    }
  }
);

/**
 * GET /api/auth/mobile/poll/:pollingToken
 * Poll for challenge completion
 */
router.get('/poll/:pollingToken',
  sanitizeRequest(),
  async (req: Request, res: Response) => {
    try {
      if (!talismanMobileService) {
        return res.status(503).json({
          error: 'Talisman Mobile service not configured',
          message: 'Talisman Mobile authentication is not available',
        });
      }

      const { pollingToken } = req.params;
      const challengeId = req.query.challenge_id as string;

      if (!challengeId) {
        return res.status(400).json({
          error: 'Challenge ID is required',
          message: 'Challenge ID must be provided as query parameter',
        });
      }

      const pollResult = talismanMobileService.pollChallenge(challengeId);

      logger.info('Talisman Mobile challenge polled', {
        challengeId,
        status: pollResult.status,
        requestId: res.locals.requestId,
      });

      res.json({
        status: pollResult.status,
        challenge_id: challengeId,
        polling_token: pollingToken,
        ...(pollResult.signature && { signature: pollResult.signature }),
        ...(pollResult.accessToken && { access_token: pollResult.accessToken }),
        ...(pollResult.user && { user: pollResult.user }),
      });
    } catch (error) {
      logger.error('Failed to poll Talisman Mobile challenge', {
        error: error instanceof Error ? error.message : String(error),
        requestId: res.locals.requestId,
      });

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to poll Talisman Mobile challenge',
      });
    }
  }
);

/**
 * POST /api/auth/mobile/verify
 * Verify Talisman Mobile signature
 */
router.post('/verify',
  sanitizeRequest(),
  async (req: Request, res: Response) => {
    try {
      if (!talismanMobileService) {
        return res.status(503).json({
          error: 'Talisman Mobile service not configured',
          message: 'Talisman Mobile authentication is not available',
        });
      }

      const { challenge_id, signature, address } = talismanMobileVerifySchema.parse(req.body);

      const authResponse = await talismanMobileService.verifySignature(
        challenge_id,
        signature,
        address
      );

      logger.info('Talisman Mobile verification completed successfully', {
        challengeId: challenge_id,
        address,
        requestId: res.locals.requestId,
      });

      res.json({
        access_token: authResponse.accessToken,
        refresh_token: authResponse.refreshToken,
        expires_in: authResponse.expiresIn,
        user: authResponse.user,
        provider: 'talisman-mobile',
        challenge_id,
      });
    } catch (error) {
      logger.error('Failed to verify Talisman Mobile signature', {
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
        message: 'Failed to verify Talisman Mobile signature',
      });
    }
  }
);

/**
 * GET /api/auth/mobile/qr/:challengeId
 * Generate QR code for challenge
 */
router.get('/qr/:challengeId',
  sanitizeRequest(),
  async (req: Request, res: Response) => {
    try {
      if (!talismanMobileService) {
        return res.status(503).json({
          error: 'Talisman Mobile service not configured',
          message: 'Talisman Mobile authentication is not available',
        });
      }

      const { challengeId } = req.params;
      const challenge = talismanMobileService.getChallenge(challengeId);

      if (!challenge) {
        return res.status(404).json({
          error: 'Challenge not found',
          message: 'Challenge not found or expired',
        });
      }

      const qrCodeSvg = await talismanMobileService.generateQRCode(challenge.qrCodeData);

      logger.info('Talisman Mobile QR code generated', {
        challengeId,
        requestId: res.locals.requestId,
      });

      res.setHeader('Content-Type', 'image/svg+xml');
      res.send(qrCodeSvg);
    } catch (error) {
      logger.error('Failed to generate Talisman Mobile QR code', {
        error: error instanceof Error ? error.message : String(error),
        requestId: res.locals.requestId,
      });

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to generate QR code',
      });
    }
  }
);

export function createTalismanMobileRouter(rateLimiters: ReturnType<typeof createRateLimiters>): Router {
  // Create a new router with rate limiters applied
  const rateLimitedRouter = Router();
  
  // Apply rate limiters to each route by wrapping the existing router
  rateLimitedRouter.use('/challenge', rateLimiters.challenge, router);
  rateLimitedRouter.use('/poll/:pollingToken', rateLimiters.status, router);
  rateLimitedRouter.use('/verify', rateLimiters.verify, router);
  rateLimitedRouter.use('/qr/:challengeId', rateLimiters.challenge, router);
  
  return rateLimitedRouter;
}
