"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const validation_1 = require("../middleware/validation");
const walletBasedKusamaService_1 = require("../services/walletBasedKusamaService");
const logger_1 = require("../utils/logger");
const router = (0, express_1.Router)();
const logger = (0, logger_1.createLogger)('wallet-kusama-routes');
const walletKusamaService = new walletBasedKusamaService_1.WalletBasedKusamaService();
walletKusamaService.initialize().catch(error => {
    logger.error('Failed to initialize wallet-based Kusama service', { error });
});
const authenticateUser = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Authorization header required' });
        }
        const token = authHeader.substring(7);
        if (!token || token.length < 32) {
            return res.status(401).json({ error: 'Invalid token' });
        }
        const userAddress = req.body.userAddress || req.query.userAddress;
        if (!userAddress) {
            return res.status(400).json({ error: 'User address required' });
        }
        req.userAddress = userAddress;
        next();
    }
    catch (error) {
        logger.error('Authentication failed', { error });
        res.status(401).json({ error: 'Authentication failed' });
    }
};
const storeCredentialSchema = zod_1.z.object({
    body: zod_1.z.object({
        credentialData: zod_1.z.record(zod_1.z.unknown()),
        credentialType: zod_1.z.string().min(1),
        userAddress: zod_1.z.string().min(1),
        userSignature: zod_1.z.string().optional(),
        userMessage: zod_1.z.string().optional(),
    }),
});
const retrieveCredentialSchema = zod_1.z.object({
    body: zod_1.z.object({
        credentialId: zod_1.z.string().min(1),
        userAddress: zod_1.z.string().min(1),
        userSignature: zod_1.z.string().optional(),
    }),
});
const listCredentialsSchema = zod_1.z.object({
    query: zod_1.z.object({
        userAddress: zod_1.z.string().min(1),
        userSignature: zod_1.z.string().optional(),
    }),
});
const costEstimateSchema = zod_1.z.object({
    query: zod_1.z.object({
        dataSize: zod_1.z.string().transform(val => parseInt(val, 10)),
        userAddress: zod_1.z.string().min(1),
    }),
});
router.post('/store', (0, validation_1.validateBody)(storeCredentialSchema), authenticateUser, async (req, res) => {
    try {
        const { credentialData, credentialType, userAddress, userSignature, userMessage } = req.body;
        logger.info('Storing credential with wallet authentication', {
            credentialType,
            userAddress,
            hasSignature: !!userSignature,
        });
        const result = await walletKusamaService.storeCredentialWithWallet(userAddress, credentialData, credentialType, userSignature, userMessage);
        res.json({
            success: true,
            message: 'Credential stored successfully with wallet authentication',
            credentialId: result.credentialId,
            storageMethod: result.storageMethod,
            cost: 0.001, // Mock cost for now
        });
    }
    catch (error) {
        logger.error('Failed to store credential with wallet', { error });
        res.status(500).json({
            success: false,
            message: 'Failed to store credential',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
router.post('/retrieve', (0, validation_1.validateBody)(retrieveCredentialSchema), authenticateUser, async (req, res) => {
    try {
        const { credentialId, userAddress, userSignature } = req.body;
        logger.info('Retrieving credential with wallet authentication', {
            credentialId,
            userAddress,
        });
        const credential = await walletKusamaService.retrieveCredentialWithWallet(credentialId, userAddress, userSignature);
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
    }
    catch (error) {
        logger.error('Failed to retrieve credential with wallet', { error });
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve credential',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
router.get('/list', (0, validation_1.validateBody)(listCredentialsSchema), authenticateUser, async (req, res) => {
    try {
        const { userAddress, userSignature } = req.query;
        logger.info('Listing credentials with wallet authentication', {
            userAddress: userAddress,
        });
        const credentials = await walletKusamaService.listCredentialsWithWallet(userAddress, userSignature);
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
    }
    catch (error) {
        logger.error('Failed to list credentials with wallet', { error });
        res.status(500).json({
            success: false,
            message: 'Failed to list credentials',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
router.get('/cost-estimate', (0, validation_1.validateBody)(costEstimateSchema), async (req, res) => {
    try {
        const { dataSize, userAddress } = req.query;
        logger.info('Getting cost estimate for wallet-based storage', {
            dataSize: Number(dataSize),
            userAddress: userAddress,
        });
        const estimate = await walletKusamaService.estimateStorageCost(Number(dataSize), userAddress);
        res.json({
            success: true,
            dataSize: Number(dataSize),
            estimatedCost: estimate.estimatedCost,
            currency: estimate.currency,
            storageMethod: estimate.storageMethod,
        });
    }
    catch (error) {
        logger.error('Failed to get cost estimate', { error });
        res.status(500).json({
            success: false,
            message: 'Failed to get cost estimate',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
router.get('/health', async (req, res) => {
    try {
        const health = await walletKusamaService.getNetworkHealth();
        res.json({
            success: true,
            health,
        });
    }
    catch (error) {
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
exports.default = router;
//# sourceMappingURL=walletKusama.js.map