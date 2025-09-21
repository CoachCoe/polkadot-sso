import { NextFunction, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { ErrorHandler, errorToResponse } from '../utils/errors.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('error-handler');

/**
 * Global error handling middleware
 */
export function globalErrorHandler(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Generate request ID if not present
  const requestId = (req as any).requestId || uuidv4();

  // Convert error to PolkadotSSOError
  const polkadotError = ErrorHandler.fromError(error, requestId);

  // Log the error
  logger.error('Request error', {
    requestId,
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    error: {
      name: polkadotError.name,
      code: polkadotError.code,
      message: polkadotError.message,
      stack: polkadotError.stack,
    },
  });

  // Don't send error details in production for internal errors
  const isProduction = process.env.NODE_ENV === 'production';
  const isInternalError = polkadotError.statusCode >= 500;

  const response = errorToResponse(polkadotError);

  if (isProduction && isInternalError) {
    // In production, don't expose internal error details
    res.status(polkadotError.statusCode).json({
      error: 'Internal Server Error',
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
      statusCode: 500,
      timestamp: polkadotError.timestamp,
      requestId,
    });
  } else {
    // In development or for client errors, send full details
    res.status(polkadotError.statusCode).json(response);
  }
}

/**
 * 404 handler for unmatched routes
 */
export function notFoundHandler(req: Request, res: Response): void {
  const requestId = (req as any).requestId || uuidv4();

  logger.warn('Route not found', {
    requestId,
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
  });

  res.status(404).json({
    error: 'Not Found',
    code: 'NOT_FOUND',
    message: `Route ${req.method} ${req.url} not found`,
    statusCode: 404,
    timestamp: Date.now(),
    requestId,
  });
}

/**
 * Async error wrapper for route handlers
 */
export function asyncHandler<T extends any[], R>(
  fn: (...args: T) => Promise<R>
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      // The error will be caught by the global error handler
      throw error;
    }
  };
}

/**
 * Request ID middleware
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const requestId = uuidv4();
  (req as any).requestId = requestId;
  res.set('X-Request-ID', requestId);
  next();
}
