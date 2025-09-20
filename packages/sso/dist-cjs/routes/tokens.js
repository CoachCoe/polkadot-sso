"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTokenRouter = void 0;
const express_1 = require("express");
const rateLimit_js_1 = require("../middleware/rateLimit.js");
const validation_js_1 = require("../middleware/validation.js");
const createTokenRouter = (tokenService, auditService) => {
    const router = (0, express_1.Router)();
    const rateLimiters = (0, rateLimit_js_1.createRateLimiters)(auditService);
    router.post('/refresh', rateLimiters.refresh, (0, validation_js_1.sanitizeRequest)(), async (req, res, next) => {
        try {
            const { refresh_token } = req.body;
            if (!refresh_token || typeof refresh_token !== 'string') {
                res.status(400).json({ error: 'Invalid refresh token' });
                return;
            }
            const session = await tokenService.refreshSession(refresh_token);
            if (!session) {
                res.status(401).json({ error: 'Invalid or expired refresh token' });
                return;
            }
            res.json({
                access_token: session.access_token,
                refresh_token: session.refresh_token,
                expires_in: 900,
            });
        }
        catch (error) {
            next(error);
        }
    });
    return router;
};
exports.createTokenRouter = createTokenRouter;
//# sourceMappingURL=tokens.js.map