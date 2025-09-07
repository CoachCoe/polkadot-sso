import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

export const addRequestId = (req: Request, res: Response, next: NextFunction) => {
  req.id = randomUUID();
  next();
};
