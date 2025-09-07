"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.usePolkadotAuth = exports.getWalletAdapter = exports.getAvailableWallets = exports.defaultWalletAdapters = exports.SubWalletAdapter = exports.TalismanAdapter = exports.PolkadotJsAdapter = exports.createPolkadotAuthClient = exports.PolkadotAuthClient = void 0;
var PolkadotAuthClient_1 = require("./PolkadotAuthClient");
Object.defineProperty(exports, "PolkadotAuthClient", { enumerable: true, get: function () { return PolkadotAuthClient_1.PolkadotAuthClient; } });
Object.defineProperty(exports, "createPolkadotAuthClient", { enumerable: true, get: function () { return PolkadotAuthClient_1.createPolkadotAuthClient; } });
var walletAdapters_1 = require("./walletAdapters");
Object.defineProperty(exports, "PolkadotJsAdapter", { enumerable: true, get: function () { return walletAdapters_1.PolkadotJsAdapter; } });
Object.defineProperty(exports, "TalismanAdapter", { enumerable: true, get: function () { return walletAdapters_1.TalismanAdapter; } });
Object.defineProperty(exports, "SubWalletAdapter", { enumerable: true, get: function () { return walletAdapters_1.SubWalletAdapter; } });
Object.defineProperty(exports, "defaultWalletAdapters", { enumerable: true, get: function () { return walletAdapters_1.defaultWalletAdapters; } });
Object.defineProperty(exports, "getAvailableWallets", { enumerable: true, get: function () { return walletAdapters_1.getAvailableWallets; } });
Object.defineProperty(exports, "getWalletAdapter", { enumerable: true, get: function () { return walletAdapters_1.getWalletAdapter; } });
var usePolkadotAuth_1 = require("./hooks/usePolkadotAuth");
Object.defineProperty(exports, "usePolkadotAuth", { enumerable: true, get: function () { return usePolkadotAuth_1.usePolkadotAuth; } });
//# sourceMappingURL=index.js.map