import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { sanitizeInput } from '../utils/sanitization';

export const sanitizeRequest = () => (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (req.body) req.body = sanitizeInput(req.body);
  if (req.query) req.query = sanitizeInput(req.query);
  next();
};

export const validateBody = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.errors
        });
      } else {
        next(error);
      }
    }
  };
}; 