import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
export declare const sanitizeRequest: () => (req: Request, res: Response, next: NextFunction) => void;
export declare const validateBody: (schema: z.ZodSchema) => (req: Request, res: Response, next: NextFunction) => void;
export declare const sanitizeRequestParams: () => (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=validation.d.ts.map