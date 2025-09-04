import { NextFunction, Request, Response, Router } from 'express';
import { z } from 'zod';
import { createRateLimiters } from '../middleware/rateLimit';
import { sanitizeRequest, validateBody } from '../middleware/validation';
import { AuditService } from '../services/auditService';
import { CredentialService } from '../services/credentialService';
import {
  CreateCredentialRequest,
  CreateIssuanceRequest,
  ShareCredentialRequest,
  UserProfile,
  VerifyCredentialRequest,
} from '../types/auth';
import { logError } from '../utils/logger';

interface AuthenticatedRequest extends Request {
  user?: {
    address: string;
  };
}

const validateCredentialBody = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.errors,
        });
      } else {
        next(error);
      }
    }
  };
};

const createUserProfileSchema = z.object({
  display_name: z.string().optional(),
  email: z.string().email().optional(),
  avatar_url: z.string().url().optional(),
  bio: z.string().optional(),
  website: z.string().url().optional(),
  location: z.string().optional(),
  timezone: z.string().optional(),
  preferences: z.record(z.any()).optional(),
});

const createCredentialSchema = z.object({
  user_address: z.string(),
  credential_type_id: z.string().uuid(),
  credential_data: z.record(z.any()),
  expires_at: z.number().optional(),
  metadata: z.record(z.any()).optional(),
});

const shareCredentialSchema = z.object({
  credential_id: z.string().uuid(),
  shared_with_address: z.string(),
  shared_with_client_id: z.string().optional(),
  permissions: z.array(z.string()),
  access_level: z.enum(['read', 'write', 'admin']),
  expires_at: z.number().optional(),
});

const verifyCredentialSchema = z.object({
  credential_id: z.string().uuid(),
  verification_type: z.enum(['proof', 'signature', 'manual', 'automated']),
  verification_data: z.record(z.any()).optional(),
  notes: z.string().optional(),
});

const createIssuanceRequestSchema = z.object({
  issuer_address: z.string(),
  credential_type_id: z.string().uuid(),
  template_id: z.string().uuid().optional(),
  request_data: z.record(z.any()),
  expires_at: z.number().optional(),
});

const createCredentialTypeSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  schema_version: z.string().min(1),
  schema_definition: z.string(),
  issuer_pattern: z.string().optional(),
  required_fields: z.array(z.string()),
  optional_fields: z.array(z.string()),
  validation_rules: z.record(z.any()),
});

