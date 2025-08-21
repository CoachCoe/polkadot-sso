import { Request, Response, NextFunction } from 'express';
import { AuditService } from '../modules/security';
export declare const createBruteForceProtection: (auditService: AuditService) => (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
//# sourceMappingURL=bruteForce.d.ts.map