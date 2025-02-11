import session from 'express-session';
import RedisStore from 'connect-redis';

export const sessionConfig = {
  store: new RedisStore({
    url: process.env.REDIS_URL,
    ttl: 86400 // 1 day
  }),
  secret: process.env.SESSION_SECRET!,
  name: 'sso.sid',
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000 // 15 minutes
  },
  resave: false,
  saveUninitialized: false,
  rolling: true
}; 