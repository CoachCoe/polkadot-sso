import { RequestHandler } from 'express';
import { Database } from 'sqlite';
import { AuditService } from '../../services/auditService';
import { ChallengeService } from '../../services/challengeService';
import { TokenService } from '../../services/token';
import { Client } from '../../types/auth';
export declare const createLoginHandler: (tokenService: TokenService, challengeService: ChallengeService, auditService: AuditService, clients: Map<string, Client>, db: Database) => RequestHandler;
export declare const createVerifyHandler: (challengeService: ChallengeService, auditService: AuditService, clients: Map<string, Client>, db: Database) => RequestHandler;
export declare const createTokenHandler: (tokenService: TokenService, auditService: AuditService, db: Database) => RequestHandler;
//# sourceMappingURL=handlers.d.ts.map