"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = exports.optionalAuth = exports.createAuthMiddleware = void 0;
exports.createNextAuth = createNextAuth;
var middleware_1 = require("./middleware");
Object.defineProperty(exports, "createAuthMiddleware", { enumerable: true, get: function () { return middleware_1.createAuthMiddleware; } });
Object.defineProperty(exports, "optionalAuth", { enumerable: true, get: function () { return middleware_1.optionalAuth; } });
Object.defineProperty(exports, "requireAuth", { enumerable: true, get: function () { return middleware_1.requireAuth; } });
const middleware_2 = require("./middleware");
function createNextAuth(config = {}) {
    return {
        middleware: (0, middleware_2.createAuthMiddleware)(config),
        config,
    };
}
//# sourceMappingURL=index.js.map