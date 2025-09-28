/**
 * Google OAuth 2.0 Authentication Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Database } from 'sqlite';
import { GoogleAuthService } from '../services/googleAuthService.js';
import { ValidatedEnv } from '../utils/envValidation.js';

// Mock dependencies
vi.mock('../utils/logger.js', () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock('../utils/crypto.js', () => ({
  generateSecureRandom: vi.fn(() => 'test-random-string'),
  generateSecureUUID: vi.fn(() => 'test-uuid'),
  createHash: vi.fn(() => ({
    update: vi.fn().mockReturnThis(),
    digest: vi.fn(() => 'test-hash'),
  })),
  randomBytes: vi.fn(() => Buffer.from('test-bytes')),
}));

describe('GoogleAuthService', () => {
  let mockDb: Database;
  let mockEnv: ValidatedEnv;
  let googleAuthService: GoogleAuthService;

  beforeEach(() => {
    // Mock database
    mockDb = {
      run: vi.fn().mockResolvedValue({ changes: 1 }),
      get: vi.fn().mockResolvedValue(null),
      all: vi.fn().mockResolvedValue([]),
    } as any;

    // Mock environment
    mockEnv = {
      GOOGLE_CLIENT_ID: 'test-client-id',
      GOOGLE_CLIENT_SECRET: 'test-client-secret',
      GOOGLE_REDIRECT_URI: 'http://localhost:3001/api/auth/google/callback',
      GOOGLE_SCOPES: ['openid', 'email', 'profile'],
      GOOGLE_AUTH_TIMEOUT: 300,
      PORT: 3001,
    } as ValidatedEnv;

    googleAuthService = new GoogleAuthService();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('generateChallenge', () => {
    it('should generate a valid challenge with PKCE parameters', async () => {
      const clientId = 'test-client';
      const challenge = await googleAuthService.generateChallenge(clientId);

      expect(challenge).toMatchObject({
        id: 'test-uuid',
        client_id: clientId,
        code_verifier: 'test-random-string',
        code_challenge: 'test-hash',
        state: 'test-random-string',
        nonce: 'test-uuid',
        used: false,
      });

      expect(challenge.created_at).toBeGreaterThan(0);
      expect(challenge.expires_at).toBeGreaterThan(challenge.created_at);
      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO google_challenges'),
        expect.arrayContaining([
          'test-uuid',
          clientId,
          'test-random-string',
          'test-random-string',
          'test-hash',
          'test-uuid',
          expect.any(Number),
          expect.any(Number),
          false,
        ])
      );
    });

    it('should throw error if database operation fails', async () => {
      (mockDb.run as any).mockRejectedValue(new Error('Database error'));

      await expect(
        googleAuthService.generateChallenge('test-client')
      ).rejects.toThrow('Failed to generate OAuth challenge');
    });
  });

  describe('getAuthorizationUrl', () => {
    it('should generate valid Google OAuth URL', () => {
      const challenge = {
        id: 'test-uuid',
        client_id: 'test-client',
        code_verifier: 'test-verifier',
        code_challenge: 'test-challenge',
        state: 'test-state',
        nonce: 'test-nonce',
        created_at: Date.now(),
        expires_at: Date.now() + 300000,
        used: false,
      };

      const authUrl = googleAuthService.getAuthorizationUrl(challenge);

      expect(authUrl).toContain('https://accounts.google.com/o/oauth2/v2/auth');
      expect(authUrl).toContain('client_id=test-client-id');
      expect(authUrl).toContain('redirect_uri=http%3A%2F%2Flocalhost%3A3001%2Fapi%2Fauth%2Fgoogle%2Fcallback');
      expect(authUrl).toContain('scope=openid%20email%20profile');
      expect(authUrl).toContain('state=test-state');
      expect(authUrl).toContain('nonce=test-nonce');
      expect(authUrl).toContain('code_challenge=test-challenge');
      expect(authUrl).toContain('code_challenge_method=S256');
    });
  });

  describe('verifyCallback', () => {
    const mockChallenge = {
      id: 'test-uuid',
      client_id: 'test-client',
      code_verifier: 'test-verifier',
      code_challenge: 'test-challenge',
      state: 'test-state',
      nonce: 'test-nonce',
      created_at: Date.now(),
      expires_at: Date.now() + 300000,
      used: false,
    };

    const mockTokens = {
      access_token: 'test-access-token',
      refresh_token: 'test-refresh-token',
      expires_in: 3600,
      token_type: 'Bearer',
      id_token: 'test-id-token',
    };

    const mockIdTokenPayload = {
      iss: 'https://accounts.google.com',
      sub: 'test-google-id',
      aud: 'test-client-id',
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
      email: 'test@example.com',
      email_verified: true,
      name: 'Test User',
      picture: 'https://example.com/photo.jpg',
      given_name: 'Test',
      family_name: 'User',
      locale: 'en',
      nonce: 'test-nonce',
    };

    beforeEach(() => {
      // Mock database responses
      (mockDb.get as any).mockResolvedValue({
        challenge_id: mockChallenge.id,
        client_id: mockChallenge.client_id,
        code_verifier: mockChallenge.code_verifier,
        code_challenge: mockChallenge.code_challenge,
        state: mockChallenge.state,
        nonce: mockChallenge.nonce,
        created_at: mockChallenge.created_at,
        expires_at: mockChallenge.expires_at,
        used: mockChallenge.used,
      });

      // Mock Google OAuth2Client
      const mockOAuth2Client = {
        getToken: vi.fn().mockResolvedValue({ tokens: mockTokens }),
        verifyIdToken: vi.fn().mockResolvedValue({
          getPayload: () => mockIdTokenPayload,
        }),
      };

      // Replace the oauth2Client in the service
      (googleAuthService as any).oauth2Client = mockOAuth2Client;
    });

    it('should successfully verify callback and create session', async () => {
      const request = {
        code: 'test-auth-code',
        state: 'test-state',
        client_id: 'test-client',
      };

      const result = await googleAuthService.verifyCallback(request);

      expect(result.success).toBe(true);
      expect(result.session).toMatchObject({
        id: 'test-uuid',
        google_id: 'test-google-id',
        email: 'test@example.com',
        name: 'Test User',
        picture: 'https://example.com/photo.jpg',
        client_id: 'test-client',
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        is_active: true,
      });

      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO google_sessions'),
        expect.arrayContaining([
          'test-uuid',
          'test-google-id',
          'test@example.com',
          'Test User',
          'https://example.com/photo.jpg',
          'test-client',
          'test-access-token',
          'test-refresh-token',
          'test-uuid',
          'test-uuid',
          expect.any(String), // fingerprint
          expect.any(Number), // access_token_expires_at
          expect.any(Number), // refresh_token_expires_at
          expect.any(Number), // created_at
          expect.any(Number), // last_used_at
          true, // is_active
        ])
      );

      // Should mark challenge as used
      expect(mockDb.run).toHaveBeenCalledWith(
        'UPDATE google_challenges SET used = 1 WHERE challenge_id = ?',
        ['test-uuid']
      );
    });

    it('should throw error for invalid challenge', async () => {
      (mockDb.get as any).mockResolvedValue(null);

      const request = {
        code: 'test-auth-code',
        state: 'invalid-state',
        client_id: 'test-client',
      };

      await expect(
        googleAuthService.verifyCallback(request)
      ).rejects.toThrow('Invalid or expired challenge');
    });

    it('should throw error for used challenge', async () => {
      (mockDb.get as any).mockResolvedValue({
        ...mockChallenge,
        used: 1,
      });

      const request = {
        code: 'test-auth-code',
        state: 'test-state',
        client_id: 'test-client',
      };

      await expect(
        googleAuthService.verifyCallback(request)
      ).rejects.toThrow('Challenge has already been used');
    });

    it('should throw error for expired challenge', async () => {
      (mockDb.get as any).mockResolvedValue({
        ...mockChallenge,
        expires_at: Date.now() - 1000, // Expired
      });

      const request = {
        code: 'test-auth-code',
        state: 'test-state',
        client_id: 'test-client',
      };

      await expect(
        googleAuthService.verifyCallback(request)
      ).rejects.toThrow('Challenge has expired');
    });

    it('should throw error for client ID mismatch', async () => {
      const request = {
        code: 'test-auth-code',
        state: 'test-state',
        client_id: 'different-client',
      };

      await expect(
        googleAuthService.verifyCallback(request)
      ).rejects.toThrow('Client ID mismatch');
    });

    it('should throw error for nonce mismatch', async () => {
      const mockIdTokenPayloadWithWrongNonce = {
        ...mockIdTokenPayload,
        nonce: 'wrong-nonce',
      };

      (googleAuthService as any).oauth2Client.verifyIdToken.mockResolvedValue({
        getPayload: () => mockIdTokenPayloadWithWrongNonce,
      });

      const request = {
        code: 'test-auth-code',
        state: 'test-state',
        client_id: 'test-client',
      };

      await expect(
        googleAuthService.verifyCallback(request)
      ).rejects.toThrow('Nonce mismatch');
    });
  });

  describe('cleanupExpiredChallenges', () => {
    it('should clean up expired challenges', async () => {
      (mockDb.run as any).mockResolvedValue({ changes: 5 });

      const result = await googleAuthService.cleanupExpiredChallenges();

      expect(result).toBe(5);
      expect(mockDb.run).toHaveBeenCalledWith(
        'DELETE FROM google_challenges WHERE expires_at < ?',
        [expect.any(Number)]
      );
    });

    it('should return 0 when no challenges are cleaned up', async () => {
      (mockDb.run as any).mockResolvedValue({ changes: 0 });

      const result = await googleAuthService.cleanupExpiredChallenges();

      expect(result).toBe(0);
    });
  });

  describe('getSession', () => {
    it('should return session when found', async () => {
      const mockSession = {
        id: 'test-session-id',
        google_id: 'test-google-id',
        email: 'test@example.com',
        name: 'Test User',
        picture: 'https://example.com/photo.jpg',
        client_id: 'test-client',
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        access_token_id: 'test-access-token-id',
        refresh_token_id: 'test-refresh-token-id',
        fingerprint: 'test-fingerprint',
        access_token_expires_at: Date.now() + 3600000,
        refresh_token_expires_at: Date.now() + 604800000,
        created_at: Date.now(),
        last_used_at: Date.now(),
        is_active: 1,
      };

      (mockDb.get as any).mockResolvedValue(mockSession);

      const result = await googleAuthService.getSession('test-session-id');

      expect(result).toMatchObject({
        id: 'test-session-id',
        google_id: 'test-google-id',
        email: 'test@example.com',
        name: 'Test User',
        picture: 'https://example.com/photo.jpg',
        client_id: 'test-client',
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        access_token_id: 'test-access-token-id',
        refresh_token_id: 'test-refresh-token-id',
        fingerprint: 'test-fingerprint',
        access_token_expires_at: mockSession.access_token_expires_at,
        refresh_token_expires_at: mockSession.refresh_token_expires_at,
        created_at: mockSession.created_at,
        last_used_at: mockSession.last_used_at,
        is_active: true,
      });

      expect(mockDb.get).toHaveBeenCalledWith(
        'SELECT * FROM google_sessions WHERE id = ? AND is_active = 1',
        ['test-session-id']
      );
    });

    it('should return null when session not found', async () => {
      (mockDb.get as any).mockResolvedValue(null);

      const result = await googleAuthService.getSession('non-existent-session');

      expect(result).toBeNull();
    });
  });

  describe('refreshAccessToken', () => {
    it('should refresh access token successfully', async () => {
      const mockSession = {
        id: 'test-session-id',
        google_id: 'test-google-id',
        email: 'test@example.com',
        name: 'Test User',
        client_id: 'test-client',
        access_token: 'old-access-token',
        refresh_token: 'test-refresh-token',
        access_token_id: 'test-access-token-id',
        refresh_token_id: 'test-refresh-token-id',
        fingerprint: 'test-fingerprint',
        access_token_expires_at: Date.now() - 1000, // Expired
        refresh_token_expires_at: Date.now() + 604800000,
        created_at: Date.now(),
        last_used_at: Date.now(),
        is_active: true,
      };

      const mockNewTokens = {
        access_token: 'new-access-token',
        expiry_date: Date.now() + 3600000,
      };

      // Mock getSession to return the session
      (mockDb.get as any).mockResolvedValue(mockSession);

      // Mock OAuth2Client refresh
      const mockOAuth2Client = {
        setCredentials: vi.fn(),
        refreshAccessToken: vi.fn().mockResolvedValue({
          credentials: mockNewTokens,
        }),
      };

      (googleAuthService as any).oauth2Client = mockOAuth2Client;

      const result = await googleAuthService.refreshAccessToken('test-session-id');

      expect(result).toBeDefined();
      expect(mockOAuth2Client.setCredentials).toHaveBeenCalledWith({
        refresh_token: 'test-refresh-token',
      });
      expect(mockOAuth2Client.refreshAccessToken).toHaveBeenCalled();
      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE google_sessions SET'),
        expect.arrayContaining([
          'new-access-token',
          expect.any(Number), // access_token_expires_at
          expect.any(Number), // last_used_at
          'test-session-id',
        ])
      );
    });

    it('should return null when session not found', async () => {
      (mockDb.get as any).mockResolvedValue(null);

      const result = await googleAuthService.refreshAccessToken('non-existent-session');

      expect(result).toBeNull();
    });

    it('should return null when no refresh token', async () => {
      const mockSession = {
        id: 'test-session-id',
        google_id: 'test-google-id',
        email: 'test@example.com',
        name: 'Test User',
        client_id: 'test-client',
        access_token: 'test-access-token',
        refresh_token: null,
        access_token_id: 'test-access-token-id',
        refresh_token_id: null,
        fingerprint: 'test-fingerprint',
        access_token_expires_at: Date.now() + 3600000,
        refresh_token_expires_at: null,
        created_at: Date.now(),
        last_used_at: Date.now(),
        is_active: true,
      };

      (mockDb.get as any).mockResolvedValue(mockSession);

      const result = await googleAuthService.refreshAccessToken('test-session-id');

      expect(result).toBeNull();
    });
  });

  describe('constructor', () => {
    it('should throw error when Google OAuth config is missing', () => {
      const invalidEnv = {
        ...mockEnv,
        GOOGLE_CLIENT_ID: undefined,
      } as ValidatedEnv;

      expect(() => {
        new GoogleAuthService();
      }).toThrow('Google OAuth configuration is missing');
    });
  });
});
