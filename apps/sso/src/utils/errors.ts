/**
 * Custom error classes for consistent error handling across the application
 */

export abstract class PolkadotSSOError extends Error {
  abstract readonly code: string;
  abstract readonly statusCode: number;
  public readonly timestamp: number;
  public readonly details?: any;

  constructor(
    message: string,
    details?: any,
    public readonly requestId?: string
  ) {
    super(message);
    this.name = this.constructor.name;
    this.timestamp = Date.now();
    this.details = details;

    // Maintain proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      timestamp: this.timestamp,
      details: this.details,
      requestId: this.requestId,
    };
  }
}

export class ValidationError extends PolkadotSSOError {
  readonly code = 'VALIDATION_ERROR';
  readonly statusCode = 400;

  constructor(message: string, details?: any, requestId?: string) {
    super(message, details, requestId);
  }
}

export class AuthenticationError extends PolkadotSSOError {
  readonly code = 'AUTHENTICATION_ERROR';
  readonly statusCode = 401;

  constructor(message: string, details?: any, requestId?: string) {
    super(message, details, requestId);
  }
}

export class AuthorizationError extends PolkadotSSOError {
  readonly code = 'AUTHORIZATION_ERROR';
  readonly statusCode = 403;

  constructor(message: string, details?: any, requestId?: string) {
    super(message, details, requestId);
  }
}

export class NotFoundError extends PolkadotSSOError {
  readonly code = 'NOT_FOUND';
  readonly statusCode = 404;

  constructor(message: string, details?: any, requestId?: string) {
    super(message, details, requestId);
  }
}

export class ConflictError extends PolkadotSSOError {
  readonly code = 'CONFLICT';
  readonly statusCode = 409;

  constructor(message: string, details?: any, requestId?: string) {
    super(message, details, requestId);
  }
}

export class RateLimitError extends PolkadotSSOError {
  readonly code = 'RATE_LIMIT_EXCEEDED';
  readonly statusCode = 429;

  constructor(message: string, details?: any, requestId?: string) {
    super(message, details, requestId);
  }
}

export class DatabaseError extends PolkadotSSOError {
  readonly code = 'DATABASE_ERROR';
  readonly statusCode = 500;

  constructor(message: string, details?: any, requestId?: string) {
    super(message, details, requestId);
  }
}

export class ServiceUnavailableError extends PolkadotSSOError {
  readonly code = 'SERVICE_UNAVAILABLE';
  readonly statusCode = 503;

  constructor(message: string, details?: any, requestId?: string) {
    super(message, details, requestId);
  }
}

export class InternalServerError extends PolkadotSSOError {
  readonly code = 'INTERNAL_SERVER_ERROR';
  readonly statusCode = 500;

  constructor(message: string, details?: any, requestId?: string) {
    super(message, details, requestId);
  }
}

/**
 * Error handler utility functions
 */
export class ErrorHandler {
  /**
   * Convert any error to a PolkadotSSOError
   */
  static fromError(error: unknown, requestId?: string): PolkadotSSOError {
    if (error instanceof PolkadotSSOError) {
      return error;
    }

    if (error instanceof Error) {
      return new InternalServerError(
        'An unexpected error occurred',
        {
          originalError: error.message,
          stack: error.stack,
        },
        requestId
      );
    }

    return new InternalServerError(
      'An unknown error occurred',
      { originalError: String(error) },
      requestId
    );
  }

  /**
   * Check if an error is a PolkadotSSOError
   */
  static isPolkadotSSOError(error: unknown): error is PolkadotSSOError {
    return error instanceof PolkadotSSOError;
  }

  /**
   * Get appropriate error for database operations
   */
  static fromDatabaseError(error: unknown, operation: string, requestId?: string): DatabaseError {
    const message = `Database operation failed: ${operation}`;
    const details =
      error instanceof Error ? { originalError: error.message } : { originalError: String(error) };
    return new DatabaseError(message, details, requestId);
  }

  /**
   * Get appropriate error for validation failures
   */
  static fromValidationError(message: string, details?: any, requestId?: string): ValidationError {
    return new ValidationError(message, details, requestId);
  }

  /**
   * Get appropriate error for authentication failures
   */
  static fromAuthenticationError(
    message: string,
    details?: any,
    requestId?: string
  ): AuthenticationError {
    return new AuthenticationError(message, details, requestId);
  }
}

/**
 * Error response interface for API responses
 */
export interface ErrorResponse {
  error: string;
  code: string;
  message: string;
  statusCode: number;
  timestamp: number;
  details?: any;
  requestId?: string;
}

/**
 * Convert PolkadotSSOError to API response format
 */
export function errorToResponse(error: PolkadotSSOError): ErrorResponse {
  return {
    error: error.name,
    code: error.code,
    message: error.message,
    statusCode: error.statusCode,
    timestamp: error.timestamp,
    details: error.details,
    requestId: error.requestId,
  };
}
