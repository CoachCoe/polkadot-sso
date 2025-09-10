import { createTelegramProvider, TelegramProvider } from '@polkadot-auth/telegram';
import { Request, Response, Router } from 'express';
import { AuditService } from '../../services/auditService';
import { ChallengeService } from '../../services/challengeService';
import { TokenService } from '../../services/token';

const router = Router();

// Initialize Telegram provider (in production, this would be configured properly)
let telegramProvider: TelegramProvider | null = null;

/**
 * Initialize Telegram provider
 */
function getTelegramProvider(): TelegramProvider {
  if (!telegramProvider) {
    telegramProvider = createTelegramProvider({
      botToken: process.env.TELEGRAM_BOT_TOKEN || 'mock_token',
      botUsername: process.env.TELEGRAM_BOT_USERNAME || 'mock_bot',
      ssoServerUrl: process.env.SSO_SERVER_URL || 'http://localhost:3001',
      autoCreateWallet: true,
    });
  }
  return telegramProvider;
}

/**
 * POST /auth/telegram/challenge
 * Create a new Telegram authentication challenge
 */
router.post('/challenge', async (req: Request, res: Response) => {
  try {
    const { message, client_id } = req.body;

    if (!message || !client_id) {
      return res.status(400).json({
        error: 'Missing required fields: message, client_id',
        code: 'MISSING_FIELDS',
      });
    }

    // Create challenge using existing service
    const challengeService = new ChallengeService();
    const challenge = await challengeService.generateChallenge(client_id);

    // Generate QR code for Telegram
    const telegramProvider = getTelegramProvider();
    const qrData = await telegramProvider.generateQRCode(challenge.id, message);

    // Log audit event
    const auditService = new AuditService();
    await auditService.log({
      type: 'CHALLENGE_CREATED',
      client_id,
      action: 'challenge_created',
      status: 'success',
      details: {
        challengeId: challenge.id,
        provider: 'telegram',
      },
      user_address: '',
      ip_address: req.ip || 'unknown',
      user_agent: req.get('User-Agent') || 'unknown',
    });

    res.json({
      success: true,
      challenge: {
        id: challenge.id,
        message: challenge.message,
        expiresAt: challenge.expires_at,
      },
      qrCode: qrData.qrCode,
      deepLink: qrData.deepLink,
      expiresAt: qrData.expiresAt,
    });
  } catch (error) {
    console.error('Telegram challenge creation failed:', error);
    res.status(500).json({
      error: 'Failed to create Telegram challenge',
      code: 'CHALLENGE_CREATION_FAILED',
    });
  }
});

/**
 * GET /auth/telegram/status/:challengeId
 * Check authentication status for a challenge
 */
router.get('/status/:challengeId', async (req: Request, res: Response) => {
  try {
    const { challengeId } = req.params;

    if (!challengeId) {
      return res.status(400).json({
        error: 'Missing challenge ID',
        code: 'MISSING_CHALLENGE_ID',
      });
    }

    const telegramProvider = getTelegramProvider();
    const challenge = await telegramProvider.checkAuthStatus(challengeId);

    if (!challenge) {
      return res.status(404).json({
        error: 'Challenge not found',
        code: 'CHALLENGE_NOT_FOUND',
      });
    }

    res.json({
      success: true,
      challenge: {
        id: challenge.id,
        status: challenge.status,
        userId: challenge.userId,
        walletAddress: challenge.walletAddress,
        expiresAt: challenge.expiresAt,
        createdAt: challenge.createdAt,
      },
    });
  } catch (error) {
    console.error('Telegram status check failed:', error);
    res.status(500).json({
      error: 'Failed to check authentication status',
      code: 'STATUS_CHECK_FAILED',
    });
  }
});

/**
 * POST /auth/telegram/verify
 * Verify Telegram authentication signature
 */
