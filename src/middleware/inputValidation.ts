import { NextFunction, Request, Response } from 'express';
import { createLogger } from '../utils/logger';
const logger = createLogger('input-validation');
export interface InputValidationConfig {
  maxRequestSize: string;
  maxFileSize: string;
  maxFiles: number;
  allowedFileTypes: string[];
  maxFieldSize: number;
  maxFields: number;
  enableStrictValidation: boolean;
}
export const defaultInputValidationConfig: InputValidationConfig = {
  maxRequestSize: '10mb',
  maxFileSize: '5mb',
  maxFiles: 10,
  allowedFileTypes: ['.json', '.txt', '.pdf', '.png', '.jpg', '.jpeg'],
  maxFieldSize: 1024 * 1024,
  maxFields: 100,
  enableStrictValidation: true,
};
export class InputValidationMiddleware {
  private config: InputValidationConfig;
  constructor(config: InputValidationConfig = defaultInputValidationConfig) {
    this.config = config;
  }
  validateRequestSize() {
    return (req: Request, res: Response, next: NextFunction) => {
      const contentLength = req.headers['content-length'];
      if (contentLength) {
        const sizeInBytes = parseInt(contentLength, 10);
        const maxSizeInBytes = this.parseSize(this.config.maxRequestSize);
        if (sizeInBytes > maxSizeInBytes) {
          logger.warn('Request size exceeded limit', {
            ip: req.ip,
            size: sizeInBytes,
            maxSize: maxSizeInBytes,
            url: req.url,
          });
          return res.status(413).json({
            error: 'Request entity too large',
            maxSize: this.config.maxRequestSize,
            requestId: req.headers['x-request-id'] || 'unknown',
          });
        }
      }
      return next();
    };
  }
  validateFileUploads() {
    return (_req: Request, _res: Response, next: NextFunction) => {
      return next();
    };
  }
  validateFields() {
    return (req: Request, res: Response, next: NextFunction) => {
      const fieldCount = Object.keys(req.body as Record<string, unknown>).length;
      if (fieldCount > this.config.maxFields) {
        logger.warn('Too many fields in request', {
          ip: req.ip,
          fieldCount,
          maxFields: this.config.maxFields,
          url: req.url,
        });
        return res.status(400).json({
          error: 'Too many fields in request',
          maxFields: this.config.maxFields,
          requestId: req.headers['x-request-id'] || 'unknown',
        });
      }
      for (const [key, value] of Object.entries(req.body as Record<string, unknown>)) {
        if (typeof value === 'string' && value.length > this.config.maxFieldSize) {
          logger.warn('Field size exceeded limit', {
            ip: req.ip,
            field: key,
            size: value.length,
            maxSize: this.config.maxFieldSize,
            url: req.url,
          });
          return res.status(400).json({
            error: `Field '${key}' is too large`,
            maxSize: this.config.maxFieldSize,
            requestId: req.headers['x-request-id'] || 'unknown',
          });
        }
      }
      return next();
    };
  }
  validateURLs() {
    return (req: Request, res: Response, next: NextFunction) => {
      const { url } = req;
      const suspiciousPatterns = [
        /\.\.\//i,
        /%2e%2e%2f/i,
        /<script/i,
        /javascript:/i,
        /data:text\/html/i,
      ];
      for (const pattern of suspiciousPatterns) {
        if (pattern.test(url)) {
          logger.warn('Suspicious URL pattern detected', {
            ip: req.ip,
            url,
            pattern: pattern.source,
          });
          return res.status(400).json({
            error: 'Invalid URL pattern',
            requestId: req.headers['x-request-id'] || 'unknown',
          });
        }
      }
      return next();
    };
  }
  validateHeaders() {
    return (req: Request, res: Response, next: NextFunction) => {
      const userAgent = req.headers['user-agent'];
      const accept = req.headers['accept'];
      if (userAgent && userAgent.length > 500) {
        logger.warn('Suspicious User-Agent header', {
          ip: req.ip,
          userAgentLength: userAgent.length,
          url: req.url,
        });
        return res.status(400).json({
          error: 'Invalid User-Agent header',
          requestId: req.headers['x-request-id'] || 'unknown',
        });
      }
      if (accept && !this.isValidAcceptHeader(accept)) {
        logger.warn('Invalid Accept header', {
          ip: req.ip,
          accept,
          url: req.url,
        });
        return res.status(400).json({
          error: 'Invalid Accept header',
          requestId: req.headers['x-request-id'] || 'unknown',
        });
      }
      return next();
    };
  }
  createSizeBasedRateLimit() {
    const largeRequestCounts = new Map<string, { count: number; resetTime: number }>();
    return (req: Request, res: Response, next: NextFunction) => {
      const contentLength = req.headers['content-length'];
      if (contentLength) {
        const sizeInBytes = parseInt(contentLength, 10);
        const isLargeRequest = sizeInBytes > 1024 * 1024;
        if (isLargeRequest) {
          const ip = req.ip || 'unknown';
          const now = Date.now();
          const windowMs = 15 * 60 * 1000;
          const record = largeRequestCounts.get(ip);
          if (!record || now > record.resetTime) {
            largeRequestCounts.set(ip, { count: 1, resetTime: now + windowMs });
          } else {
            record.count++;
            if (record.count > 5) {
              logger.warn('Rate limit exceeded for large requests', {
                ip,
                count: record.count,
                url: req.url || 'unknown',
              });
              return res.status(429).json({
                error: 'Too many large requests',
                retryAfter: Math.ceil((record.resetTime - now) / 1000),
                requestId: req.headers['x-request-id'] || 'unknown',
              });
            }
          }
        }
      }
      return next();
    };
  }
  getAllValidationMiddleware() {
    return [
      this.validateRequestSize(),
      this.validateURLs(),
      this.validateHeaders(),
      this.createSizeBasedRateLimit(),
      this.validateFields(),
    ];
  }
  private parseSize(sizeStr: string): number {
    const units: Record<string, number> = {
      b: 1,
      kb: 1024,
      mb: 1024 * 1024,
      gb: 1024 * 1024 * 1024,
    };

    // Use a safer approach without complex regex
    const trimmed = sizeStr.toLowerCase().trim();
    const unitMatch = trimmed.match(/(b|kb|mb|gb)$/);
    if (!unitMatch) {
      return 1024 * 1024;
    }

    const unit = unitMatch[1];
    const valueStr = trimmed.slice(0, -unit.length).trim();
    const value = parseFloat(valueStr);

    if (isNaN(value) || value <= 0) {
      return 1024 * 1024;
    }

    return value * units[unit];
  }
  private isValidAcceptHeader(accept: string): boolean {
    const validTypes = [
      'application/json',
      'text/html',
      'text/plain',
      'application/x-www-form-urlencoded',
      'multipart/form-data',
    ];
    return validTypes.some(type => accept.includes(type));
  }
}
export const inputValidation = new InputValidationMiddleware();
/* eslint-disable @typescript-eslint/unbound-method */
export const {
  validateRequestSize,
  validateFileUploads,
  validateFields,
  validateURLs,
  validateHeaders,
  createSizeBasedRateLimit,
  getAllValidationMiddleware,
} = inputValidation;
/* eslint-enable @typescript-eslint/unbound-method */
