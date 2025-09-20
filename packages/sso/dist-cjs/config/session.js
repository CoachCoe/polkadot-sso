"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessionConfig = void 0;
const connect_redis_1 = __importDefault(require("connect-redis"));
const crypto_1 = require("crypto");
const redis_1 = require("redis");
const logger_js_1 = require("../utils/logger.js");
const logger = (0, logger_js_1.createLogger)('session-config');
logger.info('Session configuration loaded', {
    sessionSecretConfigured: !!process.env.SESSION_SECRET,
    nodeEnv: process.env.NODE_ENV,
});
if (!process.env.SESSION_SECRET) {
    throw new Error('SESSION_SECRET environment variable is required');
}
let store;
if (process.env.NODE_ENV === 'production') {
    const redisClient = (0, redis_1.createClient)({
        url: process.env.REDIS_URL,
    });
    redisClient.connect().catch(error => {
        logger.error('Redis connection failed', {
            error: error instanceof Error ? error.message : String(error),
        });
    });
    store = new connect_redis_1.default({
        client: redisClient,
        prefix: 'sso:',
    });
}
exports.sessionConfig = {
    store,
    secret: process.env.SESSION_SECRET,
    name: 'sso.sid',
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'strict',
        maxAge: 15 * 60 * 1000,
        path: '/',
        domain: process.env.COOKIE_DOMAIN || undefined,
    },
    resave: false,
    saveUninitialized: false,
    rolling: true,
    genid: () => (0, crypto_1.randomBytes)(32).toString('hex'),
};
//# sourceMappingURL=session.js.map