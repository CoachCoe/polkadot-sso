"use strict";
// Credential Management Utilities
// Helper functions for credential operations
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateCredentialId = generateCredentialId;
exports.generateCredentialHash = generateCredentialHash;
exports.validateCredentialData = validateCredentialData;
exports.isCredentialExpired = isCredentialExpired;
exports.isCredentialActive = isCredentialActive;
exports.formatCredentialForDisplay = formatCredentialForDisplay;
exports.generateCredentialSummary = generateCredentialSummary;
const crypto = __importStar(require("crypto"));
/**
 * Generate a unique credential ID
 */
function generateCredentialId() {
    return crypto.randomUUID();
}
/**
 * Generate a credential hash for integrity verification
 */
function generateCredentialHash(data) {
    return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
}
/**
 * Validate credential data against schema
 */
function validateCredentialData(data, credentialType) {
    const errors = [];
    try {
        const requiredFields = JSON.parse(credentialType.required_fields);
        const optionalFields = JSON.parse(credentialType.optional_fields);
        const validationRules = JSON.parse(credentialType.validation_rules);
        // Check required fields
        for (const field of requiredFields) {
            if (!(field in data)) {
                errors.push(`Required field '${field}' is missing`);
            }
        }
        // Check field validation rules
        for (const [field, rules] of Object.entries(validationRules)) {
            if (field in data) {
                const value = data[field];
                const ruleObj = rules; // Type assertion for validation rules
                if (ruleObj.type && typeof value !== ruleObj.type) {
                    errors.push(`Field '${field}' must be of type ${ruleObj.type}`);
                }
                if (ruleObj.minLength && typeof value === 'string' && value.length < ruleObj.minLength) {
                    errors.push(`Field '${field}' must be at least ${ruleObj.minLength} characters long`);
                }
                if (ruleObj.maxLength && typeof value === 'string' && value.length > ruleObj.maxLength) {
                    errors.push(`Field '${field}' must be no more than ${ruleObj.maxLength} characters long`);
                }
                if (ruleObj.pattern &&
                    typeof value === 'string' &&
                    !new RegExp(ruleObj.pattern).test(value)) {
                    errors.push(`Field '${field}' does not match required pattern`);
                }
            }
        }
        return {
            valid: errors.length === 0,
            errors,
        };
    }
    catch (error) {
        return {
            valid: false,
            errors: ['Invalid credential type schema'],
        };
    }
}
/**
 * Check if credential is expired
 */
function isCredentialExpired(credential) {
    if (!credential.expires_at) {
        return false;
    }
    return Date.now() > credential.expires_at;
}
/**
 * Check if credential is active
 */
function isCredentialActive(credential) {
    return credential.status === 'active' && !isCredentialExpired(credential);
}
/**
 * Format credential for display
 */
function formatCredentialForDisplay(credential) {
    return {
        id: credential.id,
        type: credential.credential_type_id,
        status: credential.status,
        issuedAt: new Date(credential.issued_at).toISOString(),
        expiresAt: credential.expires_at ? new Date(credential.expires_at).toISOString() : undefined,
        isActive: isCredentialActive(credential),
    };
}
/**
 * Generate credential summary for sharing
 */
function generateCredentialSummary(credential) {
    return {
        id: credential.id,
        type: credential.credential_type_id,
        status: credential.status,
        issuedAt: new Date(credential.issued_at).toISOString(),
        expiresAt: credential.expires_at ? new Date(credential.expires_at).toISOString() : undefined,
    };
}
//# sourceMappingURL=credentialUtils.js.map