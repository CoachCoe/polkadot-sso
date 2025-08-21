"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.logError = exports.logRequest = exports.createLogger = void 0;
const winston = __importStar(require("winston"));
const createLogger = (service) => {
    return winston.createLogger({
        format: winston.format.combine(winston.format.timestamp(), winston.format.json(), winston.format.printf(({ timestamp, level, message, ...meta }) => {
            return JSON.stringify({
                timestamp,
                service,
                level,
                message,
                ...meta,
            });
        })),
        transports: [
            new winston.transports.Console(),
            new winston.transports.File({ filename: 'error.log', level: 'error' }),
            new winston.transports.File({ filename: 'combined.log' }),
        ],
    });
};
exports.createLogger = createLogger;
const defaultLogger = (0, exports.createLogger)('default');
const logRequest = (req, message, meta = {}) => {
    const reqWithId = req;
    defaultLogger.info(message, {
        requestId: reqWithId.id,
        method: req.method,
        url: req.url,
        ip: req.ip,
        ...meta,
    });
};
exports.logRequest = logRequest;
const logError = (req, error, meta = {}) => {
    const reqWithId = req;
    defaultLogger.error(error.message, {
        requestId: reqWithId.id,
        method: req.method,
        url: req.url,
        ip: req.ip,
        stack: error.stack,
        ...meta,
    });
};
exports.logError = logError;
//# sourceMappingURL=logger.js.map