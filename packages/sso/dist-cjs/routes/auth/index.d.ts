import { Database } from 'sqlite';
import { AuditService } from '../../services/auditService.js';
import { ChallengeService } from '../../services/challengeService.js';
import { TokenService } from '../../services/token.js';
import { Client } from '../../types/auth.js';
export declare const createAuthRouter: (tokenService: TokenService, challengeService: ChallengeService, auditService: AuditService, clients: Map<string, Client>, db: Database) => import("express-serve-static-core").Router;
//# sourceMappingURL=index.d.ts.map