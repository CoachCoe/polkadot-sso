import { NextFunction, Request, Response, Router } from 'express';
import { z } from 'zod';
import {
  AuditService,
  createRateLimiters,
  HybridCredentialService,
  sanitizeRequest,
  validateBody,
} from '../modules';
import { HybridCredentialRequest } from '../types/auth';
import { logError } from '../utils/logger';
interface AuthenticatedRequest extends Request {
  user?: {
    address: string;
  };
}
const createHybridCredentialSchema = z.object({
  body: z.object({
    user_address: z.string().min(1),
    credential_type_id: z.string().uuid(),
    credential_data: z.record(z.unknown()),
    expires_at: z.number().optional(),
    metadata: z.record(z.unknown()).optional(),
    storage_preference: z.enum(['local', 'ipfs', 'hybrid']).optional(),
    pin_to_ipfs: z.boolean().optional(),
    store_on_kusama: z.boolean().optional(),
  }),
});
const migrateCredentialSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});
const verifyIntegritySchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});
export const createHybridCredentialRouter = (
  hybridCredentialService: HybridCredentialService,
  auditService: AuditService
) => {
  const router = Router();
  const rateLimiters = createRateLimiters(auditService);
  router.post(
    '/credentials',
    rateLimiters.api,
    sanitizeRequest(),
    validateBody(createHybridCredentialSchema),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const issuerAddress = (req as AuthenticatedRequest).user?.address;
        if (!issuerAddress) {
          return res.status(401).json({ error: 'Authentication required' });
        }
        const { user_address, ...requestBody } = req.body;
        const request = requestBody as unknown as HybridCredentialRequest;
        const credential = await hybridCredentialService.createCredential(
          issuerAddress,
          String(user_address),
          request
        );
        await auditService.log({
          type: 'HYBRID_CREDENTIAL',
          user_address: issuerAddress,
          client_id: 'hybrid-credential-service',
          action: 'CREDENTIAL_ISSUED',
          status: 'success',
          details: {
            credential_id: credential.id,
            recipient_address: user_address,
            storage_type: credential.storage_type,
            ipfs_hash: credential.ipfs_hash,
            kusama_reference: credential.kusama_reference ? 'stored' : 'not stored',
          },
          ip_address: req.ip || 'unknown',
          user_agent: req.get('user-agent') || 'unknown',
        });
        return res.status(201).json(credential);
      } catch (error) {
        logError(req, error as Error);
        return next(error);
      }
    }
  );
  router.get(
    '/credentials',
    rateLimiters.api,
    sanitizeRequest(),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const userAddress = (req as AuthenticatedRequest).user?.address;
        if (!userAddress) {
          return res.status(401).json({ error: 'Authentication required' });
        }
        const credentials = await hybridCredentialService.getUserCredentials(userAddress);
        return res.json(credentials);
      } catch (error) {
        logError(req, error as Error);
        return next(error);
      }
    }
  );
  router.get(
    '/credentials/:id',
    rateLimiters.api,
    sanitizeRequest(),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const userAddress = (req as AuthenticatedRequest).user?.address;
        if (!userAddress) {
          return res.status(401).json({ error: 'Authentication required' });
        }
        const credential = await hybridCredentialService.getCredential(req.params['id'] || '');
        if (!credential) {
          return res.status(404).json({ error: 'Credential not found' });
        }
        if (credential.user_address !== userAddress) {
          const sharedCredentials = await hybridCredentialService.getSharedCredentials(userAddress);
          const hasAccess = sharedCredentials.some(
            share => share.credential_id === req.params['id'] || ''
          );
          if (!hasAccess) {
            return res.status(403).json({ error: 'Access denied' });
          }
        }
        return res.json(credential);
      } catch (error) {
        logError(req, error as Error);
        return next(error);
      }
    }
  );
  router.get(
    '/credentials/:id/data',
    rateLimiters.api,
    sanitizeRequest(),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const userAddress = (req as AuthenticatedRequest).user?.address;
        if (!userAddress) {
          return res.status(401).json({ error: 'Authentication required' });
        }
        const credential = await hybridCredentialService.getCredential(req.params['id'] || '');
        if (!credential) {
          return res.status(404).json({ error: 'Credential not found' });
        }
        if (credential.user_address !== userAddress) {
          const sharedCredentials = await hybridCredentialService.getSharedCredentials(userAddress);
          const hasAccess = sharedCredentials.some(
            share => share.credential_id === req.params['id'] || ''
          );
          if (!hasAccess) {
            return res.status(403).json({ error: 'Access denied' });
          }
        }
        const credentialData = await hybridCredentialService.getCredentialData(
          req.params['id'] || ''
        );
        if (!credentialData) {
          return res.status(404).json({ error: 'Credential data not found' });
        }
        return res.json({
          credential_id: req.params['id'] || '',
          data: credentialData,
          storage_type: credential.storage_type,
          ipfs_hash: credential.ipfs_hash,
          kusama_reference: credential.kusama_reference,
        });
      } catch (error) {
        logError(req, error as Error);
        return next(error);
      }
    }
  );
  router.get(
    '/credentials/:id/verify-integrity',
    rateLimiters.api,
    sanitizeRequest(),
    validateBody(verifyIntegritySchema),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const userAddress = (req as AuthenticatedRequest).user?.address;
        if (!userAddress) {
          return res.status(401).json({ error: 'Authentication required' });
        }
        const integrityResult = await hybridCredentialService.verifyCredentialIntegrity(
          req.params['id'] || ''
        );
        await auditService.log({
          type: 'CREDENTIAL_INTEGRITY',
          user_address: userAddress,
          client_id: 'hybrid-credential-service',
          action: 'INTEGRITY_VERIFIED',
          status: integrityResult.valid ? 'success' : 'failure',
          details: {
            credential_id: req.params['id'] || '',
            integrity_result: integrityResult,
          },
          ip_address: req.ip || 'unknown',
          user_agent: req.get('user-agent') || 'unknown',
        });
        return res.json(integrityResult);
      } catch (error) {
        logError(req, error as Error);
        return next(error);
      }
    }
  );
  router.post(
    '/credentials/:id/migrate-to-ipfs',
    rateLimiters.api,
    sanitizeRequest(),
    validateBody(migrateCredentialSchema),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const userAddress = (req as AuthenticatedRequest).user?.address;
        if (!userAddress) {
          return res.status(401).json({ error: 'Authentication required' });
        }
        const credential = await hybridCredentialService.getCredential(req.params['id'] || '');
        if (!credential) {
          return res.status(404).json({ error: 'Credential not found' });
        }
        if (credential.user_address !== userAddress) {
          return res.status(403).json({ error: 'Access denied' });
        }
        const migratedCredential = await hybridCredentialService.migrateToIPFS(
          req.params['id'] || ''
        );
        await auditService.log({
          type: 'CREDENTIAL_MIGRATION',
          user_address: userAddress,
          client_id: 'hybrid-credential-service',
          action: 'MIGRATED_TO_IPFS',
          status: 'success',
          details: {
            credential_id: req.params['id'] || '',
            new_storage_type: migratedCredential.storage_type,
            ipfs_hash: migratedCredential.ipfs_hash,
            kusama_reference: migratedCredential.kusama_reference ? 'stored' : 'not stored',
          },
          ip_address: req.ip || 'unknown',
          user_agent: req.get('user-agent') || 'unknown',
        });
        return res.json(migratedCredential);
      } catch (error) {
        logError(req, error as Error);
        return next(error);
      }
    }
  );
  router.get(
    '/storage/stats',
    rateLimiters.api,
    sanitizeRequest(),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const userAddress = (req as AuthenticatedRequest).user?.address;
        if (!userAddress) {
          return res.status(401).json({ error: 'Authentication required' });
        }
        const stats = await hybridCredentialService.getStorageStats();
        return res.json(stats);
      } catch (error) {
        logError(req, error as Error);
        return next(error);
      }
    }
  );
  router.get(
    '/storage/ipfs/test',
    rateLimiters.api,
    sanitizeRequest(),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const userAddress = (req as AuthenticatedRequest).user?.address;
        if (!userAddress) {
          return res.status(401).json({ error: 'Authentication required' });
        }
        return res.json({
          status: 'test_endpoint',
          message: 'IPFS connection test endpoint - implement with service access',
        });
      } catch (error) {
        logError(req, error as Error);
        return next(error);
      }
    }
  );
  router.get(
    '/storage/kusama/test',
    rateLimiters.api,
    sanitizeRequest(),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const userAddress = (req as AuthenticatedRequest).user?.address;
        if (!userAddress) {
          return res.status(401).json({ error: 'Authentication required' });
        }
        return res.json({
          status: 'test_endpoint',
          message: 'Kusama connection test endpoint - implement with service access',
        });
      } catch (error) {
        logError(req, error as Error);
        return next(error);
      }
    }
  );
  return router;
};
