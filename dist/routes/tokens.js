"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTokenRouter = void 0;
const express_1 = require("express");
const rateLimit_1 = require("../middleware/rateLimit");
const validation_1 = require("../middleware/validation");
const createTokenRouter = (tokenService, db, auditService) => {
    const router = (0, express_1.Router)();
    const rateLimiters = (0, rateLimit_1.createRateLimiters)(auditService);
    router.post('/refresh', rateLimiters.refresh, (0, validation_1.sanitizeRequest)(), async (req, res, next) => {
        try {
            const { refresh_token } = req.body;
            // Type guard for refresh_token
            if (!refresh_token || typeof refresh_token !== 'string') {
                res.status(400).json({ error: 'Invalid refresh token' });
                return;
            }
            const verification = await tokenService.verifyToken(refresh_token, 'refresh');
            if (!verification.valid || !verification.decoded) {
                res.status(401).json({ error: verification.error || 'Verification failed' });
                return;
            }
            const { decoded } = verification;
            if (!decoded) {
                res.status(401).json({ error: 'Invalid token data' });
                return;
            }
            // Type guard to ensure decoded has the expected structure
            if (!decoded ||
                typeof decoded !== 'object' ||
                !('address' in decoded) ||
                !('client_id' in decoded)) {
                res.status(401).json({ error: 'Invalid token data' });
                return;
            }
            if (!decoded.address || !decoded.client_id) {
                res.status(401).json({ error: 'Invalid token data' });
                return;
            }
            const tokens = tokenService.generateTokens(decoded.address, decoded.client_id);
            const { accessToken, refreshToken, fingerprint, accessJwtid, refreshJwtid } = tokens;
            await db.run(`UPDATE sessions SET
            access_token = ?,
            refresh_token = ?,
            access_token_id = ?,
            refresh_token_id = ?,
            fingerprint = ?,
            access_token_expires_at = ?,
            refresh_token_expires_at = ?,
            last_used_at = ?
          WHERE address = ? AND client_id = ?`, [
                accessToken,
                refreshToken,
                accessJwtid,
                refreshJwtid,
                fingerprint,
                Date.now() + 15 * 60 * 1000,
                Date.now() + 7 * 24 * 60 * 60 * 1000,
                Date.now(),
                decoded.address,
                decoded.client_id,
            ]);
            res.json({
                access_token: accessToken,
                refresh_token: refreshToken,
                fingerprint,
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