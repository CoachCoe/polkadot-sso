"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addRequestId = void 0;
const crypto_1 = require("crypto");
const addRequestId = (req, res, next) => {
    req.id = (0, crypto_1.randomUUID)();
    next();
};
exports.addRequestId = addRequestId;
//# sourceMappingURL=requestId.js.map