"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateAuthRequest = validateAuthRequest;
exports.validateSignature = validateSignature;
function validateAuthRequest(req) {
    const { client_id } = req.query;
    if (!client_id) {
        return {
            isValid: false,
            error: 'Missing client_id'
        };
    }
    return { isValid: true };
}
function validateSignature(signature) {
    if (!signature.startsWith('0x')) {
        return {
            isValid: false,
            error: 'Invalid signature format'
        };
    }
    return { isValid: true };
}
