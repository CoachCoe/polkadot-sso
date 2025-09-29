import { githubAuth } from '../server';
import { GitHubAuthConfig } from '../types';

jest.mock('axios');
import axios from 'axios';

const mockAxios = axios as jest.Mocked<typeof axios>;

describe('GitHub Auth Server', () => {
  const mockConfig: GitHubAuthConfig = {
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    redirectUri: 'http://localhost:3000/callback',
    domain: 'localhost',
    appName: 'Test App',
    appVersion: '1.0.0',
    statement: 'Test statement',
    uri: 'http://localhost:3000',
    scopes: ['user:email', 'read:user'],
    authTimeout: 300
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('githubAuth', () => {
    it('should create a GitHub auth plugin with correct properties', () => {
      const plugin = githubAuth(mockConfig);

      expect(plugin.id).toBe('github');
      expect(plugin.name).toBe('Sign in with GitHub');
      expect(plugin.version).toBe('1.0.0');
      expect(plugin.config).toEqual(mockConfig);
    });

    it('should validate config on init', async () => {
      const plugin = githubAuth(mockConfig);
      await expect(plugin.init()).resolves.not.toThrow();
    });

    it('should throw error for missing clientId', async () => {
      const invalidConfig = { ...mockConfig, clientId: '' };
      const plugin = githubAuth(invalidConfig);
      
      await expect(plugin.init()).rejects.toThrow('GitHubAuth: clientId is required');
    });

    it('should throw error for missing clientSecret', async () => {
      const invalidConfig = { ...mockConfig, clientSecret: '' };
      const plugin = githubAuth(invalidConfig);
      
      await expect(plugin.init()).rejects.toThrow('GitHubAuth: clientSecret is required');
    });

    it('should throw error for missing redirectUri', async () => {
      const invalidConfig = { ...mockConfig, redirectUri: '' };
      const plugin = githubAuth(invalidConfig);
      
      await expect(plugin.init()).rejects.toThrow('GitHubAuth: redirectUri is required');
    });

    it('should throw error for missing domain', async () => {
      const invalidConfig = { ...mockConfig, domain: '' };
      const plugin = githubAuth(invalidConfig);
      
      await expect(plugin.init()).rejects.toThrow('GitHubAuth: domain is required');
    });
  });

  describe('generateNonce', () => {
    it('should generate a nonce using custom function', () => {
      const customNonce = 'custom-nonce';
      const configWithCustomNonce = {
        ...mockConfig,
        generateNonce: () => customNonce
      };
      const plugin = githubAuth(configWithCustomNonce);

      expect(plugin.generateNonce()).toBe(customNonce);
    });

    it('should generate a random nonce by default', () => {
      const plugin = githubAuth(mockConfig);
      const nonce1 = plugin.generateNonce();
      const nonce2 = plugin.generateNonce();

      expect(nonce1).toBeDefined();
      expect(nonce2).toBeDefined();
      expect(nonce1).not.toBe(nonce2);
    });
  });

  describe('createMessage', () => {
    it('should create a properly formatted message', () => {
      const plugin = githubAuth(mockConfig);
      const address = 'test@example.com';
      const nonce = 'test-nonce';

      const message = plugin.createMessage(address, nonce);

      expect(message).toContain(mockConfig.appName);
      expect(message).toContain(address);
      expect(message).toContain(mockConfig.statement);
      expect(message).toContain(mockConfig.uri);
      expect(message).toContain(mockConfig.appVersion);
      expect(message).toContain(nonce);
    });
  });

  describe('validateAddress', () => {
    it('should validate email addresses', () => {
      const plugin = githubAuth(mockConfig);

      expect(plugin.validateAddress('test@example.com')).toBe(true);
      expect(plugin.validateAddress('user@github.com')).toBe(true);
    });

    it('should validate GitHub usernames', () => {
      const plugin = githubAuth(mockConfig);

      expect(plugin.validateAddress('testuser')).toBe(true);
      expect(plugin.validateAddress('test-user')).toBe(true);
      expect(plugin.validateAddress('test_user')).toBe(true);
    });

    it('should validate GitHub URLs', () => {
      const plugin = githubAuth(mockConfig);

      expect(plugin.validateAddress('github.com/testuser')).toBe(true);
      expect(plugin.validateAddress('@testuser')).toBe(true);
    });

    it('should reject invalid addresses', () => {
      const plugin = githubAuth(mockConfig);

      expect(plugin.validateAddress('')).toBe(false);
      expect(plugin.validateAddress('invalid@')).toBe(false);
      expect(plugin.validateAddress('test@')).toBe(false);
      expect(plugin.validateAddress('test user')).toBe(false);
    });
  });

  describe('generateChallenge', () => {
    it('should generate a valid challenge', () => {
      const plugin = githubAuth(mockConfig);
      const clientId = 'test-client';

      const challenge = plugin.generateChallenge(clientId);

      expect(challenge.id).toBeDefined();
      expect(challenge.client_id).toBe(clientId);
      expect(challenge.state).toBeDefined();
      expect(challenge.code_verifier).toBeDefined();
      expect(challenge.code_challenge).toBeDefined();
      expect(challenge.created_at).toBeDefined();
      expect(challenge.expires_at).toBeGreaterThan(challenge.created_at);
      expect(challenge.used).toBe(false);
    });
  });

  describe('getAuthorizationUrl', () => {
    it('should generate a valid GitHub OAuth URL', () => {
      const plugin = githubAuth(mockConfig);
      const challenge = plugin.generateChallenge('test-client');

      const authUrl = plugin.getAuthorizationUrl(challenge);

      expect(authUrl).toContain('https://github.com/login/oauth/authorize');
      expect(authUrl).toContain(`client_id=${mockConfig.clientId}`);
      expect(authUrl).toContain(`redirect_uri=${encodeURIComponent(mockConfig.redirectUri)}`);
      expect(authUrl).toContain(`scope=${encodeURIComponent(mockConfig.scopes!.join(' '))}`);
      expect(authUrl).toContain(`state=${challenge.state}`);
      expect(authUrl).toContain(`code_challenge=${challenge.code_challenge}`);
      expect(authUrl).toContain('code_challenge_method=S256');
    });
  });

  describe('exchangeCodeForToken', () => {
    it('should exchange code for token successfully', async () => {
      const plugin = githubAuth(mockConfig);
      const mockTokenResponse = {
        access_token: 'test-access-token',
        token_type: 'Bearer',
        scope: 'user:email,read:user'
      };

      mockAxios.post.mockResolvedValueOnce({ data: mockTokenResponse });

      const result = await plugin.exchangeCodeForToken('test-code', 'test-verifier');

      expect(mockAxios.post).toHaveBeenCalledWith(
        'https://github.com/login/oauth/access_token',
        {
          client_id: mockConfig.clientId,
          client_secret: mockConfig.clientSecret,
          code: 'test-code',
          code_verifier: 'test-verifier'
        },
        {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        }
      );

      expect(result).toEqual(mockTokenResponse);
    });

    it('should handle token exchange errors', async () => {
      const plugin = githubAuth(mockConfig);
      const mockError = new Error('Token exchange failed');

      mockAxios.post.mockRejectedValueOnce(mockError);

      const result = await plugin.exchangeCodeForToken('test-code', 'test-verifier');

      expect(result.error).toBe('token_exchange_failed');
      expect(result.error_description).toContain('Token exchange failed');
    });
  });

  describe('fetchUserInfo', () => {
    it('should fetch user info successfully', async () => {
      const plugin = githubAuth(mockConfig);
      const mockUserInfo = {
        id: 12345,
        login: 'testuser',
        email: 'test@example.com',
        name: 'Test User',
        avatar_url: 'https://github.com/testuser.png',
        html_url: 'https://github.com/testuser',
        public_repos: 10,
        followers: 5,
        following: 3,
        created_at: '2020-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      };

      mockAxios.get.mockResolvedValueOnce({ data: mockUserInfo });

      const result = await plugin.fetchUserInfo('test-access-token');

      expect(mockAxios.get).toHaveBeenCalledWith(
        'https://api.github.com/user',
        {
          headers: {
            'Authorization': 'Bearer test-access-token',
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': mockConfig.appName
          }
        }
      );

      expect(result).toEqual(mockUserInfo);
    });

    it('should handle user info fetch errors', async () => {
      const plugin = githubAuth(mockConfig);
      const mockError = new Error('Failed to fetch user info');

      mockAxios.get.mockRejectedValueOnce(mockError);

      await expect(plugin.fetchUserInfo('test-access-token')).rejects.toThrow('Failed to fetch user info');
    });
  });

  describe('createSession', () => {
    it('should create a valid session', async () => {
      const plugin = githubAuth(mockConfig);
      const mockUserInfo = {
        id: 12345,
        login: 'testuser',
        email: 'test@example.com',
        name: 'Test User',
        avatar_url: 'https://github.com/testuser.png',
        html_url: 'https://github.com/testuser',
        public_repos: 10,
        followers: 5,
        following: 3,
        created_at: '2020-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      };
      const mockTokenResponse = {
        access_token: 'test-access-token',
        token_type: 'Bearer',
        scope: 'user:email,read:user'
      };
      const clientId = 'test-client';

      const session = await plugin.createSession(mockUserInfo, mockTokenResponse, clientId);

      expect(session.id).toBeDefined();
      expect(session.github_id).toBe(mockUserInfo.id);
      expect(session.login).toBe(mockUserInfo.login);
      expect(session.email).toBe(mockUserInfo.email);
      expect(session.name).toBe(mockUserInfo.name);
      expect(session.avatar_url).toBe(mockUserInfo.avatar_url);
      expect(session.client_id).toBe(clientId);
      expect(session.access_token).toBe(mockTokenResponse.access_token);
      expect(session.access_token_id).toBeDefined();
      expect(session.fingerprint).toBeDefined();
      expect(session.access_token_expires_at).toBeGreaterThan(Date.now());
      expect(session.created_at).toBeDefined();
      expect(session.last_used_at).toBeDefined();
      expect(session.is_active).toBe(true);
    });
  });

  describe('verifyCallback', () => {
    it('should verify callback successfully', async () => {
      const plugin = githubAuth(mockConfig);
      const mockUserInfo = {
        id: 12345,
        login: 'testuser',
        email: 'test@example.com',
        name: 'Test User',
        avatar_url: 'https://github.com/testuser.png',
        html_url: 'https://github.com/testuser',
        public_repos: 10,
        followers: 5,
        following: 3,
        created_at: '2020-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      };
      const mockTokenResponse = {
        access_token: 'test-access-token',
        token_type: 'Bearer',
        scope: 'user:email,read:user'
      };

      mockAxios.post.mockResolvedValueOnce({ data: mockTokenResponse });
      mockAxios.get.mockResolvedValueOnce({ data: mockUserInfo });

      const request = {
        code: 'test-code',
        state: 'test-state',
        client_id: 'test-client'
      };

      const result = await plugin.verifyCallback(request);

      expect(result.success).toBe(true);
      expect(result.session).toBeDefined();
      expect(result.user).toEqual(mockUserInfo);
    });

    it('should handle verification errors', async () => {
      const plugin = githubAuth(mockConfig);
      const mockError = new Error('Token exchange failed');

      mockAxios.post.mockRejectedValueOnce(mockError);

      const request = {
        code: 'test-code',
        state: 'test-state',
        client_id: 'test-client'
      };

      const result = await plugin.verifyCallback(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Token exchange failed');
    });
  });
});
