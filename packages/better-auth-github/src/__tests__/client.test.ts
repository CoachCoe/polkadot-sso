import { githubAuthClient, signInWithGitHub } from '../client';
import { GitHubAuthConfig } from '../types';

describe('GitHub Auth Client', () => {
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
    if (typeof window !== 'undefined') {
      (window.location as any).href = '';
      (window.localStorage.getItem as jest.Mock).mockReturnValue(null);
    }
  });

  describe('githubAuthClient', () => {
    it('should create a GitHub auth client with correct properties', () => {
      const client = githubAuthClient(mockConfig);

      expect(client.config).toEqual(mockConfig);
      expect(typeof client.validateConfig).toBe('function');
      expect(typeof client.init).toBe('function');
      expect(typeof client.signIn).toBe('function');
      expect(typeof client.signOut).toBe('function');
      expect(typeof client.getCurrentUser).toBe('function');
      expect(typeof client.isAuthenticated).toBe('function');
      expect(typeof client.on).toBe('function');
      expect(typeof client.off).toBe('function');
    });

    it('should validate config on init', async () => {
      const client = githubAuthClient(mockConfig);
      await expect(client.init()).resolves.not.toThrow();
    });

    it('should throw error for missing clientId', () => {
      const invalidConfig = { ...mockConfig, clientId: '' };
      
      expect(() => githubAuthClient(invalidConfig).validateConfig()).toThrow('GitHubAuth: clientId is required');
    });

    it('should throw error for missing redirectUri', () => {
      const invalidConfig = { ...mockConfig, redirectUri: '' };
      
      expect(() => githubAuthClient(invalidConfig).validateConfig()).toThrow('GitHubAuth: redirectUri is required');
    });

    it('should throw error for missing domain', () => {
      const invalidConfig = { ...mockConfig, domain: '' };
      
      expect(() => githubAuthClient(invalidConfig).validateConfig()).toThrow('GitHubAuth: domain is required');
    });
  });

  describe('signIn', () => {
    it('should redirect to GitHub OAuth URL', async () => {
      const client = githubAuthClient(mockConfig);
      
      const result = await client.signIn();

      expect(result.success).toBe(true);
      expect(result.nonce).toBeDefined();
      expect(result.message).toBeDefined();
      expect(window.location.href).toContain('https://github.com/login/oauth/authorize');
      expect(window.location.href).toContain(`client_id=${mockConfig.clientId}`);
      expect(window.location.href).toContain(`redirect_uri=${encodeURIComponent(mockConfig.redirectUri)}`);
      expect(window.location.href).toContain(`scope=${encodeURIComponent(mockConfig.scopes!.join(' '))}`);
    });

    it('should use custom redirectUri and scopes', async () => {
      const client = githubAuthClient(mockConfig);
      const customRedirectUri = 'http://localhost:3001/custom-callback';
      const customScopes = ['user:email', 'read:user', 'repo'];

      await client.signIn({
        redirectUri: customRedirectUri,
        scopes: customScopes
      });

      expect(window.location.href).toContain(`redirect_uri=${encodeURIComponent(customRedirectUri)}`);
      expect(window.location.href).toContain(`scope=${encodeURIComponent(customScopes.join(' '))}`);
    });

    it('should handle sign in errors', async () => {
      const client = githubAuthClient({ ...mockConfig, clientId: '' });
      
      const result = await client.signIn();

      expect(result.success).toBe(false);
      expect(result.error).toContain('clientId is required');
    });
  });

  describe('signOut', () => {
    it('should clear user data and emit signedOut event', async () => {
      const client = githubAuthClient(mockConfig);
      const mockCallback = jest.fn();
      
      client.on('signedOut', mockCallback);
      await client.signOut();

      expect(window.localStorage.removeItem).toHaveBeenCalledWith('github_auth_token');
      expect(window.localStorage.removeItem).toHaveBeenCalledWith('github_auth_user');
      expect(mockCallback).toHaveBeenCalledWith({});
    });
  });

  describe('getCurrentUser', () => {
    it('should return null when no user is authenticated', () => {
      const client = githubAuthClient(mockConfig);
      
      expect(client.getCurrentUser()).toBeNull();
    });

    it('should return stored user data', () => {
      const mockUser = {
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

      (window.localStorage.getItem as jest.Mock).mockReturnValue(JSON.stringify(mockUser));
      
      const client = githubAuthClient(mockConfig);
      client.init();

      expect(client.getCurrentUser()).toEqual(mockUser);
    });
  });

  describe('isAuthenticated', () => {
    it('should return false when no user is authenticated', () => {
      const client = githubAuthClient(mockConfig);
      
      expect(client.isAuthenticated()).toBe(false);
    });

    it('should return true when user is authenticated', () => {
      const mockUser = {
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

      (window.localStorage.getItem as jest.Mock).mockReturnValue(JSON.stringify(mockUser));
      
      const client = githubAuthClient(mockConfig);
      client.init();

      expect(client.isAuthenticated()).toBe(true);
    });
  });

  describe('event handling', () => {
    it('should register and emit events', () => {
      const client = githubAuthClient(mockConfig);
      const mockCallback = jest.fn();
      
      client.on('authenticated', mockCallback);
      
      const mockEvent = new CustomEvent('github-auth-success', {
        detail: { user: { id: 12345, login: 'testuser' } }
      });
      
      (window.addEventListener as jest.Mock).mockImplementation((event, callback) => {
        if (event === 'github-auth-success') {
          callback(mockEvent);
        }
      });
      
      client.init();
      
      expect(mockCallback).toHaveBeenCalledWith({ user: { id: 12345, login: 'testuser' } });
    });

    it('should remove event listeners', () => {
      const client = githubAuthClient(mockConfig);
      const mockCallback = jest.fn();
      
      client.on('authenticated', mockCallback);
      client.off('authenticated', mockCallback);
      
      expect(window.removeEventListener).toHaveBeenCalled();
    });
  });

  describe('init', () => {
    it('should restore user from localStorage', async () => {
      const mockUser = {
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

      (window.localStorage.getItem as jest.Mock).mockReturnValue(JSON.stringify(mockUser));
      
      const client = githubAuthClient(mockConfig);
      await client.init();

      expect(client.getCurrentUser()).toEqual(mockUser);
      expect(client.isAuthenticated()).toBe(true);
    });

    it('should handle invalid stored user data', async () => {
      (window.localStorage.getItem as jest.Mock).mockReturnValue('invalid-json');
      
      const client = githubAuthClient(mockConfig);
      await client.init();

      expect(client.getCurrentUser()).toBeNull();
      expect(client.isAuthenticated()).toBe(false);
      expect(window.localStorage.removeItem).toHaveBeenCalledWith('github_auth_user');
    });
  });
});

describe('signInWithGitHub', () => {
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
    if (typeof window !== 'undefined') {
      (window.location as any).href = '';
    }
  });

  it('should create client and sign in', async () => {
    const result = await signInWithGitHub(mockConfig);

    expect(result.success).toBe(true);
    expect(result.nonce).toBeDefined();
    expect(result.message).toBeDefined();
    expect(window.location.href).toContain('https://github.com/login/oauth/authorize');
  });

  it('should use custom options', async () => {
    const customOptions = {
      redirectUri: 'http://localhost:3001/custom-callback',
      scopes: ['user:email', 'read:user', 'repo']
    };

    await signInWithGitHub(mockConfig, customOptions);

    expect(window.location.href).toContain(`redirect_uri=${encodeURIComponent(customOptions.redirectUri)}`);
    expect(window.location.href).toContain(`scope=${encodeURIComponent(customOptions.scopes.join(' '))}`);
  });
});
