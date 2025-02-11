import { Request, Response, NextFunction } from 'express';
import { createLogger } from '../utils/logger';

const logger = createLogger('error-handler');

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message);
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof AppError && err.isOperational) {
    return res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
      requestId: req.id
    });
  }
  
  logger.error({
    error: err,
    request: {
      id: req.id,
      method: req.method,
      url: req.url
    }
  });

  res.status(500).json({
    status: 'error',
    message: 'Internal server error',
    requestId: req.id
  });
}; 