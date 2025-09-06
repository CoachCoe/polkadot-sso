"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.corsConfig = void 0;
exports.corsConfig = {
    origin: (origin, callback) => {
        const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3001'];
        if (process.env.NODE_ENV === 'production') {
            if (!origin) {
                callback(new Error('Origin required in production'));
                return;
            }
            if (!allowedOrigins.includes(origin)) {
                callback(new Error('Origin not allowed by CORS policy'));
                return;
            }
        }
        else {
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
                return;
            }
        }
        callback(null, true);
    },
    methods: process.env.NODE_ENV === 'production'
        ? ['GET', 'POST']
        : ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
    maxAge: process.env.NODE_ENV === 'production' ? 3600 : 86400,
    allowedHeaders: process.env.NODE_ENV === 'production'
        ? ['Content-Type', 'Authorization', 'X-Request-ID']
        : ['Content-Type', 'Authorization', 'X-Request-ID', 'X-API-Key', 'X-Custom-Header'],
    exposedHeaders: ['X-Request-ID'],
    optionsSuccessStatus: 204,
};
//# sourceMappingURL=cors.js.map