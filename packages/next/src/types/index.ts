export interface NextAuthConfig {
  basePath?: string;
  providers?: string[];
  chains?: string[];
  session?: {
    secret?: string;
    maxAge?: number;
  };
  security?: {
    csrf?: boolean;
    rateLimit?: boolean;
  };
}

export interface AuthContext {
  user?: {
    address: string;
    chain: string;
    sessionId: string;
  };
  isAuthenticated: boolean;
}

export interface NextAuthHandler {
  (req: any, res: any): Promise<void>;
}

export interface NextAuthMiddleware {
  (req: any): Promise<any | null>;
}
