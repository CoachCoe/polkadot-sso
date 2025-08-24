export interface SecretConfig {
    name: string;
    required: boolean;
    minLength: number;
    description: string;
}
export declare const REQUIRED_SECRETS: SecretConfig[];
export declare const OPTIONAL_SECRETS: SecretConfig[];
export declare class SecretManager {
    private static instance;
    private secrets;
    private validated;
    private constructor();
    static getInstance(): SecretManager;
    validateSecrets(): {
        valid: boolean;
        errors: string[];
    };
    getSecret(name: string): string;
    generateAllSecrets(): Record<string, string>;
    rotateSecret(name: string): string;
    getAllSecretNames(): string[];
    getSecretConfig(name: string): SecretConfig | undefined;
}
export declare const validateAllSecrets: () => {
    valid: boolean;
    errors: string[];
};
export declare const getSecret: (name: string) => string;
export declare const generateAllSecrets: () => Record<string, string>;
//# sourceMappingURL=secrets.d.ts.map