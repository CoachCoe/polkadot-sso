import { AuditService } from '../services/auditService';
import { ChallengeService } from '../services/challengeService';
import { TokenService } from '../services/token';
import { Client } from '../types/auth';
export declare const createAuthRouter: (tokenService: TokenService, challengeService: ChallengeService, auditService: AuditService, clients: Map<string, Client>) => import("express-serve-static-core").Router;
//# sourceMappingURL=auth.d.ts.map