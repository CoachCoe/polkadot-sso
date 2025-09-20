import { generateSecureKey, validateSecret } from './encryption.js';

export interface SecretConfig {
  name: string;
  required: boolean;
  minLength: number;
  description: string;
}

export const REQUIRED_SECRETS: SecretConfig[] = [
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

export const OPTIONAL_SECRETS: SecretConfig[] = [
  {
    name: 'ADMIN_SECRET',
    required: false,
    minLength: 16,
    description: 'Secret for admin operations',
  },
];

export class SecretManager {
  private static instance: SecretManager;
  private secrets: Map<string, string> = new Map();
  private validated: boolean = false;

  private constructor() {}

  static getInstance(): SecretManager {
    if (!SecretManager.instance) {
      SecretManager.instance = new SecretManager();
    }
    return SecretManager.instance;
  }

  validateSecrets(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate required secrets
    for (const config of REQUIRED_SECRETS) {
      const value = process.env[config.name];

      if (!value) {
        errors.push(`${config.name} is required but not set`);
        continue;
      }

      if (!validateSecret(value, config.minLength)) {
        errors.push(
          `${config.name} must be at least ${config.minLength} characters long with sufficient entropy`
        );
      }
    }

    // Validate optional secrets if they exist
    for (const config of OPTIONAL_SECRETS) {
      const value = process.env[config.name];

      if (value && !validateSecret(value, config.minLength)) {
        errors.push(
          `${config.name} must be at least ${config.minLength} characters long with sufficient entropy`
        );
      }
    }

    this.validated = errors.length === 0;
    return { valid: this.validated, errors };
  }

  getSecret(name: string): string {
    if (!this.validated) {
      throw new Error('Secrets must be validated before use');
    }

    const value = process.env[name];
    if (!value) {
      throw new Error(`Secret ${name} not found`);
    }

    return value;
  }

  generateAllSecrets(): Record<string, string> {
    const generated: Record<string, string> = {};

    for (const config of REQUIRED_SECRETS) {
      generated[config.name] = generateSecureKey(config.minLength);
    }

    for (const config of OPTIONAL_SECRETS) {
      generated[config.name] = generateSecureKey(config.minLength);
    }

    return generated;
  }

  // Rotate a specific secret
  rotateSecret(name: string): string {
    const config = [...REQUIRED_SECRETS, ...OPTIONAL_SECRETS].find(c => c.name === name);
    if (!config) {
      throw new Error(`Unknown secret: ${name}`);
    }

    const newSecret = generateSecureKey(config.minLength);
    this.secrets.set(name, newSecret);

    return newSecret;
  }

  // Get all secret names for documentation
  getAllSecretNames(): string[] {
    return [...REQUIRED_SECRETS, ...OPTIONAL_SECRETS].map(c => c.name);
  }

  // Get secret configuration for documentation
  getSecretConfig(name: string): SecretConfig | undefined {
    return [...REQUIRED_SECRETS, ...OPTIONAL_SECRETS].find(c => c.name === name);
  }
}

// Convenience functions
export const validateAllSecrets = () => SecretManager.getInstance().validateSecrets();
export const getSecret = (name: string) => SecretManager.getInstance().getSecret(name);
export const generateAllSecrets = () => SecretManager.getInstance().generateAllSecrets();
