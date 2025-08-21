"use strict";
// Security Core Module
// Re-exports existing security functionality for gradual migration
Object.defineProperty(exports, "__esModule", { value: true });
exports.createQueryProtectionMiddleware = exports.QueryProtection = exports.decryptData = exports.encryptData = exports.enhancedEncryption = exports.SecretManager = exports.sanitizeRequestParams = exports.validateBody = exports.sanitizeRequest = exports.createRateLimiters = exports.createBruteForceProtection = exports.createSecurityAudit = exports.advancedSecurityHeaders = exports.auditKusamaOperation = exports.sanitizeKusamaRequest = exports.enhancedCORS = exports.validateKusamaRequest = exports.validateRequestSize = exports.enhancedRateLimiter = exports.SecurityMonitoringService = exports.DataRetentionService = exports.AuditService = void 0;
// Services
var auditService_1 = require("../../services/auditService");
Object.defineProperty(exports, "AuditService", { enumerable: true, get: function () { return auditService_1.AuditService; } });
var dataRetentionService_1 = require("../../services/dataRetentionService");
Object.defineProperty(exports, "DataRetentionService", { enumerable: true, get: function () { return dataRetentionService_1.DataRetentionService; } });
var securityMonitoringService_1 = require("../../services/securityMonitoringService");
Object.defineProperty(exports, "SecurityMonitoringService", { enumerable: true, get: function () { return securityMonitoringService_1.SecurityMonitoringService; } });
// Middleware
var enhancedSecurity_1 = require("../../middleware/enhancedSecurity");
Object.defineProperty(exports, "enhancedRateLimiter", { enumerable: true, get: function () { return enhancedSecurity_1.enhancedRateLimiter; } });
Object.defineProperty(exports, "validateRequestSize", { enumerable: true, get: function () { return enhancedSecurity_1.validateRequestSize; } });
Object.defineProperty(exports, "validateKusamaRequest", { enumerable: true, get: function () { return enhancedSecurity_1.validateKusamaRequest; } });
Object.defineProperty(exports, "enhancedCORS", { enumerable: true, get: function () { return enhancedSecurity_1.enhancedCORS; } });
Object.defineProperty(exports, "sanitizeKusamaRequest", { enumerable: true, get: function () { return enhancedSecurity_1.sanitizeKusamaRequest; } });
Object.defineProperty(exports, "auditKusamaOperation", { enumerable: true, get: function () { return enhancedSecurity_1.auditKusamaOperation; } });
var advancedSecurityHeaders_1 = require("../../middleware/advancedSecurityHeaders");
Object.defineProperty(exports, "advancedSecurityHeaders", { enumerable: true, get: function () { return advancedSecurityHeaders_1.advancedSecurityHeaders; } });
var securityAudit_1 = require("../../middleware/securityAudit");
Object.defineProperty(exports, "createSecurityAudit", { enumerable: true, get: function () { return securityAudit_1.createSecurityAudit; } });
var bruteForce_1 = require("../../middleware/bruteForce");
Object.defineProperty(exports, "createBruteForceProtection", { enumerable: true, get: function () { return bruteForce_1.createBruteForceProtection; } });
var rateLimit_1 = require("../../middleware/rateLimit");
Object.defineProperty(exports, "createRateLimiters", { enumerable: true, get: function () { return rateLimit_1.createRateLimiters; } });
var validation_1 = require("../../middleware/validation");
Object.defineProperty(exports, "sanitizeRequest", { enumerable: true, get: function () { return validation_1.sanitizeRequest; } });
Object.defineProperty(exports, "validateBody", { enumerable: true, get: function () { return validation_1.validateBody; } });
Object.defineProperty(exports, "sanitizeRequestParams", { enumerable: true, get: function () { return validation_1.sanitizeRequestParams; } });
// Utilities
var secrets_1 = require("../../utils/secrets");
Object.defineProperty(exports, "SecretManager", { enumerable: true, get: function () { return secrets_1.SecretManager; } });
var enhancedEncryption_1 = require("../../utils/enhancedEncryption");
Object.defineProperty(exports, "enhancedEncryption", { enumerable: true, get: function () { return enhancedEncryption_1.enhancedEncryption; } });
var encryption_1 = require("../../utils/encryption");
Object.defineProperty(exports, "encryptData", { enumerable: true, get: function () { return encryption_1.encryptData; } });
Object.defineProperty(exports, "decryptData", { enumerable: true, get: function () { return encryption_1.decryptData; } });
var queryProtection_1 = require("../../utils/queryProtection");
Object.defineProperty(exports, "QueryProtection", { enumerable: true, get: function () { return queryProtection_1.QueryProtection; } });
Object.defineProperty(exports, "createQueryProtectionMiddleware", { enumerable: true, get: function () { return queryProtection_1.createQueryProtectionMiddleware; } });
//# sourceMappingURL=index.js.map