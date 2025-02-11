"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authLimiter = exports.JWT_CONFIG = void 0;
const express_rate_limit_1 = require("express-rate-limit");
exports.JWT_CONFIG = {
    algorithm: 'HS512',
    issuer: 'polkadot-sso',
    accessTokenExpiry: 15 * 60, // 15 minutes
    refreshTokenExpiry: 7 * 24 * 60 * 60 // 7 days
};
exports.authLimiter = (0, express_rate_limit_1.rateLimit)({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: 'Too many authentication attempts, please try again later'
});
