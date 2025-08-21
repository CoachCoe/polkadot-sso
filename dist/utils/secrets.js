"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAllSecrets = exports.getSecret = exports.validateAllSecrets = exports.SecretManager = exports.OPTIONAL_SECRETS = exports.REQUIRED_SECRETS = void 0;
const encryption_1 = require("./encryption");
exports.REQUIRED_SECRETS = [
    {
        name: 'SESSION_SECRET',
        required: true,
        minLength: 32,
        description: 'Secret for session encryption',
    },
    {
        name: 'JWT_SECRET',
        required: true,
        minLength: 32,
        description: 'Secret for JWT token signing',
    },
    {
        name: 'DATABASE_ENCRYPTION_KEY',
        required: true,
        minLength: 32,
        description: 'Key for database field encryption',
    },
];
exports.OPTIONAL_SECRETS = [
    {
        name: 'ADMIN_SECRET',
        required: false,
        minLength: 16,
        description: 'Secret for admin operations',
    },
];
class SecretManager {
    constructor() {
        this.secrets = new Map();
        this.validated = false;
    }
    static getInstance() {
        if (!SecretManager.instance) {
            SecretManager.instance = new SecretManager();
        }
        return SecretManager.instance;
    }
    validateSecrets() {
        const errors = [];
        // Validate required secrets
        for (const config of exports.REQUIRED_SECRETS) {
            const value = process.env[config.name];
            if (!value) {
                errors.push(`${config.name} is required but not set`);
                continue;
            }
            if (!(0, encryption_1.validateSecret)(value, config.minLength)) {
                errors.push(`${config.name} must be at least ${config.minLength} characters long with sufficient entropy`);
            }
        }
        // Validate optional secrets if they exist
        for (const config of exports.OPTIONAL_SECRETS) {
            const value = process.env[config.name];
            if (value && !(0, encryption_1.validateSecret)(value, config.minLength)) {
                errors.push(`${config.name} must be at least ${config.minLength} characters long with sufficient entropy`);
            }
        }
        this.validated = errors.length === 0;
        return { valid: this.validated, errors };
    }
    getSecret(name) {
        if (!this.validated) {
            throw new Error('Secrets must be validated before use');
        }
        const value = process.env[name];
        if (!value) {
            throw new Error(`Secret ${name} not found`);
        }
        return value;
    }
    generateSecrets() {
        const generated = {};
        for (const config of exports.REQUIRED_SECRETS) {
            generated[config.name] = (0, encryption_1.generateSecureKey)(config.minLength);
        }
        for (const config of exports.OPTIONAL_SECRETS) {
            generated[config.name] = (0, encryption_1.generateSecureKey)(config.minLength);
        }
        return generated;
    }
    // Rotate a specific secret
    rotateSecret(name) {
        const config = [...exports.REQUIRED_SECRETS, ...exports.OPTIONAL_SECRETS].find(c => c.name === name);
        if (!config) {
            throw new Error(`Unknown secret: ${name}`);
        }
        const newSecret = (0, encryption_1.generateSecureKey)(config.minLength);
        this.secrets.set(name, newSecret);
        return newSecret;
    }
    // Get all secret names for documentation
    getAllSecretNames() {
        return [...exports.REQUIRED_SECRETS, ...exports.OPTIONAL_SECRETS].map(c => c.name);
    }
    // Get secret configuration for documentation
    getSecretConfig(name) {
        return [...exports.REQUIRED_SECRETS, ...exports.OPTIONAL_SECRETS].find(c => c.name === name);
    }
}
exports.SecretManager = SecretManager;
// Convenience functions
const validateAllSecrets = () => SecretManager.getInstance().validateSecrets();
exports.validateAllSecrets = validateAllSecrets;
const getSecret = (name) => SecretManager.getInstance().getSecret(name);
exports.getSecret = getSecret;
const generateAllSecrets = () => SecretManager.getInstance().generateSecrets();
exports.generateAllSecrets = generateAllSecrets;
//# sourceMappingURL=secrets.js.map