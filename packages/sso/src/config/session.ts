import { createClient } from 'redis';
import RedisStore from 'connect-redis';
import { randomBytes } from 'crypto';
import { createLogger } from '../utils/logger';

const logger = createLogger('session-config');
logger.info('Session configuration loaded', {
  sessionSecretConfigured: !!process.env.SESSION_SECRET,
  nodeEnv: process.env.NODE_ENV,
});

if (!process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET environment variable is required');
}

let store;
if (process.env.NODE_ENV === 'production') {
  const redisClient = createClient({
    url: process.env.REDIS_URL,
  });
  redisClient.connect().catch(error => {
    logger.error('Redis connection failed', {
      error: error instanceof Error ? error.message : String(error),
    });
  });

  store = new RedisStore({
    client: redisClient,
    prefix: 'sso:',
  });
}

export const sessionConfig = {
  store,
  secret: process.env.SESSION_SECRET,
  name: 'sso.sid',
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict' as const,
    maxAge: 15 * 60 * 1000,
    path: '/',
    domain: process.env.COOKIE_DOMAIN || undefined,
  },
  resave: false,
  saveUninitialized: false,
  rolling: true,
  genid: () =>
    Array.from(randomBytes(32))
      .map(b => b.toString(16).padStart(2, '0'))
      .join(''),
};
