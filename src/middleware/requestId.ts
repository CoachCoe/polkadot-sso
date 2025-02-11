import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export const addRequestId = (req: Request, res: Response, next: NextFunction) => {
  req.id = crypto.randomUUID();
  next();
}; 