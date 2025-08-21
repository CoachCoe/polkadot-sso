"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createHybridCredentialRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
// Import from modular structure
const modules_1 = require("../modules");
const logger_1 = require("../utils/logger");
// Validation schemas
const createHybridCredentialSchema = zod_1.z.object({
    body: zod_1.z.object({
        user_address: zod_1.z.string().min(1),
        credential_type_id: zod_1.z.string().uuid(),
        credential_data: zod_1.z.record(zod_1.z.unknown()),
        expires_at: zod_1.z.number().optional(),
        metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
        storage_preference: zod_1.z.enum(['local', 'ipfs', 'hybrid']).optional(),
        pin_to_ipfs: zod_1.z.boolean().optional(),
        store_on_kusama: zod_1.z.boolean().optional(),
    }),
});
const migrateCredentialSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().uuid(),
    }),
});
const verifyIntegritySchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().uuid(),
    }),
});
const createHybridCredentialRouter = (hybridCredentialService, auditService) => {
    const router = (0, express_1.Router)();
    const rateLimiters = (0, modules_1.createRateLimiters)(auditService);
    // Create hybrid credential
    router.post('/credentials', rateLimiters.api, (0, modules_1.sanitizeRequest)(), (0, modules_1.validateBody)(createHybridCredentialSchema), async (req, res, next) => {
        try {
            const issuerAddress = req.user?.address;
            if (!issuerAddress) {
                return res.status(401).json({ error: 'Authentication required' });
            }
            const { user_address, ...requestBody } = req.body;
            // Construct a properly typed request object with explicit casting to overcome ESLint type checking
            const request = requestBody;
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
            const credential = await hybridCredentialService.createCredential(issuerAddress, String(user_address), request);
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
            res.status(201).json(credential);
        }
        catch (error) {
            (0, logger_1.logError)(req, error);
            next(error);
        }
    });
    // Get hybrid credentials for user
    router.get('/credentials', rateLimiters.api, (0, modules_1.sanitizeRequest)(), async (req, res, next) => {
        try {
            const userAddress = req.user?.address;
            if (!userAddress) {
                return res.status(401).json({ error: 'Authentication required' });
            }
            const credentials = await hybridCredentialService.getUserCredentials(userAddress);
            res.json(credentials);
        }
        catch (error) {
            (0, logger_1.logError)(req, error);
            next(error);
        }
    });
    // Get specific hybrid credential
    router.get('/credentials/:id', rateLimiters.api, (0, modules_1.sanitizeRequest)(), async (req, res, next) => {
        try {
            const userAddress = req.user?.address;
            if (!userAddress) {
                return res.status(401).json({ error: 'Authentication required' });
            }
            const credential = await hybridCredentialService.getCredential(req.params.id);
            if (!credential) {
                return res.status(404).json({ error: 'Credential not found' });
            }
            // Check access permissions
            if (credential.user_address !== userAddress) {
                const sharedCredentials = await hybridCredentialService.getSharedCredentials(userAddress);
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
    // Get credential data (decrypted)
    router.get('/credentials/:id/data', rateLimiters.api, (0, modules_1.sanitizeRequest)(), async (req, res, next) => {
        try {
            const userAddress = req.user?.address;
            if (!userAddress) {
                return res.status(401).json({ error: 'Authentication required' });
            }
            const credential = await hybridCredentialService.getCredential(req.params.id);
            if (!credential) {
                return res.status(404).json({ error: 'Credential not found' });
            }
            // Check access permissions
            if (credential.user_address !== userAddress) {
                const sharedCredentials = await hybridCredentialService.getSharedCredentials(userAddress);
                const hasAccess = sharedCredentials.some(share => share.credential_id === req.params.id);
                if (!hasAccess) {
                    return res.status(403).json({ error: 'Access denied' });
                }
            }
            const credentialData = await hybridCredentialService.getCredentialData(req.params.id);
            if (!credentialData) {
                return res.status(404).json({ error: 'Credential data not found' });
            }
            res.json({
                credential_id: req.params.id,
                data: credentialData,
                storage_type: credential.storage_type,
                ipfs_hash: credential.ipfs_hash,
                kusama_reference: credential.kusama_reference,
            });
        }
        catch (error) {
            (0, logger_1.logError)(req, error);
            next(error);
        }
    });
    // Verify credential integrity across all storage layers
    router.get('/credentials/:id/verify-integrity', rateLimiters.api, (0, modules_1.sanitizeRequest)(), (0, modules_1.validateBody)(verifyIntegritySchema), async (req, res, next) => {
        try {
            const userAddress = req.user?.address;
            if (!userAddress) {
                return res.status(401).json({ error: 'Authentication required' });
            }
            const integrityResult = await hybridCredentialService.verifyCredentialIntegrity(req.params.id);
            await auditService.log({
                type: 'CREDENTIAL_INTEGRITY',
                user_address: userAddress,
                client_id: 'hybrid-credential-service',
                action: 'INTEGRITY_VERIFIED',
                status: integrityResult.valid ? 'success' : 'failure',
                details: {
                    credential_id: req.params.id,
                    integrity_result: integrityResult,
                },
                ip_address: req.ip || 'unknown',
                user_agent: req.get('user-agent') || 'unknown',
            });
            res.json(integrityResult);
        }
        catch (error) {
            (0, logger_1.logError)(req, error);
            next(error);
        }
    });
    // Migrate credential to IPFS storage
    router.post('/credentials/:id/migrate-to-ipfs', rateLimiters.api, (0, modules_1.sanitizeRequest)(), (0, modules_1.validateBody)(migrateCredentialSchema), async (req, res, next) => {
        try {
            const userAddress = req.user?.address;
            if (!userAddress) {
                return res.status(401).json({ error: 'Authentication required' });
            }
            const credential = await hybridCredentialService.getCredential(req.params.id);
            if (!credential) {
                return res.status(404).json({ error: 'Credential not found' });
            }
            // Only credential owner can migrate
            if (credential.user_address !== userAddress) {
                return res.status(403).json({ error: 'Access denied' });
            }
            const migratedCredential = await hybridCredentialService.migrateToIPFS(req.params.id);
            await auditService.log({
                type: 'CREDENTIAL_MIGRATION',
                user_address: userAddress,
                client_id: 'hybrid-credential-service',
                action: 'MIGRATED_TO_IPFS',
                status: 'success',
                details: {
                    credential_id: req.params.id,
                    new_storage_type: migratedCredential.storage_type,
                    ipfs_hash: migratedCredential.ipfs_hash,
                    kusama_reference: migratedCredential.kusama_reference ? 'stored' : 'not stored',
                },
                ip_address: req.ip || 'unknown',
                user_agent: req.get('user-agent') || 'unknown',
            });
            res.json(migratedCredential);
        }
        catch (error) {
            (0, logger_1.logError)(req, error);
            next(error);
        }
    });
    // Get storage statistics
    router.get('/storage/stats', rateLimiters.api, (0, modules_1.sanitizeRequest)(), async (req, res, next) => {
        try {
            const userAddress = req.user?.address;
            if (!userAddress) {
                return res.status(401).json({ error: 'Authentication required' });
            }
            const stats = await hybridCredentialService.getStorageStats();
            res.json(stats);
        }
        catch (error) {
            (0, logger_1.logError)(req, error);
            next(error);
        }
    });
    // Test IPFS connection
    router.get('/storage/ipfs/test', rateLimiters.api, (0, modules_1.sanitizeRequest)(), async (req, res, next) => {
        try {
            const userAddress = req.user?.address;
            if (!userAddress) {
                return res.status(401).json({ error: 'Authentication required' });
            }
            // This would require access to the IPFS service
            // For now, return a placeholder response
            res.json({
                status: 'test_endpoint',
                message: 'IPFS connection test endpoint - implement with service access',
            });
        }
        catch (error) {
            (0, logger_1.logError)(req, error);
            next(error);
        }
    });
    // Test Kusama connection
    router.get('/storage/kusama/test', rateLimiters.api, (0, modules_1.sanitizeRequest)(), async (req, res, next) => {
        try {
            const userAddress = req.user?.address;
            if (!userAddress) {
                return res.status(401).json({ error: 'Authentication required' });
            }
            // This would require access to the Kusama service
            // For now, return a placeholder response
            res.json({
                status: 'test_endpoint',
                message: 'Kusama connection test endpoint - implement with service access',
            });
        }
        catch (error) {
            (0, logger_1.logError)(req, error);
            next(error);
        }
    });
    return router;
};
exports.createHybridCredentialRouter = createHybridCredentialRouter;
//# sourceMappingURL=hybridCredentials.js.map