import { CorsOptions } from 'cors';

export const corsConfig: CorsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3001'];

    // In production, require origin to be present and valid
    if (process.env.NODE_ENV === 'production') {
      if (!origin) {
        callback(new Error('Origin required in production'));
        return;
      }

      if (!allowedOrigins.includes(origin)) {
        callback(new Error('Origin not allowed by CORS policy'));
        return;
      }
    } else {
      // In development, allow requests without origin (e.g., Postman, curl)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
    }

    callback(null, true);
  },
  methods:
    process.env.NODE_ENV === 'production'
      ? ['GET', 'POST'] // Restrictive in production
      : ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // More permissive in development
  credentials: true,
  maxAge: process.env.NODE_ENV === 'production' ? 3600 : 86400, // Shorter cache in production
  allowedHeaders:
    process.env.NODE_ENV === 'production'
      ? ['Content-Type', 'Authorization', 'X-Request-ID'] // Minimal headers in production
      : ['Content-Type', 'Authorization', 'X-Request-ID', 'X-API-Key', 'X-Custom-Header'], // More permissive in development
  exposedHeaders: ['X-Request-ID'],
  optionsSuccessStatus: 204, // Some legacy browsers choke on 204
};
