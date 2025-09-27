import { Router, Request, Response } from 'express';
import { SignatureVerificationService, SignatureVerificationConfig } from '../../services/signatureVerificationService.js';
import { createLogger } from '../../utils/logger.js';
import { createRateLimiters } from '../../middleware/rateLimit.js';
import { sanitizeRequest } from '../../middleware/validation.js';
import { z } from 'zod';

const logger = createLogger('papi-routes');
const router = Router();

// Validation schemas
const papiVerifySchema = z.object({
  message: z.string().min(1, 'Message is required'),
  signature: z.string().min(1, 'Signature is required'),
  address: z.string().min(1, 'Address is required'),
  chain: z.string().optional().default('polkadot'),
});

const papiAccountInfoSchema = z.object({
  address: z.string().min(1, 'Address is required'),
  chain: z.string().optional().default('polkadot'),
});

const papiBlockInfoSchema = z.object({
  blockHash: z.string().min(1, 'Block hash is required'),
  chain: z.string().optional().default('polkadot'),
});

const papiChainSchema = z.object({
  chain: z.string().optional().default('polkadot'),
});

// Initialize PAPI Service
let signatureVerificationService: SignatureVerificationService | null = null;

export function initializePapi(config: SignatureVerificationConfig): void {
  try {
    signatureVerificationService = new SignatureVerificationService(config);
    logger.info('PAPI service initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize PAPI service', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * POST /api/auth/papi/verify
 * Verify signature using PAPI
 */
router.post('/verify',
  sanitizeRequest(),
  async (req: Request, res: Response) => {
    try {
      if (!signatureVerificationService) {
        return res.status(503).json({
          error: 'PAPI service not configured',
          message: 'PAPI signature verification is not available',
        });
      }

      const { message, signature, address, chain } = papiVerifySchema.parse(req.body);

      const result = await signatureVerificationService.verifySignature(
        message,
        signature,
        address,
        chain
      );

      logger.info('PAPI signature verification completed', {
        address,
        chain,
        isValid: result.isValid,
        method: result.method,
        requestId: res.locals.requestId,
      });

      res.json({
        isValid: result.isValid,
        address: result.address,
        chain: result.chain,
        method: result.method,
        ...(result.error && { error: result.error }),
      });
    } catch (error) {
      logger.error('Failed to verify signature with PAPI', {
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
        message: 'Failed to verify signature with PAPI',
      });
    }
  }
);

/**
 * GET /api/auth/papi/account/:address
 * Get account info using PAPI
 */
router.get('/account/:address',
  sanitizeRequest(),
  async (req: Request, res: Response) => {
    try {
      if (!signatureVerificationService) {
        return res.status(503).json({
          error: 'PAPI service not configured',
          message: 'PAPI account info is not available',
        });
      }

      const { address } = req.params;
      const { chain } = papiAccountInfoSchema.parse({ address, ...req.query });

      // Get account info using PAPI
      const papiService = (signatureVerificationService as any).papiService;
      if (!papiService) {
        return res.status(503).json({
          error: 'PAPI service not available',
          message: 'PAPI service is not initialized',
        });
      }

      const accountInfo = await papiService.getAccountInfo(address, chain);

      logger.info('PAPI account info retrieved', {
        address,
        chain,
        requestId: res.locals.requestId,
      });

      res.json({
        address,
        chain,
        accountInfo: accountInfo.toHuman(),
        method: 'papi',
      });
    } catch (error) {
      logger.error('Failed to get account info with PAPI', {
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
        message: 'Failed to get account info with PAPI',
      });
    }
  }
);

/**
 * GET /api/auth/papi/status
 * Get PAPI service status
 */
router.get('/status',
  sanitizeRequest(),
  async (req: Request, res: Response) => {
    try {
      if (!signatureVerificationService) {
        return res.status(503).json({
          error: 'PAPI service not configured',
          message: 'PAPI service is not available',
        });
      }

      const status = signatureVerificationService.getStatus();

      logger.info('PAPI status retrieved', {
        status,
        requestId: res.locals.requestId,
      });

      res.json({
        status: 'available',
        ...status,
      });
    } catch (error) {
      logger.error('Failed to get PAPI status', {
        error: error instanceof Error ? error.message : String(error),
        requestId: res.locals.requestId,
      });

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to get PAPI status',
      });
    }
  }
);

/**
 * GET /api/auth/papi/chains
 * Get available chains
 */
router.get('/chains',
  sanitizeRequest(),
  async (req: Request, res: Response) => {
    try {
      if (!signatureVerificationService) {
        return res.status(503).json({
          error: 'PAPI service not configured',
          message: 'PAPI service is not available',
        });
      }

      const papiService = (signatureVerificationService as any).papiService;
      if (!papiService) {
        return res.status(503).json({
          error: 'PAPI service not available',
          message: 'PAPI service is not initialized',
        });
      }

      const availableChains = papiService.getAvailableChains();

      logger.info('PAPI available chains retrieved', {
        chains: availableChains,
        requestId: res.locals.requestId,
      });

      res.json({
        chains: availableChains,
        method: 'papi',
      });
    } catch (error) {
      logger.error('Failed to get available chains from PAPI', {
        error: error instanceof Error ? error.message : String(error),
        requestId: res.locals.requestId,
      });

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to get available chains from PAPI',
      });
    }
  }
);

