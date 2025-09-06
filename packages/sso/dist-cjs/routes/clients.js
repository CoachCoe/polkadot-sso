"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createClientRouter = void 0;
const crypto_1 = __importDefault(require("crypto"));
const express_1 = require("express");
const createClientRouter = () => {
    const router = (0, express_1.Router)();
    router.post('/register', async (req, res, next) => {
        try {
            const { name, redirect_urls, allowed_origins } = req.body;
            if (!name || !redirect_urls || !allowed_origins) {
                res.status(400).json({ error: 'Missing required fields' });
                return;
            }
            const clientId = crypto_1.default.randomUUID();
            const clientSecret = crypto_1.default.randomBytes(32).toString('hex');
            // TODO: Create a ClientService to handle this operation
            res.json({
                client_id: clientId,
                client_secret: clientSecret,
                name,
                redirect_urls,
                allowed_origins,
            });
        }
        catch (error) {
            next(error);
        }
    });
    return router;
};
exports.createClientRouter = createClientRouter;
//# sourceMappingURL=clients.js.map