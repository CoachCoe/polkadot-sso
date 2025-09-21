"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAuthRouter = void 0;
const express_1 = require("express");
const security_js_1 = require("../../middleware/security.js");
const validation_js_1 = require("../../middleware/validation.js");
const logger_js_1 = require("../../utils/logger.js");
const schemas_js_1 = require("../../utils/schemas.js");
const handlers_js_1 = require("./handlers.js");
const templates_js_1 = require("./templates.js");
const createAuthRouter = (tokenService, challengeService, auditService, clients, db, rateLimiters) => {
    const router = (0, express_1.Router)();
    const logger = (0, logger_js_1.createLogger)('auth-router');
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
    router.get('/status/:challengeId', rateLimiters.status, (0, validation_js_1.sanitizeRequest)(), async (req, res) => {
        try {
            const { challengeId } = req.params;
            if (!challengeId) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Challenge ID is required'
                });
            }
            // Get challenge from database
            const challenge = await challengeService.getChallenge(challengeId);
            if (!challenge) {
                return res.status(404).json({
                    status: 'not_found',
                    message: 'Challenge not found'
                });
            }
            // Check if challenge is expired
            const now = Date.now();
            const expiresAt = new Date(challenge.expires_at).getTime();
            if (now > expiresAt) {
                return res.status(200).json({
                    status: 'expired',
                    message: 'Challenge has expired',
                    expiresAt: challenge.expires_at_timestamp
                });
            }
            // Check if challenge has been used
            if (challenge.used) {
                return res.status(200).json({
                    status: 'used',
                    message: 'Challenge has already been used',
                    expiresAt: challenge.expires_at_timestamp
                });
            }
            // Challenge is valid and pending
            return res.status(200).json({
                status: 'pending',
                message: 'Challenge is pending verification',
                expiresAt: challenge.expires_at_timestamp,
                challengeId: challenge.id
            });
        }
        catch (error) {
            logger.error('Failed to get challenge status', {
                error: error instanceof Error ? error.message : String(error),
                challengeId: req.params.challengeId,
            });
            res.status(500).json({
                status: 'error',
                message: 'Failed to get challenge status'
            });
        }
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