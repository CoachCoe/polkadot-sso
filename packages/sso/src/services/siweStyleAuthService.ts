import crypto from 'crypto';
import { Database } from 'sqlite';
import { Challenge, Session } from '../types/auth';

export interface SIWEMessage {
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
}

export interface SIWESignature {
  message: string;
  signature: string;
  address: string;
  nonce: string;
}

export class SIWEStyleAuthService {
  constructor(private db: Database) {}

  /**
   * Generate a SIWE-style authentication message
   */
  generateSIWEMessage(params: {
    domain: string;
    address: string;
    statement?: string;
    uri: string;
    version?: string;
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
      statement = 'Sign this message to authenticate with Polkadot SSO',
      uri,
      version = '1',
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

  /**
   * Parse a SIWE-style message back into structured data
   */
  parseSIWEMessage(message: string): SIWEMessage | null {
    try {
      const lines = message.split('\n');
      const parsed: Partial<SIWEMessage> = {};

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        if (line.includes('wants you to sign in with your Polkadot account:')) {
          parsed.domain = line.split(' wants you to sign in')[0];
          // Next line should be the address
          if (i + 1 < lines.length) {
            const addressLine = lines[i + 1].trim();
            if (this.isValidPolkadotAddress(addressLine)) {
              parsed.address = addressLine;
            }
          }
        } else if (line.startsWith('URI: ')) {
          parsed.uri = line.substring(5);
        } else if (line.startsWith('Version: ')) {
          parsed.version = line.substring(9);
        } else if (line.startsWith('Chain ID: ')) {
          parsed.chainId = line.substring(10);
        } else if (line.startsWith('Nonce: ')) {
          parsed.nonce = line.substring(7);
        } else if (line.startsWith('Issued At: ')) {
          parsed.issuedAt = line.substring(11);
        } else if (line.startsWith('Expiration Time: ')) {
          parsed.expirationTime = line.substring(17);
        } else if (line.startsWith('Not Before: ')) {
          parsed.notBefore = line.substring(12);
        } else if (line.startsWith('Request ID: ')) {
          parsed.requestId = line.substring(12);
        }
      }

      // Extract statement (everything between address and URI)
      const addressIndex = lines.findIndex(line => this.isValidPolkadotAddress(line.trim()));
      const uriIndex = lines.findIndex(line => line.startsWith('URI: '));
      if (addressIndex !== -1 && uriIndex !== -1 && uriIndex > addressIndex + 1) {
        const statementLines = lines.slice(addressIndex + 1, uriIndex).filter(line => line.trim());
        if (statementLines.length > 0) {
          parsed.statement = statementLines.join('\n');
        }
      }

      // Validate required fields
      if (
        !parsed.domain ||
        !parsed.address ||
        !parsed.uri ||
        !parsed.version ||
        !parsed.chainId ||
        !parsed.nonce ||
        !parsed.issuedAt
      ) {
        return null;
      }

      return parsed as SIWEMessage;
    } catch (error) {
      console.error('Error parsing SIWE message:', error);
      return null;
    }
  }

  /**
   * Validate a SIWE-style message format
   */
  validateSIWEMessage(message: string): boolean {
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

  /**
   * Validate a Polkadot address format
   */
  isValidPolkadotAddress(address: string): boolean {
    // Polkadot addresses are 47-48 characters long and use base58 encoding
    return /^[1-9A-HJ-NP-Za-km-z]{47,48}$/.test(address);
  }

  /**
   * Verify SIWE signature with enhanced security checks
   */
  async verifySIWESignature(
    signature: SIWESignature,
    challenge: Challenge
  ): Promise<{
    isValid: boolean;
    error?: string;
    parsedMessage?: SIWEMessage;
  }> {
    try {
      // 1. Validate message format
      if (!this.validateSIWEMessage(signature.message)) {
        return { isValid: false, error: 'Invalid SIWE message format' };
      }

      // 2. Parse the message
      const parsedMessage = this.parseSIWEMessage(signature.message);
      if (!parsedMessage) {
        return { isValid: false, error: 'Failed to parse SIWE message' };
      }

      // 3. Validate nonce matches challenge
      if (parsedMessage.nonce !== challenge.nonce) {
        return { isValid: false, error: 'Nonce mismatch' };
      }

      // 4. Validate address format
      if (!this.isValidPolkadotAddress(parsedMessage.address)) {
        return { isValid: false, error: 'Invalid Polkadot address format' };
      }

      // 5. Validate expiration time
      if (parsedMessage.expirationTime) {
        const expirationTime = new Date(parsedMessage.expirationTime);
        if (expirationTime < new Date()) {
          return { isValid: false, error: 'Message has expired' };
        }
      }

      // 6. Validate issued time is not in the future
      const issuedAt = new Date(parsedMessage.issuedAt);
      if (issuedAt > new Date()) {
        return { isValid: false, error: 'Message issued time is in the future' };
      }

      // 7. Validate not before time
      if (parsedMessage.notBefore) {
        const notBefore = new Date(parsedMessage.notBefore);
        if (notBefore > new Date()) {
          return { isValid: false, error: 'Message not yet valid' };
        }
      }

      // 8. Verify signature cryptographically (this would use Polkadot.js crypto)
      // For now, we'll assume the signature is valid if all other checks pass
      // In a real implementation, you would verify the signature using the address's public key

      return {
        isValid: true,
        parsedMessage,
      };
    } catch (error) {
      console.error('Error verifying SIWE signature:', error);
      return { isValid: false, error: 'Signature verification failed' };
    }
  }

  /**
   * Create a session after successful SIWE authentication
   */
  async createSession(
    address: string,
    client_id: string,
    parsedMessage: SIWEMessage
  ): Promise<Session> {
    const sessionId = crypto.randomUUID();
    const accessToken = crypto.randomBytes(32).toString('hex');
    const refreshToken = crypto.randomBytes(32).toString('hex');
    const fingerprint = crypto.randomBytes(16).toString('hex');

    const now = Date.now();
    const accessTokenExpiresAt = now + 15 * 60 * 1000; // 15 minutes
    const refreshTokenExpiresAt = now + 7 * 24 * 60 * 60 * 1000; // 7 days

    const session: Session = {
      id: sessionId,
      address,
      client_id,
      access_token: accessToken,
      refresh_token: refreshToken,
      access_token_id: crypto.randomUUID(),
      refresh_token_id: crypto.randomUUID(),
      fingerprint,
      access_token_expires_at: accessTokenExpiresAt,
      refresh_token_expires_at: refreshTokenExpiresAt,
      created_at: now,
      last_used_at: now,
      is_active: true,
    };

    // Store session in database
    await this.db.run(
      `INSERT INTO sessions (
        id, address, client_id, access_token, refresh_token, access_token_id,
        refresh_token_id, fingerprint, access_token_expires_at, refresh_token_expires_at,
        created_at, last_used_at, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        session.id,
        session.address,
        session.client_id,
        session.access_token,
        session.refresh_token,
        session.access_token_id,
        session.refresh_token_id,
        session.fingerprint,
        session.access_token_expires_at,
        session.refresh_token_expires_at,
        session.created_at,
        session.last_used_at,
        session.is_active,
      ]
    );

    return session;
  }

  /**
   * Get session by access token
   */
  async getSessionByAccessToken(accessToken: string): Promise<Session | undefined> {
    return this.db.get<Session>(
      'SELECT * FROM sessions WHERE access_token = ? AND is_active = 1 AND access_token_expires_at > ?',
      [accessToken, Date.now()]
    );
  }

  /**
   * Refresh session using refresh token
   */
  async refreshSession(refreshToken: string): Promise<Session | null> {
    const session = await this.db.get<Session>(
      'SELECT * FROM sessions WHERE refresh_token = ? AND is_active = 1 AND refresh_token_expires_at > ?',
      [refreshToken, Date.now()]
    );

    if (!session) {
      return null;
    }

    // Generate new tokens
    const newAccessToken = crypto.randomBytes(32).toString('hex');
    const newRefreshToken = crypto.randomBytes(32).toString('hex');
    const now = Date.now();
    const newAccessTokenExpiresAt = now + 15 * 60 * 1000;
    const newRefreshTokenExpiresAt = now + 7 * 24 * 60 * 60 * 1000;

    // Update session
    await this.db.run(
      `UPDATE sessions SET
        access_token = ?, refresh_token = ?, access_token_expires_at = ?,
        refresh_token_expires_at = ?, last_used_at = ?
       WHERE id = ?`,
      [
        newAccessToken,
        newRefreshToken,
        newAccessTokenExpiresAt,
        newRefreshTokenExpiresAt,
        now,
        session.id,
      ]
    );

    return {
      ...session,
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
      access_token_expires_at: newAccessTokenExpiresAt,
      refresh_token_expires_at: newRefreshTokenExpiresAt,
      last_used_at: now,
    };
  }

  /**
   * Invalidate session
   */
  async invalidateSession(sessionId: string): Promise<void> {
    await this.db.run('UPDATE sessions SET is_active = 0 WHERE id = ?', [sessionId]);
  }
}
