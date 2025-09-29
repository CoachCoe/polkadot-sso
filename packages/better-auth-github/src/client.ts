import { GitHubAuthConfig, GitHubAuthResult, GitHubUserInfo } from './types.js';

export interface GitHubAuthClient {
  config: GitHubAuthConfig;
  validateConfig(): void;
  init(): Promise<void>;
  signIn(options?: { redirectUri?: string; scopes?: string[] }): Promise<GitHubAuthResult>;
  signOut(): Promise<void>;
  getCurrentUser(): GitHubUserInfo | null;
  isAuthenticated(): boolean;
  on(event: 'authenticated' | 'signedOut', callback: (data: any) => void): void;
  off(event: 'authenticated' | 'signedOut', callback: (data: any) => void): void;
}

export function githubAuthClient(config: GitHubAuthConfig): GitHubAuthClient {
  let currentUser: GitHubUserInfo | null = null;
  const eventListeners: Map<string, Set<Function>> = new Map();
  
  const validateConfig = () => {
    if (!config.clientId) {
      throw new Error('GitHubAuth: clientId is required');
    }
    
    if (!config.redirectUri) {
      throw new Error('GitHubAuth: redirectUri is required');
    }
    
    if (!config.domain) {
      throw new Error('GitHubAuth: domain is required');
    }
  };
  
  const setupEventListeners = () => {
    if (typeof window === 'undefined') {
      return;
    }
    
    window.addEventListener('github-auth-success', handleAuthSuccess as EventListener);
    window.addEventListener('github-auth-error', handleAuthError as EventListener);
  };
  
  const handleAuthSuccess = (event: Event) => {
    const customEvent = event as CustomEvent;
    currentUser = customEvent.detail.user;
    emit('authenticated', customEvent.detail);
  };
  
  const handleAuthError = (event: Event) => {
    const customEvent = event as CustomEvent;
    currentUser = null;
    emit('signedOut', customEvent.detail);
  };
  
  const emit = (event: string, data: any) => {
    const listeners = eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  };
  
  const generateNonce = (): string => {
    if (config.generateNonce) {
      return config.generateNonce();
    }
    
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };
  
  const createMessage = (address: string, nonce: string): string => {
    const message = `${config.appName || 'GitHub App'} wants you to sign in with your GitHub account:

${address}

${config.statement || 'Sign in with GitHub'}

URI: ${config.uri || `https://${config.domain}`}
Version: ${config.appVersion || '1.0.0'}
Nonce: ${nonce}
Issued At: ${new Date().toISOString()}`;
    
    return message;
  };
  
  const signIn = async (options: {
    redirectUri?: string;
    scopes?: string[];
  } = {}): Promise<GitHubAuthResult> => {
    try {
      validateConfig();
      setupEventListeners();
      
      const redirectUri = options.redirectUri || config.redirectUri;
      const scopes = options.scopes || config.scopes || ['user:email', 'read:user'];
      
      const nonce = generateNonce();
      const state = generateNonce();
      
      const params = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: redirectUri,
        scope: scopes.join(' '),
        state,
        response_type: 'code'
      });
      
      const authUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;
      
      if (typeof window !== 'undefined') {
        window.location.href = authUrl;
      }
      
      const result: GitHubAuthResult = {
        success: true,
        address: '',
        nonce,
        message: createMessage('', nonce),
        signature: ''
      };
      
      return result;
    } catch (error) {
      return {
        success: false,
        address: '',
        nonce: '',
        message: '',
        signature: '',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  };
  
  const signOut = async (): Promise<void> => {
    currentUser = null;
    
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('github_auth_token');
      window.localStorage.removeItem('github_auth_user');
    }
    
    emit('signedOut', {});
  };
  
  const getCurrentUser = (): GitHubUserInfo | null => {
    return currentUser;
  };
  
  const isAuthenticated = (): boolean => {
    return currentUser !== null;
  };
  
  const on = (event: 'authenticated' | 'signedOut', callback: (data: any) => void): void => {
    if (!eventListeners.has(event)) {
      eventListeners.set(event, new Set());
    }
    eventListeners.get(event)!.add(callback);
  };
  
  const off = (event: 'authenticated' | 'signedOut', callback: (data: any) => void): void => {
    const listeners = eventListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  };
  
  return {
    config,
    
    validateConfig,
    
    async init() {
      validateConfig();
      setupEventListeners();
      
      if (typeof window !== 'undefined') {
        const storedUser = window.localStorage.getItem('github_auth_user');
        if (storedUser) {
          try {
            currentUser = JSON.parse(storedUser);
          } catch (error) {
            console.warn('Failed to parse stored user data:', error);
            window.localStorage.removeItem('github_auth_user');
          }
        }
      }
    },
    
    signIn,
    signOut,
    getCurrentUser,
    isAuthenticated,
    on,
    off
  };
}

export async function signInWithGitHub(config: GitHubAuthConfig, options?: { redirectUri?: string; scopes?: string[] }): Promise<GitHubAuthResult> {
  const client = githubAuthClient(config);
  return await client.signIn(options);
}
