/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { NextFunction, Request, Response } from 'express';
import { createLogger } from '../utils/logger';
const logger = createLogger('error-sanitization');
export interface ErrorSanitizationConfig {
  enableDetailedErrors: boolean;
  logErrors: boolean;
  sanitizeStackTraces: boolean;
  allowedErrorTypes: string[];
  maxErrorLength: number;
  enableErrorReporting: boolean;
}
export const defaultErrorSanitizationConfig: ErrorSanitizationConfig = {
  enableDetailedErrors: process.env['NODE_ENV'] === 'development',
  logErrors: true,
  sanitizeStackTraces: true,
  allowedErrorTypes: ['ValidationError', 'AuthenticationError', 'AuthorizationError'],
  maxErrorLength: 200,
  enableErrorReporting: process.env['NODE_ENV'] === 'production',
};
export class ErrorSanitizationMiddleware {
  private config: ErrorSanitizationConfig;
  constructor(config: ErrorSanitizationConfig = defaultErrorSanitizationConfig) {
    this.config = config;
  }
  sanitizeErrors() {
    return (error: Error, req: Request, res: Response, _next: NextFunction) => {
      if (this.config.logErrors) {
        logger.error('Unhandled error occurred', {
          error: error.message,
          stack: error.stack,
          url: req.url || 'unknown',
          method: req.method || 'unknown',
          ip: req.ip || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown',
          requestId: req.headers['x-request-id'] || 'unknown',
        });
      }
      const isAllowedError = this.config.allowedErrorTypes.some(
        type => error.constructor.name === type || (error as Error & { name: string }).name === type
      );
      const sanitizedMessage = this.sanitizeErrorMessage(error.message, isAllowedError);
      const responseError: Record<string, unknown> = {
        error: sanitizedMessage,
        requestId: req.headers['x-request-id'] || 'unknown',
      };
      if (isAllowedError) {
        responseError['type'] = error.constructor.name;
      }
      if (this.config.enableDetailedErrors) {
        responseError['details'] = {
          timestamp: new Date().toISOString(),
          path: req.path || 'unknown',
          method: req.method || 'unknown',
        };
      }
      const statusCode = this.getStatusCode(error);
      res.status(statusCode).json(responseError);
      if (this.config.enableErrorReporting) {
        this.reportError(error, req);
      }
    };
  }
  private sanitizeErrorMessage(message: string, isAllowedError: boolean): string {
    if (!message) {
      return 'An unexpected error occurred';
    }
    if (isAllowedError) {
      return this.truncateMessage(message, this.config.maxErrorLength);
    }
    const genericMessages = [
      'An unexpected error occurred',
      'Request processing failed',
      'Service temporarily unavailable',
      'Invalid request',
    ];
    const hash = this.simpleHash(message);
    const index = hash % genericMessages.length;
    return genericMessages[index];
  }
  private getStatusCode(error: Error): number {
    // Use type guards to safely check error types
    if (error instanceof Error && 'name' in error) {
      const errorName = (error as Error & { name: string }).name;
      if (errorName === 'ValidationError') {
        return 400;
      }
      if (errorName === 'AuthenticationError') {
        return 401;
      }
      if (errorName === 'AuthorizationError') {
        return 403;
      }
      if (errorName === 'NotFoundError') {
        return 404;
      }
      if (errorName === 'RateLimitError') {
        return 429;
      }
    }
    return 500;
  }
  private truncateMessage(message: string, maxLength: number): string {
    if (message.length <= maxLength) {
      return message;
    }
    return `${message.substring(0, maxLength - 3)}...`;
  }
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
  private reportError(error: Error, req: Request): void {
    logger.info('Error reported for monitoring', {
      errorType: error.constructor.name,
      errorMessage: error.message,
      url: req.url || 'unknown',
      method: req.method || 'unknown',
      ip: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      timestamp: new Date().toISOString(),
    });
  }
  static createCustomErrors() {
    class ValidationError extends Error {
      constructor(message: string) {
        super(message);
        this.name = 'ValidationError';
      }
    }
    class AuthenticationError extends Error {
      constructor(message: string) {
        super(message);
        this.name = 'AuthenticationError';
      }
    }
    class AuthorizationError extends Error {
      constructor(message: string) {
        super(message);
        this.name = 'AuthorizationError';
      }
    }
    class NotFoundError extends Error {
      constructor(message: string) {
        super(message);
        this.name = 'NotFoundError';
      }
    }
    class RateLimitError extends Error {
      constructor(message: string) {
        super(message);
        this.name = 'RateLimitError';
      }
    }
    return {
      ValidationError,
      AuthenticationError,
      AuthorizationError,
      NotFoundError,
      RateLimitError,
    };
  }
  static asyncErrorHandler(
    fn: (req: Request, res: Response, next: NextFunction) => Promise<void> | void
  ) {
    return (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }
  static syncErrorHandler(fn: (req: Request, res: Response, next: NextFunction) => void) {
    return (req: Request, res: Response, next: NextFunction) => {
      try {
        fn(req, res, next);
      } catch (error) {
        next(error);
      }
    };
  }
}
export const errorSanitization = new ErrorSanitizationMiddleware();
/* eslint-disable @typescript-eslint/unbound-method */
export const { createCustomErrors, asyncErrorHandler, syncErrorHandler } =
  ErrorSanitizationMiddleware;
export const { sanitizeErrors } = errorSanitization;
export const {
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  RateLimitError,
} = ErrorSanitizationMiddleware.createCustomErrors();
/* eslint-enable @typescript-eslint/unbound-method */
