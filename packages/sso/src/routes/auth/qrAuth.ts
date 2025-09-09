import { AuthService } from '@polkadot-auth/core';
import { Request, Response } from 'express';
import { z } from 'zod';
import { AuditService } from '../../services/auditService';
import { ChallengeService } from '../../services/challengeService';
import { TokenService } from '../../services/token';

// In-memory store for QR authentication sessions
// In production, this should be stored in Redis or a database
const qrAuthSessions = new Map<
  string,
  {
    challengeId: string;
    address: string;
    message: string;
    createdAt: number;
    expiresAt: number;
    completed: boolean;
    signature?: string;
  }
>();

// Cleanup expired sessions every 5 minutes
setInterval(
  () => {
    const now = Date.now();
    for (const [challengeId, session] of qrAuthSessions.entries()) {
      if (now > session.expiresAt) {
        qrAuthSessions.delete(challengeId);
      }
    }
  },
  5 * 60 * 1000
);

const qrAuthRequestSchema = z.object({
  address: z.string().min(1, 'Address is required'),
  client_id: z.string().min(1, 'Client ID is required'),
});

const qrCallbackSchema = z.object({
  challenge_id: z.string().min(1, 'Challenge ID is required'),
  signature: z.string().min(1, 'Signature is required'),
  address: z.string().min(1, 'Address is required'),
});

/**
 * Generate QR code authentication data
 */
export async function generateQrAuth(req: Request, res: Response): Promise<void> {
  try {
    const { address, client_id } = qrAuthRequestSchema.parse(req.body);

    // Create a challenge
    const challengeService = new ChallengeService();
    const challenge = await challengeService.generateChallenge(client_id, address);

    // Create QR authentication session
    const qrSession = {
      challengeId: challenge.id,
      address,
      message: challenge.message,
      createdAt: Date.now(),
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
      completed: false,
    };

    qrAuthSessions.set(challenge.id, qrSession);

    // Log the QR authentication initiation
    const auditService = new AuditService();
    await auditService.log({
      type: 'CHALLENGE_CREATED',
      client_id: client_id,
      user_address: address,
      action: 'qr_auth_initiated',
      status: 'success',
      details: {
        challengeId: challenge.id,
        method: 'qr_code',
      },
      ip_address: req.ip || 'unknown',
      user_agent: req.get('User-Agent'),
      created_at: Date.now(),
    });

    res.json({
      success: true,
      data: {
        challengeId: challenge.id,
        message: challenge.message,
        address,
        expiresAt: qrSession.expiresAt,
        qrData: {
          challengeId: challenge.id,
          message: challenge.message,
          address,
          deepLink: `nova://auth?challenge_id=${challenge.id}&message=${encodeURIComponent(challenge.message)}&address=${address}`,
        },
      },
    });
  } catch (error) {
    console.error('QR auth generation error:', error);

    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: error.errors,
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'QR_AUTH_GENERATION_FAILED',
      message: 'Failed to generate QR authentication data',
    });
  }
}

/**
 * Check QR authentication status
 */
export async function checkQrAuthStatus(req: Request, res: Response): Promise<void> {
  try {
    const { challenge_id } = req.query;

    if (!challenge_id || typeof challenge_id !== 'string') {
      res.status(400).json({
        success: false,
        error: 'MISSING_CHALLENGE_ID',
        message: 'Challenge ID is required',
      });
      return;
    }

    const qrSession = qrAuthSessions.get(challenge_id);

    if (!qrSession) {
      res.status(404).json({
        success: false,
        error: 'QR_SESSION_NOT_FOUND',
        message: 'QR authentication session not found',
      });
      return;
    }

    if (Date.now() > qrSession.expiresAt) {
      qrAuthSessions.delete(challenge_id);
      res.status(410).json({
        success: false,
        error: 'QR_SESSION_EXPIRED',
        message: 'QR authentication session has expired',
      });
      return;
    }

    res.json({
      success: true,
      data: {
        challengeId: challenge_id,
        completed: qrSession.completed,
        expiresAt: qrSession.expiresAt,
        timeRemaining: Math.max(0, qrSession.expiresAt - Date.now()),
      },
    });
  } catch (error) {
    console.error('QR auth status check error:', error);
    res.status(500).json({
      success: false,
      error: 'QR_STATUS_CHECK_FAILED',
      message: 'Failed to check QR authentication status',
    });
  }
}

/**
 * Handle QR authentication callback from Nova Wallet
 */
