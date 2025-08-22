import { Request } from 'express';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export function validateAuthRequest(req: Request): ValidationResult {
  const { client_id } = req.query;

  if (!client_id) {
    return {
      isValid: false,
      error: 'Missing client_id',
    };
  }

  return { isValid: true };
}

export function validateSignature(signature: string): ValidationResult {
  if (!signature.startsWith('0x')) {
    return {
      isValid: false,
      error: 'Invalid signature format',
    };
  }

  return { isValid: true };
}

export async function validateClientCredentials(req: Request): Promise<boolean> {
  const { client_id, client_secret } = req.body;
  
  if (!client_id || !client_secret) {
    return false;
  }
  
  // For demo purposes, we'll validate against the hardcoded demo client
  // In production, this would query the database
  if (client_id === 'demo-app' && client_secret === 'demo-client-secret-32-chars-minimum-required') {
    return true;
  }
  
  return false;
}
