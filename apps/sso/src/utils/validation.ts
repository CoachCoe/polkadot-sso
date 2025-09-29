import { Request } from 'express';
import { Client } from '../types/auth.js';

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

export async function validateClientCredentials(req: Request, clients?: Map<string, Client>): Promise<Client | null> {
  const { client_id, client_secret } = req.body;

  if (!client_id || !client_secret) {
    return null;
  }

  if (clients) {
    const client = clients.get(client_id);
    if (client && client.client_secret === client_secret) {
      return client;
    }
  }

  if (client_id === 'demo-client' && client_secret === 'default-client-secret-for-development-only') {
    return {
      client_id: 'demo-client',
      client_secret: 'default-client-secret-for-development-only',
      name: 'Demo Client Application',
      redirect_url: 'http://localhost:5173/callback',
      allowed_origins: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173']
    };
  }

  return null;
}
