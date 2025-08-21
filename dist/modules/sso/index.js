"use strict";
// SSO Core Module
// Re-exports existing SSO functionality for gradual migration
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUserRateLimiter = exports.createOwnershipMiddleware = exports.createAuthorizationMiddleware = exports.createAuthenticationMiddleware = exports.TokenService = exports.ChallengeService = void 0;
// Services
var challengeService_1 = require("../../services/challengeService");
Object.defineProperty(exports, "ChallengeService", { enumerable: true, get: function () { return challengeService_1.ChallengeService; } });
var token_1 = require("../../services/token");
Object.defineProperty(exports, "TokenService", { enumerable: true, get: function () { return token_1.TokenService; } });
// Middleware
var authenticationMiddleware_1 = require("../../middleware/authenticationMiddleware");
Object.defineProperty(exports, "createAuthenticationMiddleware", { enumerable: true, get: function () { return authenticationMiddleware_1.createAuthenticationMiddleware; } });
Object.defineProperty(exports, "createAuthorizationMiddleware", { enumerable: true, get: function () { return authenticationMiddleware_1.createAuthorizationMiddleware; } });
Object.defineProperty(exports, "createOwnershipMiddleware", { enumerable: true, get: function () { return authenticationMiddleware_1.createOwnershipMiddleware; } });
Object.defineProperty(exports, "createUserRateLimiter", { enumerable: true, get: function () { return authenticationMiddleware_1.createUserRateLimiter; } });
//# sourceMappingURL=index.js.map