import { Router } from 'express';
import { Database } from 'sqlite';
import { AuditService } from '../services/auditService';
import { TokenService } from '../services/token';
export declare const createTokenRouter: (tokenService: TokenService, db: Database, auditService: AuditService) => Router;
//# sourceMappingURL=tokens.d.ts.map