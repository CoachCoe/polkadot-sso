"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
exports.validateEnvironment = validateEnvironment;
exports.getValidatedEnv = getValidatedEnv;
const zod_1 = require("zod");
const logger_js_1 = require("./logger.js");
const logger = (0, logger_js_1.createLogger)('env-validation');
const envSchema = zod_1.z.object({
    SESSION_SECRET: zod_1.z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    PORT: zod_1.z.string().transform(Number).pipe(zod_1.z.number().min(1).max(65535)).default('3000'),
    DATABASE_URL: zod_1.z.string().url().optional(),
    DATABASE_PATH: zod_1.z.string().default('./data/sso.db'),
    DB_POOL_MIN: zod_1.z.string().transform(Number).pipe(zod_1.z.number().min(1).max(20)).default('2'),
    DB_POOL_MAX: zod_1.z.string().transform(Number).pipe(zod_1.z.number().min(1).max(50)).default('10'),
    DB_POOL_ACQUIRE_TIMEOUT: zod_1.z
        .string()
        .transform(Number)
        .pipe(zod_1.z.number().min(1000).max(60000))
        .default('30000'),
    DB_POOL_IDLE_TIMEOUT: zod_1.z
        .string()
        .transform(Number)
        .pipe(zod_1.z.number().min(30000).max(1800000))
        .default('300000'),
    DB_POOL_REAP_INTERVAL: zod_1.z
        .string()
        .transform(Number)
        .pipe(zod_1.z.number().min(100).max(10000))
        .default('1000'),
    REDIS_URL: zod_1.z.string().url().optional(),
    REDIS_MAX_RETRIES: zod_1.z.string().transform(Number).pipe(zod_1.z.number().min(1).max(10)).default('3'),
    REDIS_CONNECT_TIMEOUT: zod_1.z
        .string()
        .transform(Number)
        .pipe(zod_1.z.number().min(1000).max(30000))
        .default('10000'),
    REDIS_PING_INTERVAL: zod_1.z
        .string()
        .transform(Number)
        .pipe(zod_1.z.number().min(1000).max(60000))
        .default('30000'),
    ALLOWED_ORIGINS: zod_1.z
        .string()
        .transform(val => val.split(',').map(s => s.trim()))
        .default('http://localhost:3000,http://localhost:3001'),
    COOKIE_DOMAIN: zod_1.z.string().optional(),
    COOKIE_SECURE: zod_1.z
        .string()
        .transform(val => val === 'true')
        .default('false'),
    JWT_SECRET: zod_1.z.string().min(32, 'JWT_SECRET must be at least 32 characters').optional(),
    JWT_ISSUER: zod_1.z.string().default('polkadot-sso'),
    JWT_ACCESS_TOKEN_EXPIRY: zod_1.z.string().transform(Number).pipe(zod_1.z.number().min(60)).default('900'), // 15 minutes
    JWT_REFRESH_TOKEN_EXPIRY: zod_1.z
        .string()
        .transform(Number)
        .pipe(zod_1.z.number().min(3600))
        .default('604800'), // 7 days
    RATE_LIMIT_WINDOW_MS: zod_1.z.string().transform(Number).pipe(zod_1.z.number().min(1000)).default('900000'),
    RATE_LIMIT_MAX_REQUESTS: zod_1.z.string().transform(Number).pipe(zod_1.z.number().min(1)).default('100'),
    COMPRESSION_LEVEL: zod_1.z.string().transform(Number).pipe(zod_1.z.number().min(0).max(9)).default('6'),
    COMPRESSION_THRESHOLD: zod_1.z.string().transform(Number).pipe(zod_1.z.number().min(0)).default('1024'),
    STATIC_CACHE_MAX_AGE: zod_1.z.string().default('1h'),
    STATIC_CACHE_ENABLED: zod_1.z
        .string()
        .transform(val => val === 'true')
        .default('true'),
    KUSAMA_ENDPOINT: zod_1.z.string().url().optional(),
    KUSAMA_ACCOUNT_TYPE: zod_1.z.enum(['sr25519', 'ed25519', 'ecdsa']).default('sr25519'),
    DEFAULT_CLIENT_SECRET: zod_1.z.string().min(32).optional(),
    LOG_LEVEL: zod_1.z.enum(['error', 'warn', 'info', 'debug']).default('info'),
    LOG_FILE: zod_1.z.string().optional(),
});
function validateEnvironment() {
    const errors = [];
    const warnings = [];
    try {
        const env = envSchema.parse(process.env);
        if (env.NODE_ENV === 'production') {
            if (!env.REDIS_URL) {
                warnings.push('REDIS_URL not configured - sessions will be stored in memory (not recommended for production)');
            }
            if (!env.KUSAMA_ENDPOINT) {
                warnings.push('KUSAMA_ENDPOINT not configured - Kusama integration will be disabled');
            }
            if (env.COOKIE_SECURE === false) {
                warnings.push('COOKIE_SECURE is false - cookies will be sent over HTTP (not recommended for production)');
            }
            if (env.DB_POOL_MAX < 5) {
                warnings.push('DB_POOL_MAX is low for production - consider increasing to at least 5');
            }
        }
        if (env.NODE_ENV === 'development') {
            if (!env.DEFAULT_CLIENT_SECRET) {
                warnings.push('DEFAULT_CLIENT_SECRET not configured - using development default');
            }
            if (env.DB_POOL_MAX > 20) {
                warnings.push('DB_POOL_MAX is high for development - consider reducing to save resources');
            }
        }
        // Validate pool configuration
        if (env.DB_POOL_MIN > env.DB_POOL_MAX) {
            errors.push('DB_POOL_MIN cannot be greater than DB_POOL_MAX');
        }
        if (env.DB_POOL_ACQUIRE_TIMEOUT < 1000) {
            warnings.push('DB_POOL_ACQUIRE_TIMEOUT is very low - may cause connection timeouts');
        }
        logger.info('Environment validation successful', {
            nodeEnv: env.NODE_ENV,
            port: env.PORT,
            allowedOrigins: env.ALLOWED_ORIGINS.length,
            hasRedis: !!env.REDIS_URL,
            hasKusama: !!env.KUSAMA_ENDPOINT,
            dbPoolMin: env.DB_POOL_MIN,
            dbPoolMax: env.DB_POOL_MAX,
            compressionLevel: env.COMPRESSION_LEVEL,
            staticCacheEnabled: env.STATIC_CACHE_ENABLED,
        });
        return {
            valid: true,
            env,
            errors: [],
            warnings,
        };
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            errors.push(...error.errors.map(err => `${err.path.join('.')}: ${err.message}`));
        }
        else {
            errors.push('Unknown validation error');
        }
        logger.error('Environment validation failed', { errors });
        return {
            valid: false,
            env: null,
            errors,
            warnings,
        };
    }
}
function getValidatedEnv() {
    const result = validateEnvironment();
    if (!result.valid || !result.env) {
        throw new Error(`Environment validation failed: ${result.errors.join(', ')}`);
    }
    return result.env;
}
exports.env = getValidatedEnv();
//# sourceMappingURL=envValidation.js.map