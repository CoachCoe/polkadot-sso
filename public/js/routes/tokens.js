"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTokenRouter = void 0;
const express_1 = require("express");
const createTokenRouter = (tokenService, db) => {
    const router = (0, express_1.Router)();
    router.post('/refresh', async (req, res, next) => {
        try {
            const { refresh_token } = req.body;
            if (!refresh_token) {
                res.status(400).json({ error: 'Refresh token required' });
                return;
            }
            const verification = await tokenService.verifyToken(refresh_token, 'refresh');
            if (!verification.valid || !verification.decoded) {
                res.status(401).json({ error: verification.error });
                return;
            }
            const { decoded } = verification;
            const { accessToken, refreshToken, fingerprint, accessJwtid, refreshJwtid } = tokenService.generateTokens(decoded.address, decoded.client_id);
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
                Date.now() + (15 * 60 * 1000),
                Date.now() + (7 * 24 * 60 * 60 * 1000),
                Date.now(),
                decoded.address,
                decoded.client_id
            ]);
            res.json({
                access_token: accessToken,
                refresh_token: refreshToken,
                fingerprint,
                expires_in: 900
            });
        }
        catch (error) {
            next(error);
        }
    });
    return router;
};
exports.createTokenRouter = createTokenRouter;