export const createCredentialRouter = (
  credentialService: CredentialService,
  auditService: AuditService
) => {
  const router = Router();
  const rateLimiters = createRateLimiters(auditService);

  router.post(
    '/profiles',
    rateLimiters.api,
    sanitizeRequest(),
    validateCredentialBody(createUserProfileSchema),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const userAddress = (req as AuthenticatedRequest).user?.address;
        if (!userAddress) {
          return res.status(401).json({ error: 'Authentication required' });
        }

        const existingProfile = await credentialService.getUserProfile(userAddress);
        if (existingProfile) {
          return res.status(409).json({ error: 'Profile already exists' });
        }

        const profile = await credentialService.createUserProfile(
          userAddress,
          req.body as Partial<UserProfile>
        );

        await auditService.log({
          type: 'CREDENTIAL_PROFILE',
          user_address: userAddress,
          client_id: 'credential-service',
          action: 'PROFILE_CREATED',
          status: 'success',
          details: { profile_id: profile.id },
          ip_address: req.ip || 'unknown',
          user_agent: req.get('user-agent') || 'unknown',
        });

        res.status(201).json(profile);
      } catch (error) {
        logError(req, error as Error);
        next(error);
      }
    }
  );

  router.get(
    '/profiles/me',
    rateLimiters.api,
    sanitizeRequest(),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const userAddress = (req as AuthenticatedRequest).user?.address;
        if (!userAddress) {
          return res.status(401).json({ error: 'Authentication required' });
        }

        const profile = await credentialService.getUserProfile(userAddress);
        if (!profile) {
          return res.status(404).json({ error: 'Profile not found' });
        }

        res.json(profile);
      } catch (error) {
        logError(req, error as Error);
        next(error);
      }
    }
  );

  router.put(
    '/profiles/me',
    rateLimiters.api,
    sanitizeRequest(),
    validateBody(createUserProfileSchema),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const userAddress = (req as AuthenticatedRequest).user?.address;
        if (!userAddress) {
          return res.status(401).json({ error: 'Authentication required' });
        }

        await credentialService.updateUserProfile(userAddress, req.body as Partial<UserProfile>);

        await auditService.log({
          type: 'CREDENTIAL_PROFILE',
          user_address: userAddress,
          client_id: 'credential-service',
          action: 'PROFILE_UPDATED',
          status: 'success',
          details: { updates: req.body },
          ip_address: req.ip || 'unknown',
          user_agent: req.get('user-agent') || 'unknown',
        });

        res.json({ message: 'Profile updated successfully' });
      } catch (error) {
        logError(req, error as Error);
        next(error);
      }
    }
  );

  router.post(
    '/types',
    rateLimiters.api,
    sanitizeRequest(),
    validateBody(createCredentialTypeSchema),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const userAddress = (req as AuthenticatedRequest).user?.address;
        if (!userAddress) {
          return res.status(401).json({ error: 'Authentication required' });
        }

        const credentialType = await credentialService.createCredentialType({
          name: req.body.name,
          description: req.body.description,
          schema_version: req.body.schema_version,
          schema_definition: req.body.schema_definition,
          issuer_pattern: req.body.issuer_pattern,
          required_fields: req.body.required_fields,
          optional_fields: req.body.optional_fields,
          validation_rules: req.body.validation_rules,
          created_by: userAddress,
        });

        await auditService.log({
          type: 'CREDENTIAL_TYPE',
          user_address: userAddress,
          client_id: 'credential-service',
          action: 'TYPE_CREATED',
          status: 'success',
          details: { type_id: credentialType.id, name: credentialType.name },
          ip_address: req.ip || 'unknown',
          user_agent: req.get('user-agent') || 'unknown',
        });

        res.status(201).json(credentialType);
      } catch (error) {
        logError(req, error as Error);
        next(error);
      }
    }
  );

  router.get(
    '/types',
    rateLimiters.api,
    sanitizeRequest(),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const types = await credentialService.getActiveCredentialTypes();
        res.json(types);
      } catch (error) {
        logError(req, error as Error);
        next(error);
      }
    }
  );

  router.get(
    '/types/:id',
    rateLimiters.api,
    sanitizeRequest(),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const type = await credentialService.getCredentialType(req.params.id);
        if (!type) {
          return res.status(404).json({ error: 'Credential type not found' });
        }
        res.json(type);
      } catch (error) {
        logError(req, error as Error);
        next(error);
      }
    }
  );

  router.post(
    '/credentials',
    rateLimiters.api,
    sanitizeRequest(),
    validateBody(createCredentialSchema),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const issuerAddress = (req as AuthenticatedRequest).user?.address;
        if (!issuerAddress) {
          return res.status(401).json({ error: 'Authentication required' });
        }

        const { user_address, ...request } = req.body as {
          user_address: string;
        } & CreateCredentialRequest;
        const credential = await credentialService.createCredential(
          user_address,
          issuerAddress,
          request
        );

        await auditService.log({
          type: 'CREDENTIAL',
          user_address: issuerAddress,
          client_id: 'credential-service',
          action: 'CREDENTIAL_ISSUED',
          status: 'success',
          details: {
            credential_id: credential.id,
            recipient_address: user_address,
            type_id: request.credential_type_id,
          },
          ip_address: req.ip || 'unknown',
          user_agent: req.get('user-agent') || 'unknown',
        });

        res.status(201).json(credential);
      } catch (error) {
        logError(req, error as Error);
        next(error);
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

        const credentials = await credentialService.getUserCredentials(userAddress);
        res.json(credentials);
      } catch (error) {
        logError(req, error as Error);
        next(error);
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

        const credential = await credentialService.getCredential(req.params.id);
        if (!credential) {
          return res.status(404).json({ error: 'Credential not found' });
        }

        if (credential.user_address !== userAddress) {
          const sharedCredentials = await credentialService.getSharedCredentials(userAddress);
          const hasAccess = sharedCredentials.some(share => share.credential_id === req.params.id);

          if (!hasAccess) {
            return res.status(403).json({ error: 'Access denied' });
          }
        }

        res.json(credential);
      } catch (error) {
        logError(req, error as Error);
        next(error);
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

        const credential = await credentialService.getCredential(req.params.id);
        if (!credential) {
          return res.status(404).json({ error: 'Credential not found' });
        }

        if (credential.user_address !== userAddress) {
          const sharedCredentials = await credentialService.getSharedCredentials(userAddress);
          const hasAccess = sharedCredentials.some(share => share.credential_id === req.params.id);

          if (!hasAccess) {
            return res.status(403).json({ error: 'Access denied' });
          }
        }

        const data = await credentialService.getCredentialData(req.params.id);
        if (!data) {
          return res.status(404).json({ error: 'Credential data not found' });
        }

        res.json(data);
      } catch (error) {
        logError(req, error as Error);
        next(error);
      }
    }
  );

  router.post(
    '/credentials/:id/share',
    rateLimiters.api,
    sanitizeRequest(),
    validateBody(shareCredentialSchema),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const ownerAddress = (req as AuthenticatedRequest).user?.address;
        if (!ownerAddress) {
          return res.status(401).json({ error: 'Authentication required' });
        }

        const credential = await credentialService.getCredential(req.params.id);
        if (!credential || credential.user_address !== ownerAddress) {
          return res.status(403).json({ error: 'Access denied' });
        }

        const share = await credentialService.shareCredential(
          ownerAddress,
          req.body as ShareCredentialRequest
        );

        await auditService.log({
          type: 'CREDENTIAL_SHARE',
          user_address: ownerAddress,
          client_id: 'credential-service',
          action: 'CREDENTIAL_SHARED',
          status: 'success',
          details: {
            credential_id: req.params.id,
            shared_with: req.body.shared_with_address,
            permissions: req.body.permissions,
          },
          ip_address: req.ip || 'unknown',
          user_agent: req.get('user-agent') || 'unknown',
        });

        res.status(201).json(share);
      } catch (error) {
        logError(req, error as Error);
        next(error);
      }
    }
  );

  router.get(
    '/credentials/shared',
    rateLimiters.api,
    sanitizeRequest(),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const userAddress = (req as AuthenticatedRequest).user?.address;
        if (!userAddress) {
          return res.status(401).json({ error: 'Authentication required' });
        }

        const sharedCredentials = await credentialService.getSharedCredentials(userAddress);
        res.json(sharedCredentials);
      } catch (error) {
        logError(req, error as Error);
        next(error);
      }
    }
  );

  router.post(
    '/credentials/:id/verify',
    rateLimiters.api,
    sanitizeRequest(),
    validateBody(verifyCredentialSchema),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const verifierAddress = (req as AuthenticatedRequest).user?.address;
        if (!verifierAddress) {
          return res.status(401).json({ error: 'Authentication required' });
        }

        const verification = await credentialService.verifyCredential(
          verifierAddress,
          req.body as VerifyCredentialRequest
        );

        await auditService.log({
          type: 'CREDENTIAL_VERIFICATION',
          user_address: verifierAddress,
          client_id: 'credential-service',
          action: 'CREDENTIAL_VERIFIED',
          status: 'success',
          details: {
            credential_id: req.params.id,
            verification_id: verification.id,
            verification_type: req.body.verification_type,
          },
          ip_address: req.ip || 'unknown',
          user_agent: req.get('user-agent') || 'unknown',
        });

        res.status(201).json(verification);
      } catch (error) {
        logError(req, error as Error);
        next(error);
      }
    }
  );

  router.post(
    '/issuance-requests',
    rateLimiters.api,
    sanitizeRequest(),
    validateBody(createIssuanceRequestSchema),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const requesterAddress = (req as AuthenticatedRequest).user?.address;
        if (!requesterAddress) {
          return res.status(401).json({ error: 'Authentication required' });
        }

        const request = await credentialService.createIssuanceRequest(
          requesterAddress,
          req.body as CreateIssuanceRequest
        );

        await auditService.log({
          type: 'ISSUANCE_REQUEST',
          user_address: requesterAddress,
          client_id: 'credential-service',
          action: 'REQUEST_CREATED',
          status: 'success',
          details: {
            request_id: request.id,
            issuer_address: req.body.issuer_address,
            credential_type_id: req.body.credential_type_id,
          },
          ip_address: req.ip || 'unknown',
          user_agent: req.get('user-agent') || 'unknown',
        });

        res.status(201).json(request);
      } catch (error) {
        logError(req, error as Error);
        next(error);
      }
    }
  );

  router.get(
    '/issuance-requests/pending',
    rateLimiters.api,
    sanitizeRequest(),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const issuerAddress = (req as AuthenticatedRequest).user?.address;
        if (!issuerAddress) {
          return res.status(401).json({ error: 'Authentication required' });
        }

        const requests = await credentialService.getPendingIssuanceRequests(issuerAddress);
        res.json(requests);
      } catch (error) {
        logError(req, error as Error);
        next(error);
      }
    }
  );

  router.post(
    '/issuance-requests/:id/approve',
    rateLimiters.api,
    sanitizeRequest(),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const issuerAddress = (req as AuthenticatedRequest).user?.address;
        if (!issuerAddress) {
          return res.status(401).json({ error: 'Authentication required' });
        }

        await credentialService.approveIssuanceRequest(req.params.id, issuerAddress);

        await auditService.log({
          type: 'ISSUANCE_REQUEST',
          user_address: issuerAddress,
          client_id: 'credential-service',
          action: 'REQUEST_APPROVED',
          status: 'success',
          details: { request_id: req.params.id },
          ip_address: req.ip || 'unknown',
          user_agent: req.get('user-agent') || 'unknown',
        });

        res.json({ message: 'Request approved successfully' });
      } catch (error) {
        logError(req, error as Error);
        next(error);
      }
    }
  );

  router.post(
    '/issuance-requests/:id/reject',
    rateLimiters.api,
    sanitizeRequest(),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const issuerAddress = (req as AuthenticatedRequest).user?.address;
        if (!issuerAddress) {
          return res.status(401).json({ error: 'Authentication required' });
        }

        const { reason } = req.body as { reason: string };
        if (!reason) {
          return res.status(400).json({ error: 'Rejection reason is required' });
        }

        await credentialService.rejectIssuanceRequest(req.params.id, issuerAddress, reason);

        await auditService.log({
          type: 'ISSUANCE_REQUEST',
          user_address: issuerAddress,
          client_id: 'credential-service',
          action: 'REQUEST_REJECTED',
          status: 'success',
          details: {
            request_id: req.params.id,
            reason,
          },
          ip_address: req.ip || 'unknown',
          user_agent: req.get('user-agent') || 'unknown',
        });

        res.json({ message: 'Request rejected successfully' });
      } catch (error) {
        logError(req, error as Error);
        next(error);
      }
    }
  );

  return router;
};
