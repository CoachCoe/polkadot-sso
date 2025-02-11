import 'express';
import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      id?: string;
    }
  }
}

export interface RequestWithId extends Request {
  id: string;
}

export {}; 