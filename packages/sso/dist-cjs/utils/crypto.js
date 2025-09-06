"use strict";
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
exports.createHmac = exports.randomUUID = exports.createHash = exports.randomBytes = exports.cryptoUtils = void 0;
const CryptoJS = __importStar(require("crypto-js"));
class BrowserCryptoUtils {
    randomBytes(size) {
        const array = new Uint8Array(size);
        if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
            window.crypto.getRandomValues(array);
        }
        else {
            // Fallback for environments without crypto.getRandomValues
            for (let i = 0; i < size; i++) {
                array[i] = Math.floor(Math.random() * 256);
            }
        }
        return array;
    }
    createHash(algorithm) {
        let result = null;
        let input = null;
        return {
            update: (data) => {
                input = typeof data === 'string' ? data : CryptoJS.lib.WordArray.create(data);
                return this;
            },
            digest: (encoding = 'hex') => {
                if (!input) {
                    throw new Error('No data provided to hash');
                }
                switch (algorithm.toLowerCase()) {
                    case 'sha256':
                        result = CryptoJS.SHA256(input);
                        break;
                    case 'sha512':
                        result = CryptoJS.SHA512(input);
                        break;
                    case 'md5':
                        result = CryptoJS.MD5(input);
                        break;
                    default:
                        throw new Error(`Unsupported hash algorithm: ${algorithm}`);
                }
                if (encoding === 'hex') {
                    return result.toString(CryptoJS.enc.Hex);
                }
                else if (encoding === 'base64') {
                    return result.toString(CryptoJS.enc.Base64);
                }
                else {
                    return result.toString();
                }
            },
        };
    }
    randomUUID() {
        if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
            return window.crypto.randomUUID();
        }
        // Fallback UUID v4 implementation
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            const r = (Math.random() * 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        });
    }
    createHmac(algorithm, key) {
        const keyString = typeof key === 'string' ? key : CryptoJS.lib.WordArray.create(key);
        let result = null;
        let input = null;
        return {
            update: (data) => {
                input = typeof data === 'string' ? data : CryptoJS.lib.WordArray.create(data);
                return this;
            },
            digest: (encoding = 'hex') => {
                if (!input) {
                    throw new Error('No data provided to HMAC');
                }
                switch (algorithm.toLowerCase()) {
                    case 'sha256':
                        result = CryptoJS.HmacSHA256(input, keyString);
                        break;
                    case 'sha512':
                        result = CryptoJS.HmacSHA512(input, keyString);
                        break;
                    default:
                        throw new Error(`Unsupported HMAC algorithm: ${algorithm}`);
                }
                if (encoding === 'hex') {
                    return result.toString(CryptoJS.enc.Hex);
                }
                else if (encoding === 'base64') {
                    return result.toString(CryptoJS.enc.Base64);
                }
                else {
                    return result.toString();
                }
            },
        };
    }
}
class NodeCryptoUtils {
    constructor() {
        this.crypto = require('crypto');
    }
    randomBytes(size) {
        return this.crypto.randomBytes(size);
    }
    createHash(algorithm) {
        const hash = this.crypto.createHash(algorithm);
        return {
            update: (data) => {
                hash.update(data);
                return this;
            },
            digest: (encoding = 'hex') => {
                return hash.digest(encoding);
            },
        };
    }
    randomUUID() {
        return this.crypto.randomUUID();
    }
    createHmac(algorithm, key) {
        const hmac = this.crypto.createHmac(algorithm, key);
        return {
            update: (data) => {
                hmac.update(data);
                return this;
            },
            digest: (encoding = 'hex') => {
                return hmac.digest(encoding);
            },
        };
    }
}
// Detect environment and export appropriate crypto utils
exports.cryptoUtils = (() => {
    try {
        // Try to require Node.js crypto module
        require('crypto');
        return new NodeCryptoUtils();
    }
    catch {
        // Fall back to browser-compatible implementation
        return new BrowserCryptoUtils();
    }
})();
// Export individual functions for convenience
const randomBytes = (size) => exports.cryptoUtils.randomBytes(size);
exports.randomBytes = randomBytes;
const createHash = (algorithm) => exports.cryptoUtils.createHash(algorithm);
exports.createHash = createHash;
const randomUUID = () => exports.cryptoUtils.randomUUID();
exports.randomUUID = randomUUID;
const createHmac = (algorithm, key) => exports.cryptoUtils.createHmac(algorithm, key);
exports.createHmac = createHmac;
//# sourceMappingURL=crypto.js.map