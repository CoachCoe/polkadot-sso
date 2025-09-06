import { Request } from 'express';
export interface ValidationResult {
    isValid: boolean;
    error?: string;
}
export declare function validateAuthRequest(req: Request): ValidationResult;
export declare function validateSignature(signature: string): ValidationResult;
export declare function validateClientCredentials(req: Request): Promise<boolean>;
//# sourceMappingURL=validation.d.ts.map