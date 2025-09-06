"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLogger = createLogger;
function createLogger(service) {
    return {
        info: (message, meta) => {
            console.log(`[${service}] ${message}`, meta ? JSON.stringify(meta) : '');
        },
        error: (message, meta) => {
            console.error(`[${service}] ${message}`, meta ? JSON.stringify(meta) : '');
        },
        warn: (message, meta) => {
            console.warn(`[${service}] ${message}`, meta ? JSON.stringify(meta) : '');
        },
        debug: (message, meta) => {
            console.debug(`[${service}] ${message}`, meta ? JSON.stringify(meta) : '');
        },
    };
}
//# sourceMappingURL=logger.js.map