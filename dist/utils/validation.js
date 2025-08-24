"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateAuthRequest = validateAuthRequest;
exports.validateSignature = validateSignature;
exports.validateClientCredentials = validateClientCredentials;
function validateAuthRequest(req) {
    const { client_id } = req.query;
    if (!client_id) {
        return {
            isValid: false,
            error: 'Missing client_id',
        };
    }
    return { isValid: true };
}
function validateSignature(signature) {
    if (!signature.startsWith('0x')) {
        return {
            isValid: false,
            error: 'Invalid signature format',
        };
    }
    return { isValid: true };
}
async function validateClientCredentials(req) {
    const { client_id, client_secret } = req.body;
    if (!client_id || !client_secret) {
        return false;
    }
    // For demo purposes, we'll validate against the hardcoded demo client
    // In production, this would query the database
    if (client_id === 'demo-app' &&
        client_secret === 'demo-client-secret-32-chars-minimum-required') {
        return true;
    }
    return false;
}
//# sourceMappingURL=validation.js.map