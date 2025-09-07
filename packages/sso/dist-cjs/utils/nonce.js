"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateNonce = generateNonce;
const crypto_1 = require("crypto");
function generateNonce() {
    return (0, crypto_1.randomBytes)(16).toString('base64');
}
//# sourceMappingURL=nonce.js.map