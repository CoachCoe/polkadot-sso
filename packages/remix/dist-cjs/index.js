"use strict";
// Remix adapter for Polkadot authentication
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAuthenticated = exports.getUserFromRequest = exports.createAuthMiddleware = exports.createAuthApiRoutes = void 0;
exports.createRemixAuth = createRemixAuth;
var api_routes_1 = require("./api-routes");
Object.defineProperty(exports, "createAuthApiRoutes", { enumerable: true, get: function () { return api_routes_1.createAuthApiRoutes; } });
var middleware_1 = require("./middleware");
Object.defineProperty(exports, "createAuthMiddleware", { enumerable: true, get: function () { return middleware_1.createAuthMiddleware; } });
Object.defineProperty(exports, "getUserFromRequest", { enumerable: true, get: function () { return middleware_1.getUserFromRequest; } });
Object.defineProperty(exports, "isAuthenticated", { enumerable: true, get: function () { return middleware_1.isAuthenticated; } });
function createRemixAuth(config) {
    const { createAuthApiRoutes } = require('./api-routes');
    const { createAuthMiddleware } = require('./middleware');
    const apiRoutes = createAuthApiRoutes(config);
    const middleware = createAuthMiddleware(config);
    return {
        apiRoutes,
        middleware,
        config,
    };
}
exports.default = createRemixAuth;
//# sourceMappingURL=index.js.map