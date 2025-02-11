import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction, RequestHandler } from 'express';
import { sanitize } from 'isomorphic-dompurify';
import { validate as uuidValidate } from 'uuid';

// Rate limiting configuration
export const createRateLimiter = (windowMs: number, max: number) => 
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    keyGenerator: (req) => {
      return `${req.ip}-${req.get('x-client-id')}`;
    }
  });

// Input sanitization middleware
export const sanitizeRequest = (): RequestHandler => (
  req: Request, 
  res: Response, 
  next: NextFunction
) => {
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = sanitize(req.body[key]);
      }
    });
  }
  if (req.query) {
    Object.keys(req.query).forEach(key => {
      if (typeof req.query[key] === 'string') {
        req.query[key] = sanitize(req.query[key] as string);
      }
    });
  }
  next();
};

// Request validation middleware
export const validateRequest = (): RequestHandler => (
  req: Request, 
  res: Response, 
  next: NextFunction
) => {
  // Validate client_id - allow both UUID and simple string format
  if (req.query.client_id && typeof req.query.client_id === 'string') {
    // Remove UUID validation for now
    if (!req.query.client_id.match(/^[a-zA-Z0-9-_]+$/)) {
      return res.status(400).json({
        error: 'Invalid client_id format'
      });
    }
  }

  // Validate challenge_id
  if (req.query.challenge_id && typeof req.query.challenge_id === 'string') {
    if (!uuidValidate(req.query.challenge_id)) {
      return res.status(400).json({
        error: 'Invalid challenge_id format'
      });
    }
  }

  next();
}; 