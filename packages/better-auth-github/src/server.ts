import { createHash, randomBytes } from 'crypto';
import axios from 'axios';
import { GitHubAuthConfig, GitHubAuthMessage, GitHubUserInfo, GitHubTokenResponse, GitHubSession, GitHubChallenge, GitHubVerificationRequest, GitHubVerificationResponse } from './types.js';

export function githubAuth(config: GitHubAuthConfig) {
  return {
    id: 'github',
    name: 'Sign in with GitHub',
    version: '1.0.0',
    config,
    
    async init() {
      this.validateConfig();
    },
    
    validateConfig() {
      if (!this.config.clientId) {
        throw new Error('GitHubAuth: clientId is required');
      }
      
      if (!this.config.clientSecret) {
        throw new Error('GitHubAuth: clientSecret is required');
      }
      
      if (!this.config.redirectUri) {
        throw new Error('GitHubAuth: redirectUri is required');
      }
      
      if (!this.config.domain) {
        throw new Error('GitHubAuth: domain is required');
      }
      
      if (!this.config.appName) {
        this.config.appName = 'GitHub App';
      }
      
      if (!this.config.appVersion) {
        this.config.appVersion = '1.0.0';
      }
      
      if (!this.config.statement) {
        this.config.statement = `Sign in with GitHub to ${this.config.appName}`;
      }
      
      if (!this.config.uri) {
        this.config.uri = `https://${this.config.domain}`;
      }
      
      if (!this.config.scopes) {
        this.config.scopes = ['user:email', 'read:user'];
      }
      
      if (!this.config.authTimeout) {
        this.config.authTimeout = 300;
      }
    },
    
    generateNonce(): string {
      if (this.config.generateNonce) {
        return this.config.generateNonce();
      }
      
      return randomBytes(16).toString('hex');
    },
    
    createMessage(address: string, nonce: string): string {
      const message: GitHubAuthMessage = {
        domain: this.config.domain,
        address,
        statement: this.config.statement!,
        uri: this.config.uri!,
        version: this.config.appVersion!,
        nonce,
        issuedAt: new Date().toISOString(),
        requestId: this.generateNonce()
      };
      
      return this.formatMessage(message);
    },
    
    formatMessage(message: GitHubAuthMessage): string {
      const lines = [
        `${this.config.appName} wants you to sign in with your GitHub account:`,
        '',
        `${message.address}`,
        '',
        message.statement,
        '',
        `URI: ${message.uri}`,
        `Version: ${message.version}`,
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
        const messageHash = createHash('sha256').update(message).digest('hex');
        const signatureHash = createHash('sha256').update(signature).digest('hex');
        
        return messageHash === signatureHash;
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
        
        if (address.includes('@') && address.includes('.')) {
          return true;
        }
        
        if (address.startsWith('github.com/') || address.startsWith('@')) {
          return true;
        }
        
        return /^[a-zA-Z0-9_-]+$/.test(address);
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
        const username = address.replace('@', '').replace('github.com/', '');
        const response = await axios.get(`https://api.github.com/users/${username}`, {
          headers: {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': this.config.appName || 'GitHub App'
          }
        });
        
        if (response.data && response.data.name) {
          return response.data.name;
        }
        
        return null;
      } catch (error) {
        console.error('Identity resolution failed:', error);
        return null;
      }
    },
    
    generateChallenge(clientId: string): GitHubChallenge {
      const challengeId = this.generateNonce();
      const state = this.generateNonce();
      const codeVerifier = this.generateNonce();
      const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');
      const now = Date.now();
      const expiresAt = now + (this.config.authTimeout! * 1000);
      
      return {
        id: challengeId,
        client_id: clientId,
        state,
        code_verifier: codeVerifier,
        code_challenge: codeChallenge,
        created_at: now,
        expires_at: expiresAt,
        used: false
      };
    },
    
    getAuthorizationUrl(challenge: GitHubChallenge): string {
      const params = new URLSearchParams({
        client_id: this.config.clientId,
        redirect_uri: this.config.redirectUri,
        scope: this.config.scopes!.join(' '),
        state: challenge.state,
        code_challenge: challenge.code_challenge,
        code_challenge_method: 'S256'
      });
      
      return `https://github.com/login/oauth/authorize?${params.toString()}`;
    },
    
    async exchangeCodeForToken(code: string, codeVerifier: string): Promise<GitHubTokenResponse> {
      try {
        const response = await axios.post('https://github.com/login/oauth/access_token', {
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          code,
          code_verifier: codeVerifier
        }, {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });
        
        return response.data;
      } catch (error) {
        console.error('Token exchange failed:', error);
        return {
          access_token: '',
          token_type: 'Bearer',
          scope: '',
          error: 'token_exchange_failed',
          error_description: error instanceof Error ? error.message : String(error)
        };
      }
    },
    
    async fetchUserInfo(accessToken: string): Promise<GitHubUserInfo> {
      try {
        const response = await axios.get('https://api.github.com/user', {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': this.config.appName || 'GitHub App'
          }
        });
        
        return response.data;
      } catch (error) {
        throw new Error(`Failed to fetch user info: ${error instanceof Error ? error.message : String(error)}`);
      }
    },
    
    async createSession(userInfo: GitHubUserInfo, tokenResponse: GitHubTokenResponse, clientId: string): Promise<GitHubSession> {
      const sessionId = this.generateNonce();
      const accessTokenId = this.generateNonce();
      const fingerprint = createHash('sha256').update(`${userInfo.id}-${clientId}`).digest('hex');
      const now = Date.now();
      const expiresAt = now + (24 * 60 * 60 * 1000);
      
      return {
        id: sessionId,
        github_id: userInfo.id,
        login: userInfo.login,
        email: userInfo.email || '',
        name: userInfo.name || userInfo.login,
        avatar_url: userInfo.avatar_url,
        client_id: clientId,
        access_token: tokenResponse.access_token,
        access_token_id: accessTokenId,
        fingerprint,
        access_token_expires_at: expiresAt,
        created_at: now,
        last_used_at: now,
        is_active: true
      };
    },
    
    async verifyCallback(request: GitHubVerificationRequest): Promise<GitHubVerificationResponse> {
      try {
        const tokenResponse = await this.exchangeCodeForToken(request.code, '');
        
        if (tokenResponse.error) {
          return {
            success: false,
            error: `Token exchange failed: ${tokenResponse.error_description || tokenResponse.error}`
          };
        }
        
        const userInfo = await this.fetchUserInfo(tokenResponse.access_token);
        const session = await this.createSession(userInfo, tokenResponse, request.client_id);
        
        return {
          success: true,
          session,
          user: userInfo
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        };
      }
    }
  };
}