/**
 * GET /api/auth/papi/balance/:address
 * Get account balance using PAPI
 */
router.get('/balance/:address',
  sanitizeRequest(),
  async (req: Request, res: Response) => {
    try {
      if (!signatureVerificationService) {
        return res.status(503).json({
          error: 'PAPI service not configured',
          message: 'PAPI account balance is not available',
        });
      }

      const { address } = req.params;
      const { chain } = papiAccountInfoSchema.parse({ address, ...req.query });

      const papiService = (signatureVerificationService as any).papiService;
      if (!papiService) {
        return res.status(503).json({
          error: 'PAPI service not available',
          message: 'PAPI service is not initialized',
        });
      }

      const balanceInfo = await papiService.getAccountBalance(address, chain);

      logger.info('PAPI account balance retrieved', {
        address,
        chain,
        requestId: res.locals.requestId,
      });

      res.json({
        ...balanceInfo,
        method: 'papi',
      });
    } catch (error) {
      logger.error('Failed to get account balance with PAPI', {
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
        message: 'Failed to get account balance with PAPI',
      });
    }
  }
);

/**
 * GET /api/auth/papi/health/:chain
 * Get chain health status using PAPI
 */
router.get('/health/:chain',
  sanitizeRequest(),
  async (req: Request, res: Response) => {
    try {
      if (!signatureVerificationService) {
        return res.status(503).json({
          error: 'PAPI service not configured',
          message: 'PAPI health check is not available',
        });
      }

      const { chain } = papiChainSchema.parse({ chain: req.params.chain || 'polkadot' });

      const papiService = (signatureVerificationService as any).papiService;
      if (!papiService) {
        return res.status(503).json({
          error: 'PAPI service not available',
          message: 'PAPI service is not initialized',
        });
      }

      const healthInfo = await papiService.getChainHealth(chain);

      logger.info('PAPI chain health retrieved', {
        chain,
        requestId: res.locals.requestId,
      });

      res.json({
        ...healthInfo,
        method: 'papi',
      });
    } catch (error) {
      logger.error('Failed to get chain health with PAPI', {
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
        message: 'Failed to get chain health with PAPI',
      });
    }
  }
);

/**
 * GET /api/auth/papi/metadata/:chain
 * Get chain metadata using PAPI
 */
router.get('/metadata/:chain',
  sanitizeRequest(),
  async (req: Request, res: Response) => {
    try {
      if (!signatureVerificationService) {
        return res.status(503).json({
          error: 'PAPI service not configured',
          message: 'PAPI metadata is not available',
        });
      }

      const { chain } = papiChainSchema.parse({ chain: req.params.chain || 'polkadot' });

      const papiService = (signatureVerificationService as any).papiService;
      if (!papiService) {
        return res.status(503).json({
          error: 'PAPI service not available',
          message: 'PAPI service is not initialized',
        });
      }

      const metadataInfo = await papiService.getChainMetadata(chain);

      logger.info('PAPI chain metadata retrieved', {
        chain,
        requestId: res.locals.requestId,
      });

      res.json({
        ...metadataInfo,
        method: 'papi',
      });
    } catch (error) {
      logger.error('Failed to get chain metadata with PAPI', {
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
        message: 'Failed to get chain metadata with PAPI',
      });
    }
  }
);

