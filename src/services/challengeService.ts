import crypto from 'crypto';
import { Database } from 'sqlite';
import { Challenge } from '../types/auth';

export class ChallengeService {
  constructor(private db: Database) {}

  private generateCodeVerifier(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  private async generateCodeChallenge(verifier: string): Promise<string> {
    const hash = crypto.createHash('sha256');
    hash.update(verifier);
    return hash.digest('base64url');
  }

  private generateNonce(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private formatSIWEStyleMessage(params: {
    domain: string;
    address: string;
    statement: string;
    uri: string;
    version: string;
    chainId: string;
    nonce: string;
    issuedAt: string;
    expirationTime?: string;
    notBefore?: string;
    requestId?: string;
    resources?: string[];
  }): string {
    const {
      domain,
      address,
      statement,
      uri,
      version,
      chainId,
      nonce,
      issuedAt,
      expirationTime,
      notBefore,
      requestId,
      resources,
    } = params;

    let message = `${domain} wants you to sign in with your Polkadot account:\n`;
    message += `${address}\n\n`;

    if (statement) {
      message += `${statement}\n\n`;
    }

    message += `URI: ${uri}\n`;
    message += `Version: ${version}\n`;
    message += `Chain ID: ${chainId}\n`;
    message += `Nonce: ${nonce}\n`;
    message += `Issued At: ${issuedAt}`;

    if (expirationTime) {
      message += `\nExpiration Time: ${expirationTime}`;
    }

    if (notBefore) {
      message += `\nNot Before: ${notBefore}`;
    }

    if (requestId) {
      message += `\nRequest ID: ${requestId}`;
    }

    if (resources && resources.length > 0) {
      message += `\nResources:`;
      resources.forEach(resource => {
        message += `\n- ${resource}`;
      });
    }

    return message;
  }

  async generateChallenge(client_id: string, userAddress?: string): Promise<Challenge> {
    const code_verifier = this.generateCodeVerifier();
    const code_challenge = await this.generateCodeChallenge(code_verifier);
    const state = crypto.randomBytes(16).toString('hex');
    const nonce = this.generateNonce();
    const issuedAt = new Date().toISOString();
    const expirationTime = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes

    // Create SIWE-style message
    const message = this.formatSIWEStyleMessage({
      domain: 'polkadot-sso.localhost',
      address: userAddress || '0x...', // Will be replaced with actual address
      statement: 'Sign this message to authenticate with Polkadot SSO',
      uri: 'http://localhost:3000',
      version: '1',
      chainId: 'kusama', // or 'polkadot'
      nonce,
      issuedAt,
      expirationTime,
      requestId: crypto.randomUUID(),
      resources: [
        'https://polkadot-sso.localhost/credentials',
        'https://polkadot-sso.localhost/profile',
      ],
    });

    return {
      id: crypto.randomUUID(),
      message,
      code_verifier,
      code_challenge,
      state,
      client_id,
      nonce,
      issued_at: issuedAt,
      expires_at: expirationTime,
      created_at: Date.now(),
      expires_at_timestamp: Date.now() + 5 * 60 * 1000,
      used: false,
    };
  }

  async storeChallenge(challenge: Challenge): Promise<void> {
    await this.db.run(
      `INSERT INTO challenges (
        id, message, client_id, created_at, expires_at, expires_at_timestamp,
        code_verifier, code_challenge, state, nonce, issued_at, used
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        challenge.id,
        challenge.message,
        challenge.client_id,
        challenge.created_at,
        challenge.expires_at,
        challenge.expires_at_timestamp,
        challenge.code_verifier,
        challenge.code_challenge,
        challenge.state,
        challenge.nonce,
        challenge.issued_at,
        challenge.used,
      ]
    );
  }

  async getChallenge(id: string): Promise<Challenge | undefined> {
    return this.db.get<Challenge>('SELECT * FROM challenges WHERE id = ? AND used = 0', [id]);
  }

  async getChallengeByNonce(nonce: string): Promise<Challenge | undefined> {
    return this.db.get<Challenge>('SELECT * FROM challenges WHERE nonce = ? AND used = 0', [nonce]);
  }

  async markChallengeUsed(id: string): Promise<void> {
    await this.db.run('UPDATE challenges SET used = 1 WHERE id = ?', [id]);
  }

  async cleanupExpiredChallenges(): Promise<void> {
    const now = Date.now();
    await this.db.run('DELETE FROM challenges WHERE expires_at_timestamp < ?', [now]);
  }

  // Validate SIWE-style message format
  validateMessageFormat(message: string): boolean {
    const requiredFields = [
      'wants you to sign in with your Polkadot account:',
      'URI:',
      'Version:',
      'Chain ID:',
      'Nonce:',
      'Issued At:',
    ];

    return requiredFields.every(field => message.includes(field));
  }

  // Extract address from SIWE message
  extractAddressFromMessage(message: string): string | null {
    const lines = message.split('\n');
    for (const line of lines) {
      if (line.match(/^[1-9A-HJ-NP-Za-km-z]{47,48}$/)) {
        // Polkadot address format
        return line.trim();
      }
    }
    return null;
  }

  // Extract nonce from SIWE message
  extractNonceFromMessage(message: string): string | null {
    const nonceMatch = message.match(/Nonce: ([a-f0-9]{64})/);
    return nonceMatch ? nonceMatch[1] : null;
  }
}
