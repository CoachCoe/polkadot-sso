import { Database } from 'sqlite';
import { createRateLimiters } from '../../middleware/rateLimit.js';
import { AuditService } from '../../services/auditService.js';
import { ChallengeService } from '../../services/challengeService.js';
import { TokenService } from '../../services/token.js';
import { Client } from '../../types/auth.js';
type RateLimiters = ReturnType<typeof createRateLimiters>;
export declare const createAuthRouter: (tokenService: TokenService, challengeService: ChallengeService, auditService: AuditService, clients: Map<string, Client>, db: Database, rateLimiters: RateLimiters) => import("express-serve-static-core").Router;
export {};
//# sourceMappingURL=index.d.ts.map