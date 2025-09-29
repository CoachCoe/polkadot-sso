/**
 * Standardized response utilities for consistent API responses
 */

import { Response } from 'express';
import { HTTP_STATUS, ERROR_CODES } from '../constants/config.js';
import { PolkadotSSOError } from './errors.js';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: number;
    requestId?: string;
  };
}

export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode: number = HTTP_STATUS.OK,
  requestId?: string
): void {
  const response: ApiResponse<T> = {
    success: true,
    data,
    meta: {
      timestamp: Date.now(),
      requestId,
    },
  };
  
  res.status(statusCode).json(response);
}

export function sendError(
  res: Response,
  error: PolkadotSSOError,
  requestId?: string
): void {
  const response: ApiResponse = {
    success: false,
    error: {
      code: error.code,
      message: error.message,
      details: error.details,
    },
    meta: {
      timestamp: error.timestamp,
      requestId: requestId || error.requestId,
    },
  };
  
  res.status(error.statusCode).json(response);
}

export function sendValidationError(
  res: Response,
  message: string,
  details?: any,
  requestId?: string
): void {
  const response: ApiResponse = {
    success: false,
    error: {
      code: ERROR_CODES.VALIDATION_ERROR,
      message,
      details,
    },
    meta: {
      timestamp: Date.now(),
      requestId,
    },
  };
  
  res.status(HTTP_STATUS.BAD_REQUEST).json(response);
}

export function sendAuthError(
  res: Response,
  message: string = 'Authentication required',
  details?: any,
  requestId?: string
): void {
  const response: ApiResponse = {
    success: false,
    error: {
      code: ERROR_CODES.AUTHENTICATION_ERROR,
      message,
      details,
    },
    meta: {
      timestamp: Date.now(),
      requestId,
    },
  };
  
  res.status(HTTP_STATUS.UNAUTHORIZED).json(response);
}

export function sendNotFoundError(
  res: Response,
  message: string = 'Resource not found',
  details?: any,
  requestId?: string
): void {
  const response: ApiResponse = {
    success: false,
    error: {
      code: ERROR_CODES.NOT_FOUND_ERROR,
      message,
      details,
    },
    meta: {
      timestamp: Date.now(),
      requestId,
    },
  };
  
  res.status(HTTP_STATUS.NOT_FOUND).json(response);
}
