"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAuthRouter = void 0;
const express_1 = require("express");
const validation_js_1 = require("../../middleware/validation.js");
const security_js_1 = require("../../middleware/security.js");
const schemas_js_1 = require("../../utils/schemas.js");
const handlers_js_1 = require("./handlers.js");
const templates_js_1 = require("./templates.js");
const createAuthRouter = (tokenService, challengeService, auditService, clients, db, rateLimiters) => {
    const router = (0, express_1.Router)();
    const loginHandler = (0, handlers_js_1.createLoginHandler)(tokenService, challengeService, auditService, clients, db);
    const verifyHandler = (0, handlers_js_1.createVerifyHandler)(challengeService, auditService, clients, db);
    const tokenHandler = (0, handlers_js_1.createTokenHandler)(tokenService, auditService, db);
    router.get('/challenge', rateLimiters.challenge, (0, validation_js_1.sanitizeRequest)(), security_js_1.nonceMiddleware, (0, validation_js_1.validateQuery)(schemas_js_1.schemas.challengeQuery), async (req, res) => {
        try {
            const { client_id, address } = req.query;
            const client = clients.get(client_id);
            if (!client) {
                return res.status(400).json({ error: 'Invalid client' });
            }
            const challenge = await challengeService.generateChallenge(client_id, address);
            const html = (0, templates_js_1.generateChallengePage)({
                address: address,
                message: challenge.message,
                challengeId: challenge.id,
                codeVerifier: challenge.code_verifier,
                state: challenge.state,
                nonce: res.locals.nonce,
            }, res.locals.nonce);
            res.send(html);
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to generate challenge page' });
        }
    });
    router.get('/docs', (req, res) => {
        const html = (0, templates_js_1.generateApiDocsPage)();
        res.send(html);
    });
    router.get('/login', rateLimiters.login, (0, validation_js_1.sanitizeRequest)(), (0, validation_js_1.validateQuery)(schemas_js_1.schemas.challengeQuery), loginHandler);
    router.post('/verify', rateLimiters.verify, (0, validation_js_1.sanitizeRequest)(), (0, validation_js_1.validateQuery)(schemas_js_1.schemas.verificationQuery), verifyHandler);
    router.post('/token', rateLimiters.token, (0, validation_js_1.sanitizeRequest)(), (0, validation_js_1.validateBody)(schemas_js_1.schemas.tokenRequest), tokenHandler);
    router.get('/callback', (req, res) => {
        const { code, state, error } = req.query;
        if (error) {
            return res.status(400).json({ error: 'Authorization failed', details: error });
        }
        if (!code || !state) {
            return res.status(400).json({ error: 'Missing authorization code or state' });
        }
        res.json({
            message: 'Authorization successful',
            code,
            state,
            next_step: 'Exchange code for tokens using POST /token',
        });
    });
    router.post('/logout', rateLimiters.logout, (0, validation_js_1.sanitizeRequest)(), async (req, res) => {
        try {
            const { access_token } = req.body;
            if (!access_token) {
                return res.status(400).json({ error: 'Access token required' });
            }
            await tokenService.invalidateSession(access_token);
            await auditService.log({
                type: 'SECURITY_EVENT',
                user_address: req.body.address,
                client_id: req.body.client_id || 'unknown',
                action: 'session_invalidated',
                status: 'success',
                details: { access_token: access_token.substring(0, 16) + '...' },
                ip_address: req.ip || 'unknown',
                user_agent: req.get('User-Agent'),
            });
            res.json({ message: 'Logged out successfully' });
        }
        catch (error) {
            res.status(500).json({ error: 'Logout failed' });
        }
    });
    return router;
};
exports.createAuthRouter = createAuthRouter;
//# sourceMappingURL=index.js.map