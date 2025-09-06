"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const validation_1 = require("../middleware/validation");
const kusamaIntegrationService_1 = require("../services/kusamaIntegrationService");
const logger_1 = require("../utils/logger");
const router = (0, express_1.Router)();
const logger = (0, logger_1.createLogger)('kusama-routes');
const storeCredentialSchema = zod_1.z.object({
    body: zod_1.z.object({
        credentialData: zod_1.z.any(),
        credentialType: zod_1.z.string().min(1),
        userAddress: zod_1.z.string().min(1),
        encryptionKey: zod_1.z.string().optional(),
    }),
});
const retrieveCredentialSchema = zod_1.z.object({
    body: zod_1.z.object({
        credentialId: zod_1.z.string().min(1),
        userAddress: zod_1.z.string().min(1),
        encryptionKey: zod_1.z.string().optional(),
    }),
});
const listCredentialsSchema = zod_1.z.object({
    query: zod_1.z.object({
        userAddress: zod_1.z.string().min(1),
    }),
});
router.post('/store', (0, validation_1.validateBody)(storeCredentialSchema), async (req, res, next) => {
    try {
        const { credentialData, credentialType, userAddress, encryptionKey } = req.body;
        logger.info(`Storing credential of type ${credentialType} for address ${userAddress}`);
        const result = await kusamaIntegrationService_1.kusamaIntegrationService.storeCredential(credentialData, credentialType, userAddress, encryptionKey);
        if (result.success) {
            res.json({
                success: true,
                message: 'Credential stored successfully on Kusama',
                credentialId: result.credentialId,
                transactionHash: result.transactionHash,
                cost: result.cost,
            });
        }
        else {
            res.status(400).json({
                success: false,
                message: 'Failed to store credential',
                error: result.error,
            });
        }
    }
    catch (error) {
        next(error);
    }
});
router.post('/retrieve', (0, validation_1.validateBody)(retrieveCredentialSchema), async (req, res, next) => {
    try {
        const { credentialId, userAddress, encryptionKey } = req.body;
        logger.info(`Retrieving credential ${credentialId} for address ${userAddress}`);
        const credential = await kusamaIntegrationService_1.kusamaIntegrationService.retrieveCredential(credentialId, userAddress, encryptionKey);
        res.json({
            success: true,
            credential,
        });
    }
    catch (error) {
        res.status(404).json({
            success: false,
            message: 'Credential not found or access denied',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
router.get('/list', (0, validation_1.validateBody)(listCredentialsSchema), async (req, res, next) => {
    try {
        const { userAddress } = req.query;
        logger.info(`Listing credentials for address ${userAddress}`);
        const credentials = await kusamaIntegrationService_1.kusamaIntegrationService.listUserCredentials(userAddress);
        res.json({
            success: true,
            credentials,
            count: credentials.length,
        });
    }
    catch (error) {
        next(error);
    }
});
router.get('/cost-estimate', async (req, res, next) => {
    try {
        const dataSize = parseInt(req.query.dataSize) || 1000;
        logger.info(`Getting cost estimate for data size ${dataSize} bytes`);
        const cost = await kusamaIntegrationService_1.kusamaIntegrationService.getStorageCostEstimate(dataSize);
        res.json({
            success: true,
            dataSize,
            estimatedCost: cost,
            currency: 'KSM',
        });
    }
    catch (error) {
        next(error);
    }
});
router.post('/verify', async (req, res, next) => {
    try {
        const { credential } = req.body;
        if (!credential) {
            return res.status(400).json({
                success: false,
                message: 'Credential object is required',
            });
        }
        logger.info(`Verifying credential ${String(credential.id ?? 'unknown')}`);
        const isValid = await kusamaIntegrationService_1.kusamaIntegrationService.verifyCredential(credential);
        res.json({
            success: true,
            isValid,
            credentialId: credential.id,
        });
    }
    catch (error) {
        next(error);
    }
});
router.post('/init', async (req, res, next) => {
    try {
        logger.info('Initializing Kusama integration service...');
        const success = await kusamaIntegrationService_1.kusamaIntegrationService.initialize();
        if (success) {
            res.json({
                success: true,
                message: 'Kusama integration service initialized successfully',
            });
        }
        else {
            res.status(500).json({
                success: false,
                message: 'Failed to initialize Kusama integration service',
            });
        }
    }
    catch (error) {
        next(error);
    }
});
router.get('/health', async (req, res, next) => {
    try {
        logger.info('Checking Kusama network health...');
        const health = await kusamaIntegrationService_1.kusamaIntegrationService.getNetworkHealth();
        res.json({
            success: true,
            health,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to check network health',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
router.get('/monitors', async (req, res, next) => {
    try {
        logger.info('Getting active transaction monitors...');
        const monitors = await kusamaIntegrationService_1.kusamaIntegrationService.getActiveMonitors();
        res.json({
            success: true,
            activeMonitors: monitors,
            count: monitors.length,
        });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=kusama.js.map