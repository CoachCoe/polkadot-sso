"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addRequestId = void 0;
const crypto_1 = __importDefault(require("crypto"));
const addRequestId = (req, res, next) => {
    req.id = crypto_1.default.randomUUID();
    next();
};
exports.addRequestId = addRequestId;
//# sourceMappingURL=requestId.js.map