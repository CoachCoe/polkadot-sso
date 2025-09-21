"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validationMiddleware = exports.validateIPAddress = exports.validateRequestSize = exports.validateContentType = exports.sanitizeRequestParams = exports.validateParams = exports.validateQuery = exports.validateBody = exports.sanitizeRequest = void 0;
const errors_js_1 = require("../utils/errors.js");
const logger_js_1 = require("../utils/logger.js");
const sanitization_js_1 = require("../utils/sanitization.js");
const logger = (0, logger_js_1.createLogger)('validation-middleware');
/**
 * Enhanced input sanitization
 */
const sanitizeRequest = () => (req, _res, next) => {
    try {
        if (req.body) {
            req.body = (0, sanitization_js_1.sanitizeInput)(req.body);
        }
        if (req.query) {
            req.query = (0, sanitization_js_1.sanitizeInput)(req.query);
        }
        if (req.params) {
            req.params = (0, sanitization_js_1.sanitizeInput)(req.params);
        }
        next();
    }
    catch (error) {
        logger.error('Sanitization failed', {
            error: error instanceof Error ? error.message : String(error),
            path: req.path,
            method: req.method,
        });
        next(new errors_js_1.ValidationError('Invalid input data'));
    }
};
exports.sanitizeRequest = sanitizeRequest;
/**
 * Enhanced body validation with detailed error messages
 */
const validateBody = (schema) => {
    return (req, _res, next) => {
        try {
            const dataToValidate = {
                body: req.body,
                query: req.query,
                params: req.params,
            };
            const result = schema.safeParse(dataToValidate);
            if (!result.success) {
                const requestId = req.requestId;
                const error = new errors_js_1.ValidationError('Request validation failed', {
                    errors: result.error.errors,
                    path: req.path,
                    method: req.method,
                }, requestId);
                logger.warn('Body validation failed', {
                    requestId,
                    path: req.path,
                    method: req.method,
                    errors: result.error.errors,
                });
                return next(error);
            }
            // Replace the original data with validated data
            req.body = result.data.body;
            req.query = result.data.query;
            req.params = result.data.params;
            next();
        }
        catch (error) {
            logger.error('Validation middleware error', {
                error: error instanceof Error ? error.message : String(error),
                path: req.path,
                method: req.method,
            });
            next(error);
        }
    };
};
exports.validateBody = validateBody;
/**
 * Enhanced query validation
 */
const validateQuery = (schema) => {
    return (req, _res, next) => {
        try {
            const result = schema.safeParse(req.query);
            if (!result.success) {
                const requestId = req.requestId;
                const error = new errors_js_1.ValidationError('Query validation failed', {
                    errors: result.error.errors,
                    query: req.query,
                    path: req.path,
                    method: req.method,
                }, requestId);
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
        }
        catch (error) {
            logger.error('Query validation middleware error', {
                error: error instanceof Error ? error.message : String(error),
                path: req.path,
                method: req.method,
            });
            next(error);
        }
    };
};
exports.validateQuery = validateQuery;
/**
 * Enhanced parameter validation
 */
const validateParams = (schema) => {
    return (req, _res, next) => {
        try {
            const result = schema.safeParse(req.params);
            if (!result.success) {
                const requestId = req.requestId;
                const error = new errors_js_1.ValidationError('Parameter validation failed', {
                    errors: result.error.errors,
                    params: req.params,
                    path: req.path,
                    method: req.method,
                }, requestId);
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
        }
        catch (error) {
            logger.error('Parameter validation middleware error', {
                error: error instanceof Error ? error.message : String(error),
                path: req.path,
                method: req.method,
            });
            next(error);
        }
    };
};
exports.validateParams = validateParams;
/**
 * Enhanced sanitization for request parameters
 */
const sanitizeRequestParams = () => (req, _res, next) => {
    try {
        // Sanitize URL parameters
        for (const param in req.params) {
            if (typeof req.params[param] === 'string') {
                req.params[param] = (0, sanitization_js_1.sanitizeInput)(req.params[param]);
            }
        }
        // Sanitize query parameters
        for (const param in req.query) {
            if (typeof req.query[param] === 'string') {
                req.query[param] = (0, sanitization_js_1.sanitizeInput)(req.query[param]);
            }
            else if (Array.isArray(req.query[param])) {
                req.query[param] = req.query[param].map(item => typeof item === 'string' ? (0, sanitization_js_1.sanitizeInput)(item) : item);
            }
        }
        next();
    }
    catch (error) {
        logger.error('Parameter sanitization failed', {
            error: error instanceof Error ? error.message : String(error),
            path: req.path,
            method: req.method,
        });
        next(new errors_js_1.ValidationError('Parameter sanitization failed'));
    }
};
exports.sanitizeRequestParams = sanitizeRequestParams;
/**
 * Content type validation
 */
const validateContentType = (allowedTypes = ['application/json']) => {
    return (req, _res, next) => {
        const contentType = req.get('Content-Type');
        if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
            if (!contentType || !allowedTypes.some(type => contentType.includes(type))) {
                const requestId = req.requestId;
                const error = new errors_js_1.ValidationError('Invalid content type', {
                    received: contentType,
                    allowed: allowedTypes,
                }, requestId);
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
exports.validateContentType = validateContentType;
/**
 * Request size validation
 */
const validateRequestSize = (maxSize = 1024 * 1024) => {
    return (req, _res, next) => {
        const contentLength = parseInt(req.get('Content-Length') || '0');
        if (contentLength > maxSize) {
            const requestId = req.requestId;
            const error = new errors_js_1.ValidationError('Request too large', {
                size: contentLength,
                maxSize,
            }, requestId);
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
exports.validateRequestSize = validateRequestSize;
/**
 * IP address validation
 */
const validateIPAddress = () => (req, _res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    if (!ip) {
        logger.warn('No IP address found', {
            path: req.path,
            method: req.method,
            headers: req.headers,
        });
    }
    // Basic IP format validation
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
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
exports.validateIPAddress = validateIPAddress;
/**
 * Combined validation middleware
 */
exports.validationMiddleware = [
    (0, exports.sanitizeRequest)(),
    (0, exports.sanitizeRequestParams)(),
    (0, exports.validateContentType)(),
    (0, exports.validateRequestSize)(),
    (0, exports.validateIPAddress)(),
];
//# sourceMappingURL=validation.js.map