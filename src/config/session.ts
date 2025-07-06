
import { createClient } from 'redis';
import { RedisStore } from 'connect-redis';
import { randomBytes } from 'crypto';

console.log('Environment variables:', {
  SESSION_SECRET: process.env.SESSION_SECRET?.slice(0, 10) + '...',
  NODE_ENV: process.env.NODE_ENV
});

if (!process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET environment variable is required');
}


let store;
if (process.env.NODE_ENV === 'production') {
  const redisClient = createClient({
    url: process.env.REDIS_URL
  });
  redisClient.connect().catch(console.error);

  store = new RedisStore({
    client: redisClient,
    prefix: "sso:"
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
    domain: process.env.COOKIE_DOMAIN || undefined
  },
  resave: false,
  saveUninitialized: false,
  rolling: true,
  genid: () => randomBytes(32).toString('hex')
}; 