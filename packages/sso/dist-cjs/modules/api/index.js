"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTokenRouter = exports.createClientRouter = exports.createAuthRouter = void 0;
var index_js_1 = require("../../routes/auth/index.js");
Object.defineProperty(exports, "createAuthRouter", { enumerable: true, get: function () { return index_js_1.createAuthRouter; } });
var clients_1 = require("../../routes/clients");
Object.defineProperty(exports, "createClientRouter", { enumerable: true, get: function () { return clients_1.createClientRouter; } });
var tokens_1 = require("../../routes/tokens");
Object.defineProperty(exports, "createTokenRouter", { enumerable: true, get: function () { return tokens_1.createTokenRouter; } });
//# sourceMappingURL=index.js.map