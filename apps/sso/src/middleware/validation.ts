import { NextFunction, Request, Response } from 'express';
import { ParsedQs } from 'qs';
import { z } from 'zod';
import { ValidationError } from '../utils/errors.js';
import { createLogger } from '../utils/logger.js';
import { sanitizeInput } from '../utils/sanitization.js';

const logger = createLogger('validation-middleware');

/**
 * Enhanced input sanitization
 */
export const sanitizeRequest = () => (req: Request, _res: Response, next: NextFunction) => {
  try {
    if (req.body) {
      req.body = sanitizeInput(req.body);
    }
    if (req.query) {
      req.query = sanitizeInput(req.query) as ParsedQs;
    }
    if (req.params) {
      req.params = sanitizeInput(req.params) as Record<string, string>;
    }
    next();
  } catch (error) {
    logger.error('Sanitization failed', {
      error: error instanceof Error ? error.message : String(error),
      path: req.path,
      method: req.method,
    });
    next(new ValidationError('Invalid input data'));
  }
};

/**
 * Enhanced body validation with detailed error messages
 */
export const validateBody = (schema: z.ZodSchema) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      // Validate the body directly
      const result = schema.safeParse(req.body);

      if (!result.success) {
        const requestId = (req as Request & { requestId?: string }).requestId;
        const error = new ValidationError(
          'Request validation failed',
          {
            errors: result.error.errors,
            path: req.path,
            method: req.method,
          },
          requestId
        );

        logger.warn('Body validation failed', {
          requestId,
          path: req.path,
          method: req.method,
          errors: result.error.errors,
        });

        return next(error);
      }

      // Replace the original body with validated data
      req.body = result.data;

      next();
    } catch (error) {
      logger.error('Validation middleware error', {
        error: error instanceof Error ? error.message : String(error),
        path: req.path,
        method: req.method,
      });
      next(error);
    }
  };
};

/**
 * Enhanced query validation
 */
export const validateQuery = (schema: z.ZodSchema) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const result = schema.safeParse(req.query);

      if (!result.success) {
        const requestId = (req as Request & { requestId?: string }).requestId;
        const error = new ValidationError(
          'Query validation failed',
          {
            errors: result.error.errors,
            query: req.query,
            path: req.path,
            method: req.method,
          },
          requestId
        );

        logger.warn('Query validation failed', {
          requestId,
          path: req.path,
          method: req.method,
          query: req.query,
          errors: result.error.errors,
        });

        return next(error);
      }

      req.query = result.data;
      next();
    } catch (error) {
      logger.error('Query validation middleware error', {
        error: error instanceof Error ? error.message : String(error),
        path: req.path,
        method: req.method,
      });
      next(error);
    }
  };
};

/**
 * Enhanced parameter validation
 */
export const validateParams = (schema: z.ZodSchema) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const result = schema.safeParse(req.params);

      if (!result.success) {
        const requestId = (req as Request & { requestId?: string }).requestId;
        const error = new ValidationError(
          'Parameter validation failed',
          {
            errors: result.error.errors,
            params: req.params,
            path: req.path,
            method: req.method,
          },
          requestId
        );

        logger.warn('Parameter validation failed', {
          requestId,
          path: req.path,
          method: req.method,
          params: req.params,
          errors: result.error.errors,
        });

        return next(error);
      }

      req.params = result.data;
      next();
    } catch (error) {
      logger.error('Parameter validation middleware error', {
        error: error instanceof Error ? error.message : String(error),
        path: req.path,
        method: req.method,
      });
      next(error);
    }
  };
};

/**
 * Enhanced sanitization for request parameters
 */
export const sanitizeRequestParams = () => (req: Request, _res: Response, next: NextFunction) => {
  try {
    // Sanitize URL parameters
    for (const param in req.params) {
      if (typeof req.params[param] === 'string') {
        req.params[param] = sanitizeInput(req.params[param]) as string;
      }
    }

    // Sanitize query parameters
    for (const param in req.query) {
      if (typeof req.query[param] === 'string') {
        req.query[param] = sanitizeInput(req.query[param]) as string;
      } else if (Array.isArray(req.query[param])) {
        req.query[param] = (req.query[param] as string[]).map(item =>
          typeof item === 'string' ? sanitizeInput(item) : item
        ) as (string | ParsedQs)[];
      }
    }

    next();
  } catch (error) {
    logger.error('Parameter sanitization failed', {
      error: error instanceof Error ? error.message : String(error),
      path: req.path,
      method: req.method,
    });
    next(new ValidationError('Parameter sanitization failed'));
  }
};

/**
 * Content type validation
 */
export const validateContentType = (allowedTypes: string[] = ['application/json']) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const contentType = req.get('Content-Type');

    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
      if (!contentType || !allowedTypes.some(type => contentType.includes(type))) {
        const requestId = (req as Request & { requestId?: string }).requestId;
        const error = new ValidationError(
          'Invalid content type',
          {
            received: contentType,
            allowed: allowedTypes,
          },
          requestId
        );

        logger.warn('Invalid content type', {
          requestId,
          contentType,
          allowedTypes,
          path: req.path,
          method: req.method,
        });

        return next(error);
      }
    }

    next();
  };
};

/**
 * Request size validation
 */
export const validateRequestSize = (maxSize: number = 1024 * 1024) => {
  // 1MB default
  return (req: Request, _res: Response, next: NextFunction) => {
    const contentLength = parseInt(req.get('Content-Length') || '0');

    if (contentLength > maxSize) {
      const requestId = (req as Request & { requestId?: string }).requestId;
      const error = new ValidationError(
        'Request too large',
        {
          size: contentLength,
          maxSize,
        },
        requestId
      );

      logger.warn('Request too large', {
        requestId,
        size: contentLength,
        maxSize,
        path: req.path,
        method: req.method,
      });

      return next(error);
    }

    next();
  };
};

/**
 * IP address validation
 */
export const validateIPAddress =
  () =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const ip = req.ip || req.connection.remoteAddress;

    if (!ip) {
      logger.warn('No IP address found', {
        path: req.path,
        method: req.method,
        headers: req.headers,
      });
    }

    // Basic IP format validation
    const ipv4Regex =
      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;

    if (ip && !ipv4Regex.test(ip) && !ipv6Regex.test(ip) && ip !== '::1' && ip !== '127.0.0.1') {
      logger.warn('Invalid IP address format', {
        ip,
        path: req.path,
        method: req.method,
      });
    }

    next();
  };

/**
 * Combined validation middleware
 */
export const validationMiddleware = [
  sanitizeRequest(),
  sanitizeRequestParams(),
  validateContentType(),
  validateRequestSize(),
  validateIPAddress(),
];
