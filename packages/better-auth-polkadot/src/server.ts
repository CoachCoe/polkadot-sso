import { createHash, randomBytes } from 'crypto';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { u8aToHex, hexToU8a } from '@polkadot/util';
import { signatureVerify } from '@polkadot/util-crypto';
import { PolkadotAuthConfig } from './types.js';

export interface PolkadotAuthMessage {
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

export function polkadotAuth(config: PolkadotAuthConfig) {
  return {
    id: 'polkadot',
    name: 'Sign in with Polkadot',
    version: '1.0.0',
    config,
    
    async init() {
      this.validateConfig();
    },
    
    validateConfig() {
      if (!this.config.domain) {
        throw new Error('PolkadotAuth: domain is required');
      }
      
      if (!this.config.appName) {
        this.config.appName = 'Polkadot App';
      }
      
      if (!this.config.appVersion) {
        this.config.appVersion = '1.0.0';
      }
      
      if (!this.config.statement) {
        this.config.statement = `Sign in with Polkadot to ${this.config.appName}`;
      }
      
      if (!this.config.uri) {
        this.config.uri = `https://${this.config.domain}`;
      }
      
      if (!this.config.chainId) {
        this.config.chainId = 'polkadot';
      }
    },
    
    generateNonce(): string {
      if (this.config.generateNonce) {
        return this.config.generateNonce();
      }
      
      return randomBytes(32).toString('hex');
    },
    
    createMessage(address: string, nonce: string): string {
      const message: PolkadotAuthMessage = {
        domain: this.config.domain,
        address,
        statement: this.config.statement!,
        uri: this.config.uri!,
        version: this.config.appVersion!,
        chainId: this.config.chainId!,
        nonce,
        issuedAt: new Date().toISOString(),
        requestId: this.generateNonce()
      };
      
      return this.formatMessage(message);
    },
    
    formatMessage(message: PolkadotAuthMessage): string {
      const lines = [
        `${this.config.appName} wants you to sign in with your Polkadot account:`,
        '',
        `${message.address}`,
        '',
        message.statement,
        '',
        `URI: ${message.uri}`,
        `Version: ${message.version}`,
        `Chain ID: ${message.chainId}`,
        `Nonce: ${message.nonce}`,
        `Issued At: ${message.issuedAt}`
      ];
      
      if (message.expirationTime) {
        lines.push(`Expiration Time: ${message.expirationTime}`);
      }
      
      if (message.notBefore) {
        lines.push(`Not Before: ${message.notBefore}`);
      }
      
      if (message.requestId) {
        lines.push(`Request ID: ${message.requestId}`);
      }
      
      if (message.resources && message.resources.length > 0) {
        lines.push(`Resources:`);
        message.resources.forEach(resource => {
          lines.push(`- ${resource}`);
        });
      }
      
      return lines.join('\n');
    },
    
    async verifyMessage(message: string, signature: string, address: string): Promise<boolean> {
      if (this.config.verifyMessage) {
        return await this.config.verifyMessage(message, signature, address);
      }
      
      try {
        const messageBytes = new TextEncoder().encode(message);
        const signatureBytes = hexToU8a(signature);
        const addressBytes = hexToU8a(address);
        
        const verification = signatureVerify(messageBytes, signatureBytes, addressBytes);
        
        return verification.isValid;
      } catch (error) {
        console.error('Message verification failed:', error);
        return false;
      }
    },
    
    validateAddress(address: string): boolean {
      if (this.config.validateAddress) {
        return this.config.validateAddress(address);
      }
      
      try {
        if (!address || typeof address !== 'string') {
          return false;
        }
        
        if (address.startsWith('5') && address.length === 48) {
          return true;
        }
        
        const cleanAddress = address.replace('0x', '');
        
        if (cleanAddress.length >= 32 && cleanAddress.length <= 64) {
          return /^[0-9a-fA-F]+$/.test(cleanAddress);
        }
        
        return false;
      } catch (error) {
        return false;
      }
    },
    
    async resolveIdentity(address: string): Promise<string | null> {
      if (!this.config.enableIdentityResolution) {
        return null;
      }
      
      if (this.config.resolveIdentity) {
        return await this.config.resolveIdentity(address);
      }
      
      try {
        const rpcUrl = this.getRpcUrl();
        if (!rpcUrl) {
          return null;
        }
        
        const provider = new WsProvider(rpcUrl);
        const api = await ApiPromise.create({ provider });
        
        const identity = await api.query.identity.identityOf(address) as any;
        
        if (identity && identity.isSome) {
          const identityData = identity.unwrap();
          const result = identityData.info.display.asRaw.toHuman() as string;
          await api.disconnect();
          return result;
        }
        
        await api.disconnect();
        return null;
      } catch (error) {
        console.error('Identity resolution failed:', error);
        return null;
      }
    },
    
    getRpcUrl(): string | null {
      const chainId = this.config.chainId || 'polkadot';
      const rpcUrls: Record<string, string> = {
        'polkadot': 'wss://rpc.polkadot.io',
        'kusama': 'wss://kusama-rpc.polkadot.io',
        'westend': 'wss://westend-rpc.polkadot.io',
        'asset-hub': 'wss://polkadot-asset-hub-rpc.polkadot.io'
      };
      
      return rpcUrls[chainId] || null;
    }
  };
}