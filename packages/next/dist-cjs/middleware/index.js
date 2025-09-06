"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAuthMiddleware = createAuthMiddleware;
exports.requireAuth = requireAuth;
exports.optionalAuth = optionalAuth;
function createAuthMiddleware(config = {}) {
    return async function authMiddleware(req) {
        console.log('Auth middleware called with config:', config);
        return null;
    };
}
function requireAuth() {
    return function requireAuthMiddleware(req) {
        console.log('Require auth middleware called');
        return null;
    };
}
function optionalAuth() {
    return function optionalAuthMiddleware(req) {
        console.log('Optional auth middleware called');
        return null;
    };
}
//# sourceMappingURL=index.js.map