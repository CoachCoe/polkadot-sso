import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GoogleAuthService } from '../../services/googleAuthService.js';

// Mock google-auth-library
vi.mock('google-auth-library', () => ({
  OAuth2Client: vi.fn().mockImplementation(() => ({
    generateAuthUrl: vi.fn().mockReturnValue('https://accounts.google.com/oauth/authorize?client_id=test'),
    getToken: vi.fn().mockResolvedValue({
      tokens: {
        access_token: 'test-access-token',
        id_token: 'test-id-token',
        refresh_token: 'test-refresh-token',
        expiry_date: Date.now() + 3600000,
      },
    }),
    setCredentials: vi.fn(),
    verifyIdToken: vi.fn().mockResolvedValue({
      getPayload: vi.fn().mockReturnValue({
        sub: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        picture: 'https://example.com/avatar.jpg',
        email_verified: true,
      }),
    }),
    _clientId: 'test-client-id',
  })),
}));

// Mock jsonwebtoken
vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn().mockReturnValue('test-jwt-token'),
    verify: vi.fn().mockReturnValue({
      sub: 'test-user-id',
      authType: 'google',
      provider: 'google',
      email: 'test@example.com',
      name: 'Test User',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    }),
  },
}));

describe('GoogleAuthService', () => {
  let googleAuthService: GoogleAuthService;
  const testConfig = {
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    redirectUri: 'http://localhost:3001/api/auth/google/callback',
    scopes: ['openid', 'email', 'profile'],
  };
  const testJwtSecret = 'test-jwt-secret';

  beforeEach(() => {
    googleAuthService = new GoogleAuthService(testConfig, testJwtSecret);
  });

  describe('generateChallenge', () => {
    it('should generate a valid challenge', () => {
      const challenge = googleAuthService.generateChallenge();

      expect(challenge).toHaveProperty('challengeId');
      expect(challenge).toHaveProperty('authUrl');
      expect(challenge).toHaveProperty('state');
      expect(challenge).toHaveProperty('nonce');
      expect(challenge).toHaveProperty('expiresAt');

      expect(challenge.challengeId).toBeDefined();
      expect(challenge.authUrl).toBe('https://accounts.google.com/oauth/authorize?client_id=test');
      expect(challenge.state).toBeDefined();
      expect(challenge.nonce).toBeDefined();
      expect(challenge.expiresAt).toBeGreaterThan(Date.now());
    });

    it('should generate unique challenges', () => {
      const challenge1 = googleAuthService.generateChallenge();
      const challenge2 = googleAuthService.generateChallenge();

      expect(challenge1.challengeId).not.toBe(challenge2.challengeId);
      expect(challenge1.state).not.toBe(challenge2.state);
      expect(challenge1.nonce).not.toBe(challenge2.nonce);
    });
  });

  describe('exchangeCodeForTokens', () => {
    it('should exchange code for tokens successfully', async () => {
      const testCode = 'test-authorization-code';
      const testState = 'test-challenge-id:test-state:test-nonce';
      const testChallengeId = 'test-challenge-id';

      const result = await googleAuthService.exchangeCodeForTokens(testCode, testState, testChallengeId);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('expiresIn');
      expect(result).toHaveProperty('user');

      expect(result.accessToken).toBe('test-access-token');
      expect(result.refreshToken).toBe('test-refresh-token');
      expect(result.user.email).toBe('test@example.com');
      expect(result.user.name).toBe('Test User');
    });

    it('should throw error for invalid state parameter', async () => {
      const testCode = 'test-authorization-code';
      const invalidState = 'invalid-state';
      const testChallengeId = 'test-challenge-id';

      await expect(
        googleAuthService.exchangeCodeForTokens(testCode, invalidState, testChallengeId)
      ).rejects.toThrow('Invalid challenge ID in state parameter');
    });
  });

  describe('generateJWT', () => {
    it('should generate a valid JWT token', () => {
      const testUserInfo = {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        picture: 'https://example.com/avatar.jpg',
        verified_email: true,
      };
      const testNonce = 'test-nonce';

      const token = googleAuthService.generateJWT(testUserInfo, testNonce);

      expect(token).toBe('test-jwt-token');
    });
  });

  describe('verifyJWT', () => {
    it('should verify a valid JWT token', () => {
      const testToken = 'test-jwt-token';

      const result = googleAuthService.verifyJWT(testToken);

      expect(result).toHaveProperty('sub');
      expect(result).toHaveProperty('authType');
      expect(result).toHaveProperty('provider');
      expect(result.sub).toBe('test-user-id');
      expect(result.authType).toBe('google');
      expect(result.provider).toBe('google');
    });
  });

  describe('validateConfig', () => {
    it('should validate a complete config', () => {
      const validConfig = {
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        redirectUri: 'http://localhost:3001/api/auth/google/callback',
        scopes: ['openid', 'email', 'profile'],
      };

      const result = GoogleAuthService.validateConfig(validConfig);

      expect(result).toEqual(validConfig);
    });

    it('should throw error for missing client ID', () => {
      const invalidConfig = {
        clientSecret: 'test-client-secret',
        redirectUri: 'http://localhost:3001/api/auth/google/callback',
      };

      expect(() => GoogleAuthService.validateConfig(invalidConfig)).toThrow(
        'Google OAuth2 client ID is required'
      );
    });

    it('should throw error for missing client secret', () => {
      const invalidConfig = {
        clientId: 'test-client-id',
        redirectUri: 'http://localhost:3001/api/auth/google/callback',
      };

      expect(() => GoogleAuthService.validateConfig(invalidConfig)).toThrow(
        'Google OAuth2 client secret is required'
      );
    });

    it('should throw error for missing redirect URI', () => {
      const invalidConfig = {
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
      };

      expect(() => GoogleAuthService.validateConfig(invalidConfig)).toThrow(
        'Google OAuth2 redirect URI is required'
      );
    });

    it('should use default scopes when not provided', () => {
      const configWithoutScopes = {
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        redirectUri: 'http://localhost:3001/api/auth/google/callback',
      };

      const result = GoogleAuthService.validateConfig(configWithoutScopes);

      expect(result.scopes).toEqual(['openid', 'email', 'profile']);
    });
  });
});
