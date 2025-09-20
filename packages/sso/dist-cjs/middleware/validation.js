"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeRequestParams = exports.validateQuery = exports.validateBody = exports.sanitizeRequest = void 0;
const zod_1 = require("zod");
const sanitization_js_1 = require("../utils/sanitization.js");
const sanitizeRequest = () => (req, res, next) => {
    if (req.body)
        req.body = (0, sanitization_js_1.sanitizeInput)(req.body);
    if (req.query)
        req.query = (0, sanitization_js_1.sanitizeInput)(req.query);
    next();
};
exports.sanitizeRequest = sanitizeRequest;
const validateBody = (schema) => {
    return (req, res, next) => {
        try {
            const dataToValidate = {
                body: req.body,
                query: req.query,
                params: req.params,
            };
            schema.parse(dataToValidate);
            next();
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                res.status(400).json({
                    error: 'Validation failed',
                    details: error.errors,
                });
            }
            else {
                next(error);
            }
        }
    };
};
exports.validateBody = validateBody;
const validateQuery = (schema) => {
    return (req, res, next) => {
        try {
            schema.parse(req.query);
            next();
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                res.status(400).json({
                    error: 'Validation failed',
                    details: error.errors,
                });
            }
            else {
                next(error);
            }
        }
    };
};
exports.validateQuery = validateQuery;
const sanitizeRequestParams = () => (req, res, next) => {
    for (const param in req.params) {
        req.params[param] = (0, sanitization_js_1.sanitizeInput)(req.params[param]);
    }
    for (const param in req.query) {
        if (typeof req.query[param] === 'string') {
            req.query[param] = (0, sanitization_js_1.sanitizeInput)(req.query[param]);
        }
    }
    next();
};
exports.sanitizeRequestParams = sanitizeRequestParams;
//# sourceMappingURL=validation.js.map