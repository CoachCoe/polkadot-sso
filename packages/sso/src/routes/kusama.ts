import { NextFunction, Request, Response, Router } from 'express';
import { z } from 'zod';
import { validateBody } from '../middleware/validation';
import { KusamaCredential, kusamaIntegrationService } from '../services/kusamaIntegrationService';
import { createLogger } from '../utils/logger';

const router = Router();
const logger = createLogger('kusama-routes');

const storeCredentialSchema = z.object({
  body: z.object({
    credentialData: z.any(),
    credentialType: z.string().min(1),
    userAddress: z.string().min(1),
    encryptionKey: z.string().optional(),
  }),
});

const retrieveCredentialSchema = z.object({
  body: z.object({
    credentialId: z.string().min(1),
    userAddress: z.string().min(1),
    encryptionKey: z.string().optional(),
  }),
});

const listCredentialsSchema = z.object({
  query: z.object({
    userAddress: z.string().min(1),
  }),
});

router.post(
  '/store',
  validateBody(storeCredentialSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { credentialData, credentialType, userAddress, encryptionKey } = req.body as {
        credentialData: Record<string, unknown>;
        credentialType: string;
        userAddress: string;
        encryptionKey?: string;
      };

      logger.info(`Storing credential of type ${credentialType} for address ${userAddress}`);

      const result = await kusamaIntegrationService.storeCredential(
        credentialData,
        credentialType,
        userAddress,
        encryptionKey
      );

      if (result.success) {
        res.json({
          success: true,
          message: 'Credential stored successfully on Kusama',
          credentialId: result.credentialId,
          transactionHash: result.transactionHash,
          cost: result.cost,
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Failed to store credential',
          error: result.error,
        });
      }
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/retrieve',
  validateBody(retrieveCredentialSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { credentialId, userAddress, encryptionKey } = req.body as {
        credentialId: string;
        userAddress: string;
        encryptionKey?: string;
      };

      logger.info(`Retrieving credential ${credentialId} for address ${userAddress}`);

      const credential = await kusamaIntegrationService.retrieveCredential(
        credentialId,
        userAddress,
        encryptionKey
      );

      res.json({
        success: true,
        credential,
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        message: 'Credential not found or access denied',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

router.get(
  '/list',
  validateBody(listCredentialsSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userAddress } = req.query as { userAddress: string };

      logger.info(`Listing credentials for address ${userAddress}`);

      const credentials = await kusamaIntegrationService.listUserCredentials(userAddress);

      res.json({
        success: true,
        credentials,
        count: credentials.length,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get('/cost-estimate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dataSize = parseInt(req.query.dataSize as string) || 1000;

    logger.info(`Getting cost estimate for data size ${dataSize} bytes`);

    const cost = await kusamaIntegrationService.getStorageCostEstimate(dataSize);

    res.json({
      success: true,
      dataSize,
      estimatedCost: cost,
      currency: 'KSM',
    });
  } catch (error) {
    next(error);
  }
});

router.post('/verify', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { credential } = req.body as { credential: KusamaCredential };

    if (!credential) {
      return res.status(400).json({
        success: false,
        message: 'Credential object is required',
      });
    }

    logger.info(`Verifying credential ${String(credential.id ?? 'unknown')}`);

    const isValid = await kusamaIntegrationService.verifyCredential(credential);

    res.json({
      success: true,
      isValid,
      credentialId: credential.id,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/init', async (req: Request, res: Response, next: NextFunction) => {
  try {
    logger.info('Initializing Kusama integration service...');

    const success = await kusamaIntegrationService.initialize();

    if (success) {
      res.json({
        success: true,
        message: 'Kusama integration service initialized successfully',
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to initialize Kusama integration service',
      });
    }
  } catch (error) {
    next(error);
  }
});

router.get('/health', async (req: Request, res: Response, next: NextFunction) => {
  try {
    logger.info('Checking Kusama network health...');

    const health = await kusamaIntegrationService.getNetworkHealth();

    res.json({
      success: true,
      health,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to check network health',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.get('/monitors', async (req: Request, res: Response, next: NextFunction) => {
  try {
    logger.info('Getting active transaction monitors...');

    const monitors = await kusamaIntegrationService.getActiveMonitors();

    res.json({
      success: true,
      activeMonitors: monitors,
      count: monitors.length,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
