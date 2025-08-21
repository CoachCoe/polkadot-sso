"use strict";
// Storage Core Module
// Re-exports existing storage functionality for gradual migration
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdvancedKusamaService = exports.SecureKusamaService = exports.KusamaService = exports.IPFSService = void 0;
// Services
var ipfsService_1 = require("../../services/ipfsService");
Object.defineProperty(exports, "IPFSService", { enumerable: true, get: function () { return ipfsService_1.IPFSService; } });
var kusamaService_1 = require("../../services/kusamaService");
Object.defineProperty(exports, "KusamaService", { enumerable: true, get: function () { return kusamaService_1.KusamaService; } });
var secureKusamaService_1 = require("../../services/secureKusamaService");
Object.defineProperty(exports, "SecureKusamaService", { enumerable: true, get: function () { return secureKusamaService_1.SecureKusamaService; } });
var advancedKusamaService_1 = require("../../services/advancedKusamaService");
Object.defineProperty(exports, "AdvancedKusamaService", { enumerable: true, get: function () { return advancedKusamaService_1.AdvancedKusamaService; } });
//# sourceMappingURL=index.js.map