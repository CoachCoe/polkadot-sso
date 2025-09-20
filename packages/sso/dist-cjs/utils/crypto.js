"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createHmac = exports.randomUUID = exports.createHash = exports.randomBytes = exports.cryptoUtils = void 0;
const crypto_js_1 = __importDefault(require("crypto-js"));
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
                input = typeof data === 'string' ? data : crypto_js_1.default.lib.WordArray.create(data);
                return this;
            },
            digest: (encoding = 'hex') => {
                if (!input) {
                    throw new Error('No data provided to hash');
                }
                switch (algorithm.toLowerCase()) {
                    case 'sha256':
                        result = crypto_js_1.default.SHA256(input);
                        break;
                    case 'sha512':
                        result = crypto_js_1.default.SHA512(input);
                        break;
                    case 'md5':
                        result = crypto_js_1.default.MD5(input);
                        break;
                    default:
                        throw new Error(`Unsupported hash algorithm: ${algorithm}`);
                }
                if (encoding === 'hex') {
                    return result.toString(crypto_js_1.default.enc.Hex);
                }
                else if (encoding === 'base64') {
                    return result.toString(crypto_js_1.default.enc.Base64);
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
        const keyString = typeof key === 'string' ? key : crypto_js_1.default.lib.WordArray.create(key);
        let result = null;
        let input = null;
        return {
            update: (data) => {
                input = typeof data === 'string' ? data : crypto_js_1.default.lib.WordArray.create(data);
                return this;
            },
            digest: (encoding = 'hex') => {
                if (!input) {
                    throw new Error('No data provided to HMAC');
                }
                switch (algorithm.toLowerCase()) {
                    case 'sha256':
                        result = crypto_js_1.default.HmacSHA256(input, keyString);
                        break;
                    case 'sha512':
                        result = crypto_js_1.default.HmacSHA512(input, keyString);
                        break;
                    default:
                        throw new Error(`Unsupported HMAC algorithm: ${algorithm}`);
                }
                if (encoding === 'hex') {
                    return result.toString(crypto_js_1.default.enc.Hex);
                }
                else if (encoding === 'base64') {
                    return result.toString(crypto_js_1.default.enc.Base64);
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
        this.crypto = null;
        // Dynamic import for Node.js crypto
        if (typeof window === 'undefined') {
            try {
                this.crypto = require('crypto');
            }
            catch (error) {
                console.warn('Node.js crypto not available, falling back to browser crypto');
                this.crypto = null;
            }
        }
    }
    randomBytes(size) {
        if (!this.crypto) {
            throw new Error('Node.js crypto not available');
        }
        return this.crypto.randomBytes(size);
    }
    createHash(algorithm) {
        if (!this.crypto) {
            throw new Error('Node.js crypto not available');
        }
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
        if (!this.crypto) {
            throw new Error('Node.js crypto not available');
        }
        return this.crypto.randomUUID();
    }
    createHmac(algorithm, key) {
        if (!this.crypto) {
            throw new Error('Node.js crypto not available');
        }
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