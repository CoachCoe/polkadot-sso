"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeInput = exports.escapeHtml = void 0;
const escapeHtml = (unsafe) => {
    return unsafe
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
};
exports.escapeHtml = escapeHtml;
const sanitizeInput = (obj) => {
    if (typeof obj !== 'object' || obj === null) {
        return typeof obj === 'string' ? (0, exports.escapeHtml)(obj) : obj;
    }
    return Object.keys(obj).reduce((acc, key) => {
        const value = obj[key];
        acc[key] =
            typeof value === 'object' && value !== null
                ? (0, exports.sanitizeInput)(value)
                : typeof value === 'string'
                    ? (0, exports.escapeHtml)(value)
                    : value;
        return acc;
    }, {});
};
exports.sanitizeInput = sanitizeInput;
//# sourceMappingURL=sanitization.js.map