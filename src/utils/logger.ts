import * as winston from 'winston';
import { Request } from 'express';
import { RequestWithId } from '../types/auth';

export const createLogger = (service: string) => {
  return winston.createLogger({
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json(),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        return JSON.stringify({
          timestamp,
          service,
          level,
          message,
          ...meta
        });
      })
    ),
    transports: [
      new winston.transports.Console(),
      new winston.transports.File({ filename: 'error.log', level: 'error' }),
      new winston.transports.File({ filename: 'combined.log' })
    ]
  });
};

const defaultLogger = createLogger('default');

export const logRequest = (req: Request, message: string, meta: Record<string, unknown> = {}) => {
  const reqWithId = req as RequestWithId;
  defaultLogger.info(message, {
    requestId: reqWithId.id,
    method: req.method,
    url: req.url,
    ip: req.ip,
    ...meta
  });
};

export const logError = (req: Request, error: Error, meta: Record<string, unknown> = {}) => {
  const reqWithId = req as RequestWithId;
  defaultLogger.error(error.message, {
    requestId: reqWithId.id,
    method: req.method,
    url: req.url,
    ip: req.ip,
    stack: error.stack,
    ...meta
  });
}; 