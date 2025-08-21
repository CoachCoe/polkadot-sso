import { Request, Response } from 'express';
import { AuditService } from '../modules/security';
export declare const createSecurityAudit: (auditService: AuditService) => {
    rateLimitHandler: (req: Request, res: Response) => void;
    corsErrorHandler: (req: Request) => void;
};
//# sourceMappingURL=securityAudit.d.ts.map