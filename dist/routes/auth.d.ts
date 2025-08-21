import { Database } from 'sqlite';
import { AuditService, ChallengeService, TokenService } from '../modules';
import { Challenge, Client } from '../types/auth';
export declare const createAuthRouter: (tokenService: TokenService, challengeService: ChallengeService & {
    generateChallenge(client_id: string): Promise<Challenge>;
}, auditService: AuditService, clients: Map<string, Client>, db: Database) => import("express-serve-static-core").Router;
//# sourceMappingURL=auth.d.ts.map