/**
 * GET /api/auth/papi/block/:blockHash
 * Get block information using PAPI
 */
router.get('/block/:blockHash',
  sanitizeRequest(),
  async (req: Request, res: Response) => {
    try {
      if (!signatureVerificationService) {
        return res.status(503).json({
          error: 'PAPI service not configured',
          message: 'PAPI block info is not available',
        });
      }

      const { blockHash } = req.params;
      const { chain } = papiBlockInfoSchema.parse({ blockHash, ...req.query });

      const papiService = (signatureVerificationService as any).papiService;
      if (!papiService) {
        return res.status(503).json({
          error: 'PAPI service not available',
          message: 'PAPI service is not initialized',
        });
      }

      const blockInfo = await papiService.getBlockInfo(blockHash, chain);

      logger.info('PAPI block info retrieved', {
        blockHash,
        chain,
        requestId: res.locals.requestId,
      });

      res.json({
        ...blockInfo,
        method: 'papi',
      });
    } catch (error) {
      logger.error('Failed to get block info with PAPI', {
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
        message: 'Failed to get block info with PAPI',
      });
    }
  }
);

/**
 * GET /api/auth/papi/latest/:chain
 * Get latest block using PAPI
 */
router.get('/latest/:chain',
  sanitizeRequest(),
  async (req: Request, res: Response) => {
    try {
      if (!signatureVerificationService) {
        return res.status(503).json({
          error: 'PAPI service not configured',
          message: 'PAPI latest block is not available',
        });
      }

      const { chain } = papiChainSchema.parse({ chain: req.params.chain || 'polkadot' });

      const papiService = (signatureVerificationService as any).papiService;
      if (!papiService) {
        return res.status(503).json({
          error: 'PAPI service not available',
          message: 'PAPI service is not initialized',
        });
      }

      const latestBlock = await papiService.getLatestBlock(chain);

      logger.info('PAPI latest block retrieved', {
        chain,
        requestId: res.locals.requestId,
      });

      res.json({
        ...latestBlock,
        method: 'papi',
      });
    } catch (error) {
      logger.error('Failed to get latest block with PAPI', {
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
        message: 'Failed to get latest block with PAPI',
      });
    }
  }
);

export function createPapiRouter(rateLimiters: ReturnType<typeof createRateLimiters>): Router {
  // Create a new router with rate limiters applied to each route
  const rateLimitedRouter = Router();
  
  // Mount each route with its rate limiter
  rateLimitedRouter.post('/verify', rateLimiters.verify, sanitizeRequest(), router);
  rateLimitedRouter.get('/account/:address', rateLimiters.api, sanitizeRequest(), router);
  rateLimitedRouter.get('/balance/:address', rateLimiters.api, sanitizeRequest(), router);
  rateLimitedRouter.get('/status', rateLimiters.api, sanitizeRequest(), router);
  rateLimitedRouter.get('/chains', rateLimiters.api, sanitizeRequest(), router);
  rateLimitedRouter.get('/health', rateLimiters.api, sanitizeRequest(), router);
  rateLimitedRouter.get('/health/:chain', rateLimiters.api, sanitizeRequest(), router);
  rateLimitedRouter.get('/metadata', rateLimiters.api, sanitizeRequest(), router);
  rateLimitedRouter.get('/metadata/:chain', rateLimiters.api, sanitizeRequest(), router);
  rateLimitedRouter.get('/block/:blockHash', rateLimiters.api, sanitizeRequest(), router);
  rateLimitedRouter.get('/latest', rateLimiters.api, sanitizeRequest(), router);
  rateLimitedRouter.get('/latest/:chain', rateLimiters.api, sanitizeRequest(), router);
  
  return rateLimitedRouter;
}