router.post('/verify', async (req: Request, res: Response) => {
  try {
    const { challengeId, userId, walletAddress, signature, client_id } = req.body;

    if (!challengeId || !userId || !walletAddress || !signature || !client_id) {
      return res.status(400).json({
        error: 'Missing required fields: challengeId, userId, walletAddress, signature, client_id',
        code: 'MISSING_FIELDS',
      });
    }

    const telegramProvider = getTelegramProvider();

    // Verify signature
    const isValid = await telegramProvider.verifySignature(userId, req.body.message, signature);

    if (!isValid) {
      const auditService = new AuditService();
      await auditService.log({
        type: 'SECURITY_EVENT',
        client_id,
        action: 'verification_failed',
        status: 'failure',
        details: {
          challengeId,
          userId,
          reason: 'Invalid signature',
        },
        user_address: walletAddress || '',
        ip_address: req.ip || 'unknown',
        user_agent: req.get('User-Agent') || 'unknown',
      });

      return res.status(400).json({
        error: 'Invalid signature',
        code: 'INVALID_SIGNATURE',
      });
    }

    // Complete authentication
    const success = await telegramProvider.completeAuthentication(
      challengeId,
      userId,
      walletAddress,
      signature
    );

    if (!success) {
      return res.status(400).json({
        error: 'Failed to complete authentication',
        code: 'AUTHENTICATION_FAILED',
      });
    }

    // Create session using existing token service
    const tokenService = new TokenService();
    const session = await tokenService.createSession(walletAddress, client_id);

    // Log successful authentication
    const auditService = new AuditService();
    await auditService.log({
      type: 'CHALLENGE_VERIFIED',
      client_id,
      action: 'authentication_success',
      status: 'success',
      details: {
        challengeId,
        userId,
        walletAddress,
        provider: 'telegram',
      },
      user_address: walletAddress,
      ip_address: req.ip || 'unknown',
      user_agent: req.get('User-Agent') || 'unknown',
    });

    if (!session) {
      return res.status(500).json({
        error: 'Failed to create session',
        code: 'SESSION_CREATION_FAILED',
      });
    }

    res.json({
      success: true,
      session: {
        id: session.id,
        address: session.address,
        client_id: session.client_id,
        expiresAt: new Date(session.access_token_expires_at).toISOString(),
      },
      user: {
        id: userId,
        address: walletAddress,
        provider: 'telegram',
      },
    });
  } catch (error) {
    console.error('Telegram verification failed:', error);
    res.status(500).json({
      error: 'Failed to verify Telegram authentication',
      code: 'VERIFICATION_FAILED',
    });
  }
});

/**
 * POST /auth/telegram/callback
 * Handle Telegram bot callbacks
 */
router.post('/callback', async (req: Request, res: Response) => {
  try {
    const { challengeId, userId, action, data } = req.body;

    if (!challengeId || !userId || !action) {
      return res.status(400).json({
        error: 'Missing required fields: challengeId, userId, action',
        code: 'MISSING_FIELDS',
      });
    }

    const telegramProvider = getTelegramProvider();

    switch (action) {
      case 'approve':
        // User approved authentication
        if (data?.walletAddress && data?.signature) {
          await telegramProvider.completeAuthentication(
            challengeId,
            userId,
            data.walletAddress,
            data.signature
          );
        }
        break;

      case 'reject':
        // User rejected authentication
        await telegramProvider.failAuthentication(challengeId, 'User rejected authentication');
        break;

      case 'expire':
        // Challenge expired
        await telegramProvider.failAuthentication(challengeId, 'Challenge expired');
        break;

      default:
        return res.status(400).json({
          error: 'Invalid action',
          code: 'INVALID_ACTION',
        });
    }

    res.json({
      success: true,
      message: 'Callback processed successfully',
    });
  } catch (error) {
    console.error('Telegram callback failed:', error);
    res.status(500).json({
      error: 'Failed to process Telegram callback',
      code: 'CALLBACK_FAILED',
    });
  }
});

/**
 * GET /auth/telegram/stats
 * Get Telegram provider statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const telegramProvider = getTelegramProvider();
    const stats = telegramProvider.getStats();

    res.json({
      success: true,
      stats: {
        isRunning: stats.isRunning,
        totalWallets: stats.totalWallets,
        activeChallenges: stats.activeChallenges,
        challengeStats: stats.challengeStats,
      },
    });
  } catch (error) {
    console.error('Telegram stats failed:', error);
    res.status(500).json({
      error: 'Failed to get Telegram statistics',
      code: 'STATS_FAILED',
    });
  }
});

export default router;
