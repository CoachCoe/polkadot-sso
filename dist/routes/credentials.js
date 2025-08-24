"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCredentialRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const rateLimit_1 = require("../middleware/rateLimit");
const validation_1 = require("../middleware/validation");
const logger_1 = require("../utils/logger");
const validateCredentialBody = (schema) => {
    return (req, res, next) => {
        try {
            schema.parse(req.body);
            next();
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                res.status(400).json({
                    error: 'Validation failed',
                    details: error.errors,
                });
            }
            else {
                next(error);
            }
        }
    };
};
const createUserProfileSchema = zod_1.z.object({
    display_name: zod_1.z.string().optional(),
    email: zod_1.z.string().email().optional(),
    avatar_url: zod_1.z.string().url().optional(),
    bio: zod_1.z.string().optional(),
    website: zod_1.z.string().url().optional(),
    location: zod_1.z.string().optional(),
    timezone: zod_1.z.string().optional(),
    preferences: zod_1.z.record(zod_1.z.any()).optional(),
});
const createCredentialSchema = zod_1.z.object({
    user_address: zod_1.z.string(),
    credential_type_id: zod_1.z.string().uuid(),
    credential_data: zod_1.z.record(zod_1.z.any()),
    expires_at: zod_1.z.number().optional(),
    metadata: zod_1.z.record(zod_1.z.any()).optional(),
});
const shareCredentialSchema = zod_1.z.object({
    credential_id: zod_1.z.string().uuid(),
    shared_with_address: zod_1.z.string(),
    shared_with_client_id: zod_1.z.string().optional(),
    permissions: zod_1.z.array(zod_1.z.string()),
    access_level: zod_1.z.enum(['read', 'write', 'admin']),
    expires_at: zod_1.z.number().optional(),
});
const verifyCredentialSchema = zod_1.z.object({
    credential_id: zod_1.z.string().uuid(),
    verification_type: zod_1.z.enum(['proof', 'signature', 'manual', 'automated']),
    verification_data: zod_1.z.record(zod_1.z.any()).optional(),
    notes: zod_1.z.string().optional(),
});
const createIssuanceRequestSchema = zod_1.z.object({
    issuer_address: zod_1.z.string(),
    credential_type_id: zod_1.z.string().uuid(),
    template_id: zod_1.z.string().uuid().optional(),
    request_data: zod_1.z.record(zod_1.z.any()),
    expires_at: zod_1.z.number().optional(),
});
const createCredentialTypeSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    description: zod_1.z.string().optional(),
    schema_version: zod_1.z.string().min(1),
    schema_definition: zod_1.z.string(),
    issuer_pattern: zod_1.z.string().optional(),
    required_fields: zod_1.z.array(zod_1.z.string()),
    optional_fields: zod_1.z.array(zod_1.z.string()),
    validation_rules: zod_1.z.record(zod_1.z.any()),
});
const createCredentialRouter = (credentialService, auditService) => {
    const router = (0, express_1.Router)();
    const rateLimiters = (0, rateLimit_1.createRateLimiters)(auditService);
    router.post('/profiles', rateLimiters.api, (0, validation_1.sanitizeRequest)(), validateCredentialBody(createUserProfileSchema), async (req, res, next) => {
        try {
            const userAddress = req.user?.address;
            if (!userAddress) {
                return res.status(401).json({ error: 'Authentication required' });
            }
            const existingProfile = await credentialService.getUserProfile(userAddress);
            if (existingProfile) {
                return res.status(409).json({ error: 'Profile already exists' });
            }
            const profile = await credentialService.createUserProfile(userAddress, req.body);
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
        }
        catch (error) {
            (0, logger_1.logError)(req, error);
            next(error);
        }
    });
    router.get('/profiles/me', rateLimiters.api, (0, validation_1.sanitizeRequest)(), async (req, res, next) => {
        try {
            const userAddress = req.user?.address;
            if (!userAddress) {
                return res.status(401).json({ error: 'Authentication required' });
            }
            const profile = await credentialService.getUserProfile(userAddress);
            if (!profile) {
                return res.status(404).json({ error: 'Profile not found' });
            }
            res.json(profile);
        }
        catch (error) {
            (0, logger_1.logError)(req, error);
            next(error);
        }
    });
    router.put('/profiles/me', rateLimiters.api, (0, validation_1.sanitizeRequest)(), (0, validation_1.validateBody)(createUserProfileSchema), async (req, res, next) => {
        try {
            const userAddress = req.user?.address;
            if (!userAddress) {
                return res.status(401).json({ error: 'Authentication required' });
            }
            await credentialService.updateUserProfile(userAddress, req.body);
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
        }
        catch (error) {
            (0, logger_1.logError)(req, error);
            next(error);
        }
    });
    router.post('/types', rateLimiters.api, (0, validation_1.sanitizeRequest)(), (0, validation_1.validateBody)(createCredentialTypeSchema), async (req, res, next) => {
        try {
            const userAddress = req.user?.address;
            if (!userAddress) {
                return res.status(401).json({ error: 'Authentication required' });
            }
            const credentialType = await credentialService.createCredentialType(userAddress, {
                ...req.body,
                required_fields: JSON.stringify(req.body.required_fields),
                optional_fields: JSON.stringify(req.body.optional_fields),
                validation_rules: JSON.stringify(req.body.validation_rules),
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
        }
        catch (error) {
            (0, logger_1.logError)(req, error);
            next(error);
        }
    });
    router.get('/types', rateLimiters.api, (0, validation_1.sanitizeRequest)(), async (req, res, next) => {
        try {
            const types = await credentialService.getActiveCredentialTypes();
            res.json(types);
        }
        catch (error) {
            (0, logger_1.logError)(req, error);
            next(error);
        }
    });
    router.get('/types/:id', rateLimiters.api, (0, validation_1.sanitizeRequest)(), async (req, res, next) => {
        try {
            const type = await credentialService.getCredentialType(req.params.id);
            if (!type) {
                return res.status(404).json({ error: 'Credential type not found' });
            }
            res.json(type);
        }
        catch (error) {
            (0, logger_1.logError)(req, error);
            next(error);
        }
    });
    router.post('/credentials', rateLimiters.api, (0, validation_1.sanitizeRequest)(), (0, validation_1.validateBody)(createCredentialSchema), async (req, res, next) => {
        try {
            const issuerAddress = req.user?.address;
            if (!issuerAddress) {
                return res.status(401).json({ error: 'Authentication required' });
            }
            const { user_address, ...request } = req.body;
            const credential = await credentialService.createCredential(issuerAddress, user_address, request);
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
        }
        catch (error) {
            (0, logger_1.logError)(req, error);
            next(error);
        }
    });
    router.get('/credentials', rateLimiters.api, (0, validation_1.sanitizeRequest)(), async (req, res, next) => {
        try {
            const userAddress = req.user?.address;
            if (!userAddress) {
                return res.status(401).json({ error: 'Authentication required' });
            }
            const credentials = await credentialService.getUserCredentials(userAddress);
            res.json(credentials);
        }
        catch (error) {
            (0, logger_1.logError)(req, error);
            next(error);
        }
    });
    router.get('/credentials/:id', rateLimiters.api, (0, validation_1.sanitizeRequest)(), async (req, res, next) => {
        try {
            const userAddress = req.user?.address;
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
        }
        catch (error) {
            (0, logger_1.logError)(req, error);
            next(error);
        }
    });
    router.get('/credentials/:id/data', rateLimiters.api, (0, validation_1.sanitizeRequest)(), async (req, res, next) => {
        try {
            const userAddress = req.user?.address;
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
        }
        catch (error) {
            (0, logger_1.logError)(req, error);
            next(error);
        }
    });
    router.post('/credentials/:id/share', rateLimiters.api, (0, validation_1.sanitizeRequest)(), (0, validation_1.validateBody)(shareCredentialSchema), async (req, res, next) => {
        try {
            const ownerAddress = req.user?.address;
            if (!ownerAddress) {
                return res.status(401).json({ error: 'Authentication required' });
            }
            const credential = await credentialService.getCredential(req.params.id);
            if (!credential || credential.user_address !== ownerAddress) {
                return res.status(403).json({ error: 'Access denied' });
            }
            const share = await credentialService.shareCredential(ownerAddress, req.body);
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
        }
        catch (error) {
            (0, logger_1.logError)(req, error);
            next(error);
        }
    });
    router.get('/credentials/shared', rateLimiters.api, (0, validation_1.sanitizeRequest)(), async (req, res, next) => {
        try {
            const userAddress = req.user?.address;
            if (!userAddress) {
                return res.status(401).json({ error: 'Authentication required' });
            }
            const sharedCredentials = await credentialService.getSharedCredentials(userAddress);
            res.json(sharedCredentials);
        }
        catch (error) {
            (0, logger_1.logError)(req, error);
            next(error);
        }
    });
    router.post('/credentials/:id/verify', rateLimiters.api, (0, validation_1.sanitizeRequest)(), (0, validation_1.validateBody)(verifyCredentialSchema), async (req, res, next) => {
        try {
            const verifierAddress = req.user?.address;
            if (!verifierAddress) {
                return res.status(401).json({ error: 'Authentication required' });
            }
            const verification = await credentialService.verifyCredential(verifierAddress, req.body);
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
        }
        catch (error) {
            (0, logger_1.logError)(req, error);
            next(error);
        }
    });
    router.post('/issuance-requests', rateLimiters.api, (0, validation_1.sanitizeRequest)(), (0, validation_1.validateBody)(createIssuanceRequestSchema), async (req, res, next) => {
        try {
            const requesterAddress = req.user?.address;
            if (!requesterAddress) {
                return res.status(401).json({ error: 'Authentication required' });
            }
            const request = await credentialService.createIssuanceRequest(requesterAddress, req.body);
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
        }
        catch (error) {
            (0, logger_1.logError)(req, error);
            next(error);
        }
    });
    router.get('/issuance-requests/pending', rateLimiters.api, (0, validation_1.sanitizeRequest)(), async (req, res, next) => {
        try {
            const issuerAddress = req.user?.address;
            if (!issuerAddress) {
                return res.status(401).json({ error: 'Authentication required' });
            }
            const requests = await credentialService.getPendingIssuanceRequests(issuerAddress);
            res.json(requests);
        }
        catch (error) {
            (0, logger_1.logError)(req, error);
            next(error);
        }
    });
    router.post('/issuance-requests/:id/approve', rateLimiters.api, (0, validation_1.sanitizeRequest)(), async (req, res, next) => {
        try {
            const issuerAddress = req.user?.address;
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
        }
        catch (error) {
            (0, logger_1.logError)(req, error);
            next(error);
        }
    });
    router.post('/issuance-requests/:id/reject', rateLimiters.api, (0, validation_1.sanitizeRequest)(), async (req, res, next) => {
        try {
            const issuerAddress = req.user?.address;
            if (!issuerAddress) {
                return res.status(401).json({ error: 'Authentication required' });
            }
            const { reason } = req.body;
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
        }
        catch (error) {
            (0, logger_1.logError)(req, error);
            next(error);
        }
    });
    return router;
};
exports.createCredentialRouter = createCredentialRouter;
//# sourceMappingURL=credentials.js.map