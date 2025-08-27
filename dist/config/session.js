"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessionConfig = void 0;
const redis_1 = require("redis");
const connect_redis_1 = __importDefault(require("connect-redis"));
const crypto_1 = require("crypto");
console.log('Environment variables:', {
    SESSION_SECRET: `${process.env.SESSION_SECRET?.slice(0, 10)}...`,
    NODE_ENV: process.env.NODE_ENV,
});
if (!process.env.SESSION_SECRET) {
    throw new Error('SESSION_SECRET environment variable is required');
}
let store;
if (process.env.NODE_ENV === 'production') {
    const redisClient = (0, redis_1.createClient)({
        url: process.env.REDIS_URL,
    });
    redisClient.connect().catch(console.error);
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