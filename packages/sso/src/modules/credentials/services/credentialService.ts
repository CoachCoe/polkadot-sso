import * as crypto from 'crypto';
import { createLogger } from '../../../utils/logger';

const logger = createLogger('credential-service');

export class CredentialService {
  private credentials: Map<string, any> = new Map();

  async createCredential(data: any): Promise<any> {
    const id = crypto.randomUUID();
    const credential = {
      id,
      ...data,
      created_at: Date.now(),
      updated_at: Date.now(),
    };
    
    this.credentials.set(id, credential);
    logger.info('Credential created', { id });
    
    return credential;
  }

  async getCredential(id: string): Promise<any> {
    const credential = this.credentials.get(id);
    if (!credential) {
      throw new Error('Credential not found');
    }
    return credential;
  }

  async listCredentials(): Promise<any[]> {
    return Array.from(this.credentials.values());
  }
}
