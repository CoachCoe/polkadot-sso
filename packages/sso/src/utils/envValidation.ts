import { z } from 'zod';
import { createLogger } from './logger.js';

const logger = createLogger('env-validation');

const envSchema = z.object({
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  PORT: z.string().transform(Number).pipe(z.number().min(1).max(65535)).default('3000'),

  DATABASE_URL: z.string().url().optional(),
  DATABASE_PATH: z.string().default('./data/sso.db'),

  DB_POOL_MIN: z.string().transform(Number).pipe(z.number().min(1).max(20)).default('2'),
  DB_POOL_MAX: z.string().transform(Number).pipe(z.number().min(1).max(50)).default('10'),
  DB_POOL_ACQUIRE_TIMEOUT: z
    .string()
    .transform(Number)
    .pipe(z.number().min(1000).max(60000))
    .default('30000'),
  DB_POOL_IDLE_TIMEOUT: z
    .string()
    .transform(Number)
    .pipe(z.number().min(30000).max(1800000))
    .default('300000'),
  DB_POOL_REAP_INTERVAL: z
    .string()
    .transform(Number)
    .pipe(z.number().min(100).max(10000))
    .default('1000'),

  REDIS_URL: z.string().url().optional(),
  REDIS_MAX_RETRIES: z.string().transform(Number).pipe(z.number().min(1).max(10)).default('3'),
  REDIS_CONNECT_TIMEOUT: z
    .string()
    .transform(Number)
    .pipe(z.number().min(1000).max(30000))
    .default('10000'),
  REDIS_PING_INTERVAL: z
    .string()
    .transform(Number)
    .pipe(z.number().min(1000).max(60000))
    .default('30000'),

  ALLOWED_ORIGINS: z
    .string()
    .transform(val => val.split(',').map(s => s.trim()))
    .default('http://localhost:3000,http://localhost:3001'),

  COOKIE_DOMAIN: z.string().optional(),
  COOKIE_SECURE: z
    .string()
    .transform(val => val === 'true')
    .default('false'),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ISSUER: z.string().default('polkadot-sso'),
  JWT_ACCESS_TOKEN_EXPIRY: z.string().transform(Number).pipe(z.number().min(60)).default('900'), // 15 minutes
  JWT_REFRESH_TOKEN_EXPIRY: z
    .string()
    .transform(Number)
    .pipe(z.number().min(3600))
    .default('604800'), // 7 days

  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).pipe(z.number().min(1000)).default('900000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).pipe(z.number().min(1)).default('100'),

  COMPRESSION_LEVEL: z.string().transform(Number).pipe(z.number().min(0).max(9)).default('6'),
  COMPRESSION_THRESHOLD: z.string().transform(Number).pipe(z.number().min(0)).default('1024'),

  STATIC_CACHE_MAX_AGE: z.string().default('1h'),
  STATIC_CACHE_ENABLED: z
    .string()
    .transform(val => val === 'true')
    .default('true'),

  KUSAMA_ENDPOINT: z.string().url().optional(),
  KUSAMA_ACCOUNT_TYPE: z.enum(['sr25519', 'ed25519', 'ecdsa']).default('sr25519'),

  DEFAULT_CLIENT_SECRET: z.string().min(32).optional(),

  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOG_FILE: z.string().optional(),
});

export type ValidatedEnv = z.infer<typeof envSchema>;

export interface EnvValidationResult {
  valid: boolean;
  env: ValidatedEnv | null;
  errors: string[];
  warnings: string[];
}

export function validateEnvironment(): EnvValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    const env = envSchema.parse(process.env);

    if (env.NODE_ENV === 'production') {
      if (!env.REDIS_URL) {
        warnings.push(
          'REDIS_URL not configured - sessions will be stored in memory (not recommended for production)'
        );
      }

      if (!env.KUSAMA_ENDPOINT) {
        warnings.push('KUSAMA_ENDPOINT not configured - Kusama integration will be disabled');
      }

      if (env.COOKIE_SECURE === false) {
        warnings.push(
          'COOKIE_SECURE is false - cookies will be sent over HTTP (not recommended for production)'
        );
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
  } catch (error) {
    if (error instanceof z.ZodError) {
      errors.push(...error.errors.map(err => `${err.path.join('.')}: ${err.message}`));
    } else {
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

export function getValidatedEnv(): ValidatedEnv {
  const result = validateEnvironment();
  if (!result.valid || !result.env) {
    throw new Error(`Environment validation failed: ${result.errors.join(', ')}`);
  }
  return result.env;
}

export const env = getValidatedEnv();
