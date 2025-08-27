import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { sanitizeInput } from '../utils/sanitization';
import { ParsedQs } from 'qs';

export const sanitizeRequest = () => (req: Request, res: Response, next: NextFunction) => {
  if (req.body) req.body = sanitizeInput(req.body);
  if (req.query) req.query = sanitizeInput(req.query) as ParsedQs;
  next();
};

export const validateBody = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const dataToValidate = {
        body: req.body,
        query: req.query,
        params: req.params,
      };

      schema.parse(dataToValidate);
      next();
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.errors,
        });
      } else {
        next(error);
      }
    }
  };
};

export const sanitizeRequestParams = () => (req: Request, res: Response, next: NextFunction) => {
  for (const param in req.params) {
    req.params[param] = sanitizeInput(req.params[param]) as string;
  }

  for (const param in req.query) {
    if (typeof req.query[param] === 'string') {
      req.query[param] = sanitizeInput(req.query[param]) as string;
    }
  }
  next();
};
