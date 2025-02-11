"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSecureId = generateSecureId;
exports.generateNonce = generateNonce;
exports.generateFingerprint = generateFingerprint;
const crypto_1 = __importDefault(require("crypto"));
function generateSecureId() {
    return crypto_1.default.randomUUID();
}
function generateNonce() {
    return crypto_1.default.randomBytes(32).toString('hex');
}
function generateFingerprint() {
    return crypto_1.default.randomBytes(16).toString('hex');
}
