declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production' | 'test';
      PORT?: string;
      JWT_SECRET: string;
      DATABASE_PATH: string;
      CLIENT_WHITELIST: string;
      ADMIN_SECRET?: string;
    }
  }
}

export {};
