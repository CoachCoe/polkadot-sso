import {
  AuthChallenge,
  AuthError,
  AuthTokens,
  PolkadotAuthClient as IPolkadotAuthClient,
  PolkadotAuthConfig,
  UserSession,
  WalletSigner,
} from './types';

export class PolkadotAuthClient implements IPolkadotAuthClient {
  private config: PolkadotAuthConfig;
  private session: UserSession | null = null;
  private sessionKey = 'polkadot-auth-session';

  constructor(config: PolkadotAuthConfig) {
    this.config = {
      redirectUri: typeof window !== 'undefined' ? window.location.origin + '/callback' : '',
      defaultChain: 'polkadot',
      supportedWallets: ['polkadot-js', 'talisman', 'subwallet'],
      ...config,
    };

    // Load existing session from localStorage
    this.loadSession();
  }

  async initiateLogin(address: string): Promise<AuthChallenge> {
    try {
      const params = new URLSearchParams({
        client_id: this.config.clientId,
        address,
        wallet: 'polkadot-js', // Default wallet type
      });

      const response = await fetch(`${this.config.ssoEndpoint}/login?${params}`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Login initiation failed: ${response.status} ${errorText}`);
      }

      const data = await response.json();

      return {
        challengeId: data.challenge_id,
        message: data.message,
        codeVerifier: data.code_verifier,
        state: data.state,
        expiresAt: new Date(data.expires_at).getTime(),
      };
    } catch (error) {
      throw this.createAuthError('LOGIN_INITIATION_FAILED', error);
    }
  }

  async verifySignature(
    signature: string,
    challenge: AuthChallenge,
    address: string
  ): Promise<string> {
    try {
      const params = new URLSearchParams({
        signature,
        challenge_id: challenge.challengeId,
        address,
        code_verifier: challenge.codeVerifier,
        state: challenge.state,
      });

      const response = await fetch(`${this.config.ssoEndpoint}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Signature verification failed: ${response.status} ${errorText}`);
      }

      // The verify endpoint returns HTML with a redirect, we need to extract the auth code
      const responseText = await response.text();
      const urlMatch = responseText.match(/window\.location\.href\s*=\s*["']([^"']+)["']/);

      if (!urlMatch) {
        throw new Error('Could not extract authorization code from response');
      }

      const redirectUrl = new URL(urlMatch[1]);
      const authCode = redirectUrl.searchParams.get('code');

      if (!authCode) {
        throw new Error('No authorization code found in redirect URL');
      }

      return authCode;
    } catch (error) {
      throw this.createAuthError('SIGNATURE_VERIFICATION_FAILED', error);
    }
  }

  async exchangeCodeForTokens(authCode: string): Promise<AuthTokens> {
    try {
      const response = await fetch(`${this.config.ssoEndpoint}/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          grant_type: 'authorization_code',
          code: authCode,
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          redirect_uri: this.config.redirectUri,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Token exchange failed: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      const expiresAt = Date.now() + data.expires_in * 1000;

      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        tokenType: data.token_type || 'Bearer',
        expiresIn: data.expires_in,
        expiresAt,
      };
    } catch (error) {
      throw this.createAuthError('TOKEN_EXCHANGE_FAILED', error);
    }
  }

  async authenticate(address: string, signer: WalletSigner): Promise<UserSession> {
    try {
      // Step 1: Initiate login
      const challenge = await this.initiateLogin(address);

      // Step 2: Sign the message
      const signature = await signer.signMessage(challenge.message);

      // Step 3: Verify signature
      const authCode = await this.verifySignature(signature, challenge, address);

      // Step 4: Exchange code for tokens
      const tokens = await this.exchangeCodeForTokens(authCode);

      // Step 5: Create session
      const session: UserSession = {
        address,
        tokens,
        authenticatedAt: Date.now(),
        lastUsedAt: Date.now(),
      };

      this.session = session;
      this.saveSession();

      return session;
    } catch (error) {
      throw this.createAuthError('AUTHENTICATION_FAILED', error);
    }
  }

  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    try {
      const response = await fetch(`${this.config.ssoEndpoint}/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Token refresh failed: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      const expiresAt = Date.now() + data.expires_in * 1000;

      const tokens: AuthTokens = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        tokenType: data.token_type || 'Bearer',
        expiresIn: data.expires_in,
        expiresAt,
      };

      // Update session with new tokens
      if (this.session) {
        this.session.tokens = tokens;
        this.session.lastUsedAt = Date.now();
        this.saveSession();
      }

      return tokens;
    } catch (error) {
      throw this.createAuthError('TOKEN_REFRESH_FAILED', error);
    }
  }

  logout(): void {
    this.session = null;
    this.clearSession();
  }

  getSession(): UserSession | null {
    return this.session;
  }

  isAuthenticated(): boolean {
    if (!this.session) {
      return false;
    }

    // Check if access token is expired
    if (Date.now() >= this.session.tokens.expiresAt) {
      // Try to refresh if we have a refresh token
      if (this.session.tokens.refreshToken) {
        this.refreshTokens(this.session.tokens.refreshToken).catch(() => {
          this.logout();
        });
        return true; // Still authenticated, just needs refresh
      } else {
        this.logout();
        return false;
      }
    }

    return true;
  }

  private loadSession(): void {
    if (typeof window === 'undefined') return;

    try {
      const sessionData = localStorage.getItem(this.sessionKey);
      if (sessionData) {
        const parsed = JSON.parse(sessionData);

        // Check if session is still valid
        if (parsed.tokens && parsed.tokens.expiresAt > Date.now()) {
          this.session = parsed;
        } else {
          this.clearSession();
        }
      }
    } catch (error) {
      console.warn('Failed to load session from localStorage:', error);
      this.clearSession();
    }
  }

  private saveSession(): void {
    if (typeof window === 'undefined' || !this.session) return;

    try {
      localStorage.setItem(this.sessionKey, JSON.stringify(this.session));
    } catch (error) {
      console.warn('Failed to save session to localStorage:', error);
    }
  }

  private clearSession(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.removeItem(this.sessionKey);
    } catch (error) {
      console.warn('Failed to clear session from localStorage:', error);
    }
  }

  private createAuthError(code: string, originalError: any): AuthError {
    const error = new Error(originalError?.message || 'Authentication error') as AuthError;
    error.code = code;
    error.details = originalError;
    return error;
  }
}

export function createPolkadotAuthClient(config: PolkadotAuthConfig): PolkadotAuthClient {
  return new PolkadotAuthClient(config);
}
