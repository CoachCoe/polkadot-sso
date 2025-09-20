// Credential Management Utilities
// Helper functions for credential operations

import * as crypto from 'crypto';
import { Credential, CredentialType } from '../types/credential';

/**
 * Generate a unique credential ID
 */
export function generateCredentialId(): string {
  return crypto.randomUUID();
}

/**
 * Generate a credential hash for integrity verification
 */
export function generateCredentialHash(data: Record<string, unknown>): string {
  return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

/**
 * Validate credential data against schema
 */
export function validateCredentialData(
  data: Record<string, unknown>,
  credentialType: CredentialType
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

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
        const ruleObj = rules as any; // Type assertion for validation rules

        if (ruleObj.type && typeof value !== ruleObj.type) {
          errors.push(`Field '${field}' must be of type ${ruleObj.type}`);
        }

        if (ruleObj.minLength && typeof value === 'string' && value.length < ruleObj.minLength) {
          errors.push(`Field '${field}' must be at least ${ruleObj.minLength} characters long`);
        }

        if (ruleObj.maxLength && typeof value === 'string' && value.length > ruleObj.maxLength) {
          errors.push(`Field '${field}' must be no more than ${ruleObj.maxLength} characters long`);
        }

        if (
          ruleObj.pattern &&
          typeof value === 'string' &&
          !new RegExp(ruleObj.pattern).test(value)
        ) {
          errors.push(`Field '${field}' does not match required pattern`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  } catch (error) {
    return {
      valid: false,
      errors: ['Invalid credential type schema'],
    };
  }
}

/**
 * Check if credential is expired
 */
export function isCredentialExpired(credential: Credential): boolean {
  if (!credential.expires_at) {
    return false;
  }
  return Date.now() > credential.expires_at;
}

/**
 * Check if credential is active
 */
export function isCredentialActive(credential: Credential): boolean {
  return credential.status === 'active' && !isCredentialExpired(credential);
}

/**
 * Format credential for display
 */
export function formatCredentialForDisplay(credential: Credential): {
  id: string;
  type: string;
  status: string;
  issuedAt: string;
  expiresAt?: string;
  isActive: boolean;
} {
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
export function generateCredentialSummary(credential: Credential): {
  id: string;
  type: string;
  status: string;
  issuedAt: string;
  expiresAt?: string;
} {
  return {
    id: credential.id,
    type: credential.credential_type_id,
    status: credential.status,
    issuedAt: new Date(credential.issued_at).toISOString(),
    expiresAt: credential.expires_at ? new Date(credential.expires_at).toISOString() : undefined,
  };
}
