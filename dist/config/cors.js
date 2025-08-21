"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.corsConfig = void 0;
exports.corsConfig = {
    origin: (origin, callback) => {
        const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') ?? ['http://localhost:3001'];
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST'],
    credentials: true,
    maxAge: 86400,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    exposedHeaders: ['X-Request-ID'],
};
//# sourceMappingURL=cors.js.map