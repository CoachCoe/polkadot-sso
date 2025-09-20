"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCredentialRouter = void 0;
const express_1 = require("express");
const createCredentialRouter = (credentialService) => {
    const router = (0, express_1.Router)();
    // Create credential
    router.post('/', async (req, res) => {
        try {
            const credential = await credentialService.createCredential(req.body);
            res.json(credential);
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to create credential' });
        }
    });
    // Get credential
    router.get('/:id', async (req, res) => {
        try {
            const credential = await credentialService.getCredential(req.params.id);
            res.json(credential);
        }
        catch (error) {
            res.status(404).json({ error: 'Credential not found' });
        }
    });
    // List credentials
    router.get('/', async (req, res) => {
        try {
            const credentials = await credentialService.listCredentials();
            res.json(credentials);
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to list credentials' });
        }
    });
    return router;
};
exports.createCredentialRouter = createCredentialRouter;
//# sourceMappingURL=credentials.js.map