import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
export declare const sanitizeRequest: () => (req: Request, res: Response, next: NextFunction) => void;
export declare const validateBody: (schema: z.ZodSchema) => (req: Request, res: Response, next: NextFunction) => void;
export declare const validateQuery: (schema: z.ZodSchema) => (req: Request, res: Response, next: NextFunction) => void;
export declare const sanitizeRequestParams: () => (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=validation.d.ts.map