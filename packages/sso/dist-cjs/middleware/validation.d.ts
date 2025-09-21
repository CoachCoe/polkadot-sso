import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
/**
 * Enhanced input sanitization
 */
export declare const sanitizeRequest: () => (req: Request, _res: Response, next: NextFunction) => void;
/**
 * Enhanced body validation with detailed error messages
 */
export declare const validateBody: (schema: z.ZodSchema) => (req: Request, _res: Response, next: NextFunction) => void;
/**
 * Enhanced query validation
 */
export declare const validateQuery: (schema: z.ZodSchema) => (req: Request, _res: Response, next: NextFunction) => void;
/**
 * Enhanced parameter validation
 */
export declare const validateParams: (schema: z.ZodSchema) => (req: Request, _res: Response, next: NextFunction) => void;
/**
 * Enhanced sanitization for request parameters
 */
export declare const sanitizeRequestParams: () => (req: Request, _res: Response, next: NextFunction) => void;
/**
 * Content type validation
 */
export declare const validateContentType: (allowedTypes?: string[]) => (req: Request, _res: Response, next: NextFunction) => void;
/**
 * Request size validation
 */
export declare const validateRequestSize: (maxSize?: number) => (req: Request, _res: Response, next: NextFunction) => void;
/**
 * IP address validation
 */
export declare const validateIPAddress: () => (req: Request, _res: Response, next: NextFunction) => void;
/**
 * Combined validation middleware
 */
export declare const validationMiddleware: ((req: Request, _res: Response, next: NextFunction) => void)[];
//# sourceMappingURL=validation.d.ts.map