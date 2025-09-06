import { getChainById } from '../chains';
import { AuthResult, ChainConfig, Challenge, SIWEMessage, SIWESignature } from '../types';
import { randomBytes, randomUUID } from '../utils/crypto';

export class SIWEAuthService {
  private defaultChain: ChainConfig;

  constructor(defaultChainId: string = 'polkadot') {
    this.defaultChain = getChainById(defaultChainId) || getChainById('polkadot')!;
  }

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

      const addressIndex = lines.findIndex(line => this.isValidPolkadotAddress(line.trim()));
      const uriIndex = lines.findIndex(line => line.startsWith('URI: '));
      if (addressIndex !== -1 && uriIndex !== -1 && uriIndex > addressIndex + 1) {
        const statementLines = lines.slice(addressIndex + 1, uriIndex).filter(line => line.trim());
        if (statementLines.length > 0) {
          parsed.statement = statementLines.join('\n');
        }
      }

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

  isValidPolkadotAddress(address: string): boolean {
    // Polkadot addresses are 47-48 characters long and use base58 encoding
    return /^[1-9A-HJ-NP-Za-km-z]{47,48}$/.test(address);
  }

  generateNonce(): string {
    return Array.from(randomBytes(32))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  async verifySIWESignature(signature: SIWESignature, challenge: Challenge): Promise<AuthResult> {
    try {
      if (!this.validateSIWEMessage(signature.message)) {
        return {
          success: false,
          error: 'Invalid SIWE message format',
          errorCode: 'INVALID_MESSAGE_FORMAT',
        };
      }

      const parsedMessage = this.parseSIWEMessage(signature.message);
      if (!parsedMessage) {
        return {
          success: false,
          error: 'Failed to parse SIWE message',
          errorCode: 'MESSAGE_PARSE_ERROR',
        };
      }

      if (parsedMessage.nonce !== challenge.nonce) {
        return {
          success: false,
          error: 'Nonce mismatch',
          errorCode: 'NONCE_MISMATCH',
        };
      }

      if (!this.isValidPolkadotAddress(parsedMessage.address)) {
        return {
          success: false,
          error: 'Invalid Polkadot address format',
          errorCode: 'INVALID_ADDRESS',
        };
      }

      if (parsedMessage.expirationTime) {
        const expirationTime = new Date(parsedMessage.expirationTime);
        if (expirationTime < new Date()) {
          return {
            success: false,
            error: 'Message has expired',
            errorCode: 'MESSAGE_EXPIRED',
          };
        }
      }

      const issuedAt = new Date(parsedMessage.issuedAt);
      if (issuedAt > new Date()) {
        return {
          success: false,
          error: 'Message issued time is in the future',
          errorCode: 'FUTURE_ISSUED_TIME',
        };
      }

      if (parsedMessage.notBefore) {
        const notBefore = new Date(parsedMessage.notBefore);
        if (notBefore > new Date()) {
          return {
            success: false,
            error: 'Message not yet valid',
            errorCode: 'MESSAGE_NOT_VALID_YET',
          };
        }
      }

      return {
        success: true,
      };
    } catch (error) {
      console.error('Error verifying SIWE signature:', error);
      return {
        success: false,
        error: 'Signature verification failed',
        errorCode: 'VERIFICATION_ERROR',
      };
    }
  }

  createChallenge(clientId: string, userAddress?: string, chainId?: string): Challenge {
    const nonce = this.generateNonce();
    const issuedAt = new Date().toISOString();
    const expirationTime = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes
    const chain = chainId ? getChainById(chainId) : this.defaultChain;

    const message = this.generateSIWEMessage({
      domain: 'polkadot-auth.localhost',
      address: userAddress || '0x...', // Will be replaced with actual address
      statement: 'Sign this message to authenticate with Polkadot SSO',
      uri: 'http://localhost:3000',
      version: '1',
      chainId: chain?.id || 'polkadot',
      nonce,
      issuedAt,
      expirationTime,
      requestId: randomUUID(),
      resources: [
        'https://polkadot-auth.localhost/credentials',
        'https://polkadot-auth.localhost/profile',
      ],
    });

    return {
      id: randomUUID(),
      message,
      clientId,
      nonce,
      issuedAt,
      expiresAt: expirationTime,
      createdAt: Date.now(),
      expiresAtTimestamp: Date.now() + 5 * 60 * 1000,
      used: false,
    };
  }
}
