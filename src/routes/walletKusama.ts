import { NextFunction, Request, Response, Router } from 'express';
import { z } from 'zod';
import { validateBody } from '../middleware/validation';
import { WalletBasedKusamaService } from '../services/walletBasedKusamaService';
import { createLogger } from '../utils/logger';

const router = Router();
const logger = createLogger('wallet-kusama-routes');

// Initialize the wallet-based Kusama service
const walletKusamaService = new WalletBasedKusamaService();

// Initialize the service when the routes are loaded
walletKusamaService.initialize().catch(error => {
  logger.error('Failed to initialize wallet-based Kusama service', { error });
});

// Middleware to verify JWT token and extract user address
const authenticateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization header required' });
    }

    const token = authHeader.substring(7);

    // For now, we'll use a simple approach - in production, you'd want to use the TokenService
    // This is a placeholder for the actual JWT verification
    if (!token || token.length < 32) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Extract user address from the request body or query
    const userAddress = req.body.userAddress || req.query.userAddress;
    if (!userAddress) {
      return res.status(400).json({ error: 'User address required' });
    }

    // Add user info to request for downstream handlers
    (req as any).userAddress = userAddress;
    next();
  } catch (error) {
    logger.error('Authentication failed', { error });
    res.status(401).json({ error: 'Authentication failed' });
  }
};

// Schema for storing credentials
const storeCredentialSchema = z.object({
  body: z.object({
    credentialData: z.record(z.unknown()),
    credentialType: z.string().min(1),
    userAddress: z.string().min(1),
    userSignature: z.string().optional(),
    userMessage: z.string().optional(),
  }),
});

// Schema for retrieving credentials
const retrieveCredentialSchema = z.object({
  body: z.object({
    credentialId: z.string().min(1),
    userAddress: z.string().min(1),
    userSignature: z.string().optional(),
  }),
});

// Schema for listing credentials
const listCredentialsSchema = z.object({
  query: z.object({
    userAddress: z.string().min(1),
    userSignature: z.string().optional(),
  }),
});

// Schema for cost estimation
const costEstimateSchema = z.object({
  query: z.object({
    dataSize: z.string().transform(val => parseInt(val, 10)),
    userAddress: z.string().min(1),
  }),
});

// Store credential using wallet authentication
router.post(
  '/store',
  validateBody(storeCredentialSchema),
  authenticateUser,
  async (req: Request, res: Response) => {
    try {
      const { credentialData, credentialType, userAddress, userSignature, userMessage } = req.body;

      logger.info('Storing credential with wallet authentication', {
        credentialType,
        userAddress,
        hasSignature: !!userSignature,
      });

      const result = await walletKusamaService.storeCredentialWithWallet(
        userAddress as string,
        credentialData as Record<string, unknown>,
        credentialType as string,
        userSignature as string | undefined,
        userMessage as string | undefined
      );

      res.json({
        success: true,
        message: 'Credential stored successfully with wallet authentication',
        credentialId: result.credentialId,
        storageMethod: result.storageMethod,
        cost: 0.001, // Mock cost for now
      });
    } catch (error) {
      logger.error('Failed to store credential with wallet', { error });
      res.status(500).json({
        success: false,
        message: 'Failed to store credential',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

// Retrieve credential using wallet authentication
router.post(
  '/retrieve',
  validateBody(retrieveCredentialSchema),
  authenticateUser,
  async (req: Request, res: Response) => {
    try {
      const { credentialId, userAddress, userSignature } = req.body;

      logger.info('Retrieving credential with wallet authentication', {
        credentialId,
        userAddress,
      });

      const credential = await walletKusamaService.retrieveCredentialWithWallet(
        credentialId as string,
        userAddress as string,
        userSignature as string | undefined
      );

      if (!credential) {
        return res.status(404).json({
          success: false,
          message: 'Credential not found or access denied',
        });
      }

      res.json({
        success: true,
        message: 'Credential retrieved successfully',
        credential: {
          id: credentialId,
          type: credential.credentialType,
          data: credential.credentialData,
          timestamp: credential.timestamp,
          address: credential.userAddress,
        },
      });
    } catch (error) {
      logger.error('Failed to retrieve credential with wallet', { error });
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve credential',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

// List credentials using wallet authentication
router.get(
  '/list',
  validateBody(listCredentialsSchema),
  authenticateUser,
  async (req: Request, res: Response) => {
    try {
      const { userAddress, userSignature } = req.query;

      logger.info('Listing credentials with wallet authentication', {
        userAddress: userAddress as string,
      });

      const credentials = await walletKusamaService.listCredentialsWithWallet(
        userAddress as string,
        userSignature as string
      );

      res.json({
        success: true,
        credentials: credentials.map(cred => ({
          id: `cred_${cred.timestamp}_${cred.dataHash.substring(0, 8)}`,
          type: cred.credentialType,
          data: cred.credentialData,
          encrypted: true,
          hash: cred.dataHash,
          timestamp: cred.timestamp,
          address: cred.userAddress,
        })),
        count: credentials.length,
      });
    } catch (error) {
      logger.error('Failed to list credentials with wallet', { error });
      res.status(500).json({
        success: false,
        message: 'Failed to list credentials',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

// Estimate storage cost
router.get(
  '/cost-estimate',
  validateBody(costEstimateSchema),
  async (req: Request, res: Response) => {
    try {
      const { dataSize, userAddress } = req.query;

      logger.info('Getting cost estimate for wallet-based storage', {
        dataSize: Number(dataSize),
        userAddress: userAddress as string,
      });

      const estimate = await walletKusamaService.estimateStorageCost(
        Number(dataSize),
        userAddress as string
      );

      res.json({
        success: true,
        dataSize: Number(dataSize),
        estimatedCost: estimate.estimatedCost,
        currency: estimate.currency,
        storageMethod: estimate.storageMethod,
      });
    } catch (error) {
      logger.error('Failed to get cost estimate', { error });
      res.status(500).json({
        success: false,
        message: 'Failed to get cost estimate',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

// Health check
router.get('/health', async (req: Request, res: Response) => {
  try {
    const health = await walletKusamaService.getNetworkHealth();

    res.json({
      success: true,
      health,
    });
  } catch (error) {
    logger.error('Health check failed', { error });
    res.status(500).json({
      success: false,
      health: {
        isHealthy: false,
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      },
    });
  }
});

export default router;