export async function handleQrCallback(req: Request, res: Response): Promise<void> {
  try {
    const { challenge_id, signature, address } = qrCallbackSchema.parse(req.body);

    const qrSession = qrAuthSessions.get(challenge_id);

    if (!qrSession) {
      res.status(404).json({
        success: false,
        error: 'QR_SESSION_NOT_FOUND',
        message: 'QR authentication session not found',
      });
      return;
    }

    if (Date.now() > qrSession.expiresAt) {
      qrAuthSessions.delete(challenge_id);
      res.status(410).json({
        success: false,
        error: 'QR_SESSION_EXPIRED',
        message: 'QR authentication session has expired',
      });
      return;
    }

    if (qrSession.completed) {
      res.status(409).json({
        success: false,
        error: 'QR_SESSION_ALREADY_COMPLETED',
        message: 'QR authentication session already completed',
      });
      return;
    }

    // Verify the signature
    const challenge = {
      id: challenge_id,
      message: qrSession.message,
      clientId: 'nova-wallet-qr-auth',
      nonce: challenge_id, // Using challenge ID as nonce for simplicity
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      createdAt: Date.now(),
      expiresAtTimestamp: Date.now() + 5 * 60 * 1000,
      used: false,
    };

    const authService = new AuthService({
      challengeExpiration: 5 * 60 * 1000, // 5 minutes
      sessionExpiration: 7 * 24 * 60 * 60 * 1000, // 7 days
      enableDomainBinding: false,
      allowedDomains: [],
    });

    const authResult = await authService.verifySignature(
      {
        message: qrSession.message,
        signature,
        address,
        nonce: challenge_id,
      },
      challenge
    );

    if (!authResult.success) {
      // Log failed authentication attempt
      const auditService = new AuditService();
      await auditService.log({
        type: 'AUTH_ATTEMPT',
        client_id: 'nova-wallet-qr-auth',
        user_address: address,
        action: 'qr_auth_failed',
        status: 'failure',
        details: {
          challengeId: challenge_id,
          reason: 'signature_verification_failed',
        },
        ip_address: req.ip || 'unknown',
        user_agent: req.get('User-Agent'),
        created_at: Date.now(),
      });

      res.status(400).json({
        success: false,
        error: 'SIGNATURE_VERIFICATION_FAILED',
        message: 'Signature verification failed',
      });
      return;
    }

    // Mark session as completed
    qrSession.completed = true;
    qrSession.signature = signature;

    // Generate tokens
    const tempSession = {
      id: challenge_id,
      address,
      client_id: 'nova-wallet-qr-auth',
      fingerprint: challenge_id,
      createdAt: Date.now(),
      lastUsedAt: Date.now(),
      isActive: true,
    };

    const tokenService = new TokenService();
    const tokenPair = await tokenService.createSession(address, 'nova-wallet-qr-auth');

    // Log successful authentication
    const auditService = new AuditService();
    await auditService.log({
      type: 'CHALLENGE_VERIFIED',
      client_id: 'nova-wallet-qr-auth',
      user_address: address,
      action: 'qr_auth_completed',
      status: 'success',
      details: {
        challengeId: challenge_id,
        method: 'qr_code',
      },
      ip_address: req.ip || 'unknown',
      user_agent: req.get('User-Agent'),
      created_at: Date.now(),
    });

    res.json({
      success: true,
      data: {
        challengeId: challenge_id,
        completed: true,
        tokens: tokenPair,
        session: tokenPair,
      },
    });
  } catch (error) {
    console.error('QR callback error:', error);

    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Invalid callback data',
        details: error.errors,
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'QR_CALLBACK_FAILED',
      message: 'Failed to process QR authentication callback',
    });
  }
}

/**
 * Get QR authentication result
 */
export async function getQrAuthResult(req: Request, res: Response): Promise<void> {
  try {
    const { challenge_id } = req.query;

    if (!challenge_id || typeof challenge_id !== 'string') {
      res.status(400).json({
        success: false,
        error: 'MISSING_CHALLENGE_ID',
        message: 'Challenge ID is required',
      });
      return;
    }

    const qrSession = qrAuthSessions.get(challenge_id);

    if (!qrSession) {
      res.status(404).json({
        success: false,
        error: 'QR_SESSION_NOT_FOUND',
        message: 'QR authentication session not found',
      });
      return;
    }

    if (!qrSession.completed) {
      res.status(202).json({
        success: true,
        data: {
          challengeId: challenge_id,
          completed: false,
          message: 'Authentication still in progress',
        },
      });
      return;
    }

    // Generate tokens for completed session
    const tokenService = new TokenService();
    const tokenPair = await tokenService.createSession(qrSession.address, 'nova-wallet-qr-auth');

    // Clean up the session
    qrAuthSessions.delete(challenge_id);

    res.json({
      success: true,
      data: {
        challengeId: challenge_id,
        completed: true,
        tokens: tokenPair,
        session: tokenPair,
      },
    });
  } catch (error) {
    console.error('QR auth result error:', error);
    res.status(500).json({
      success: false,
      error: 'QR_RESULT_FAILED',
      message: 'Failed to get QR authentication result',
    });
  }
}
