import session from 'express-session';
import { createClient } from 'redis';
import { RedisStore } from 'connect-redis';
import { randomBytes } from 'crypto';

const redisClient = createClient({
  url: process.env.REDIS_URL
});
redisClient.connect().catch(console.error);

const store = new RedisStore({
  client: redisClient as any,
  prefix: "sso:"
});

export const sessionConfig = {
  store,
  secret: process.env.SESSION_SECRET!,
  name: 'sso.sid',
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict' as const,
    maxAge: 15 * 60 * 1000, // 15 minutes
    path: '/',
    domain: process.env.COOKIE_DOMAIN || undefined
  },
  resave: false,
  saveUninitialized: false,
  rolling: true,
  genid: () => randomBytes(32).toString('hex')
}; 