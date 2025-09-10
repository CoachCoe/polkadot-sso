"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = exports.TelegramWalletManager = exports.TelegramBotHandlers = exports.TelegramSessionManager = exports.TelegramQRGenerator = exports.createTelegramProvider = exports.TelegramProvider = exports.DEFAULT_TELEGRAM_CONFIG = void 0;
// Main exports
var provider_1 = require("./provider");
Object.defineProperty(exports, "DEFAULT_TELEGRAM_CONFIG", { enumerable: true, get: function () { return provider_1.DEFAULT_TELEGRAM_CONFIG; } });
Object.defineProperty(exports, "TelegramProvider", { enumerable: true, get: function () { return provider_1.TelegramProvider; } });
Object.defineProperty(exports, "createTelegramProvider", { enumerable: true, get: function () { return provider_1.createTelegramProvider; } });
// Component exports
var qr_generator_1 = require("./auth/qr-generator");
Object.defineProperty(exports, "TelegramQRGenerator", { enumerable: true, get: function () { return qr_generator_1.TelegramQRGenerator; } });
var session_1 = require("./auth/session");
Object.defineProperty(exports, "TelegramSessionManager", { enumerable: true, get: function () { return session_1.TelegramSessionManager; } });
var handlers_1 = require("./bot/handlers");
Object.defineProperty(exports, "TelegramBotHandlers", { enumerable: true, get: function () { return handlers_1.TelegramBotHandlers; } });
var manager_1 = require("./wallet/manager");
Object.defineProperty(exports, "TelegramWalletManager", { enumerable: true, get: function () { return manager_1.TelegramWalletManager; } });
// Default export
var provider_2 = require("./provider");
Object.defineProperty(exports, "default", { enumerable: true, get: function () { return provider_2.createTelegramProvider; } });
//# sourceMappingURL=index.js.map