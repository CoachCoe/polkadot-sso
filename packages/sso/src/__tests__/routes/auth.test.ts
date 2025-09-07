import express from 'express';
import request from 'supertest';
import { createAuthRouter } from '../../routes/auth';
import { AuditService } from '../../services/auditService';
import { ChallengeService } from '../../services/challengeService';
import { TokenService } from '../../services/token';

jest.mock('../../services/token');
jest.mock('../../services/challengeService');
jest.mock('../../services/auditService');
jest.mock('../../config/db');

const mockTokenService = {
  generateTokens: jest.fn(),
  verifyToken: jest.fn(),
  createSession: jest.fn(),
  invalidateSession: jest.fn(),
  refreshSession: jest.fn(),
  getSessionStats: jest.fn(),
} as unknown as jest.Mocked<TokenService>;

const mockChallengeService = {
  generateChallenge: jest.fn(),
  getChallenge: jest.fn(),
  markChallengeUsed: jest.fn(),
  cleanupExpiredChallenges: jest.fn(),
  getChallengeStats: jest.fn(),
} as unknown as jest.Mocked<ChallengeService>;

const mockAuditService = {
  log: jest.fn(),
  getAuditLogs: jest.fn(),
  getAuditStats: jest.fn(),
  cleanupOldAuditLogs: jest.fn(),
} as unknown as jest.Mocked<AuditService>;

(TokenService as jest.Mock).mockImplementation(() => mockTokenService);
(ChallengeService as jest.Mock).mockImplementation(() => mockChallengeService);
(AuditService as jest.Mock).mockImplementation(() => mockAuditService);

describe('Auth Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    const authRouter = createAuthRouter(
      mockTokenService,
      mockChallengeService,
      mockAuditService,
      new Map()
    );
    app.use('/auth', authRouter);

    jest.clearAllMocks();
  });

  describe('GET /auth/challenge', () => {
    it('should generate a challenge', async () => {
      const mockChallenge = {
        id: 'test-challenge-id',
        client_id: 'test-client',
        message: 'test-message',
        nonce: 'test-nonce',
        issued_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 300000).toISOString(),
        created_at: Date.now(),
        expires_at_timestamp: Date.now() + 300000,
        used: false,
        code_verifier: 'test-verifier',
        code_challenge: 'test-challenge',
        state: 'test-state',
      };

      mockChallengeService.generateChallenge.mockResolvedValue(mockChallenge);

      const response = await request(app)
        .get('/auth/challenge')
        .query({
          client_id: 'test-client',
          address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'
        })
        .expect(200);

      // The challenge endpoint returns HTML, not JSON
      expect(response.text).toContain('Sign Message');
      expect(response.text).toContain('window.CHALLENGE_DATA');
      expect(mockChallengeService.generateChallenge).toHaveBeenCalledWith('test-client');
    });

    it('should generate a challenge with user address', async () => {
      const mockChallenge = {
        id: 'test-challenge-id',
        client_id: 'test-client',
        message: 'test-message',
        nonce: 'test-nonce',
        issued_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 300000).toISOString(),
        created_at: Date.now(),
        expires_at_timestamp: Date.now() + 300000,
        used: false,
        code_verifier: 'test-verifier',
        code_challenge: 'test-challenge',
        state: 'test-state',
      };

      mockChallengeService.generateChallenge.mockResolvedValue(mockChallenge);

      const response = await request(app)
        .get('/auth/challenge')
        .query({
          client_id: 'test-client',
          address: 'test-address',
        })
        .expect(200);

      // The challenge endpoint returns HTML, not JSON
      expect(response.text).toContain('Sign Message');
      expect(response.text).toContain('window.CHALLENGE_DATA');
      expect(mockChallengeService.generateChallenge).toHaveBeenCalledWith('test-client');
    });

    it('should return 400 for missing client_id', async () => {
      const response = await request(app).get('/auth/challenge').expect(400);

      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toBeDefined();
    });
  });

  describe('POST /auth/verify', () => {
    it('should verify a valid signature', async () => {
      const mockTokens = {
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        fingerprint: 'test-fingerprint',
        accessJwtid: 'test-access-jwtid',
        refreshJwtid: 'test-refresh-jwtid',
        accessTokenExpiresAt: Date.now() + 3600000,
        refreshTokenExpiresAt: Date.now() + 86400000,
      };

      const mockChallenge = {
        id: 'test-challenge-id',
        client_id: 'test-client',
        message: 'test-message',
        nonce: 'test-nonce',
        issued_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 300000).toISOString(),
        created_at: Date.now(),
        expires_at_timestamp: Date.now() + 300000,
        used: false,
        code_verifier: 'test-verifier',
        code_challenge: 'test-challenge',
        state: 'test-state',
      };

      const mockSession = {
        id: 'test-session-id',
        address: 'test-address',
        client_id: 'test-client',
        access_token: mockTokens.accessToken,
        refresh_token: mockTokens.refreshToken,
        access_token_id: mockTokens.accessJwtid,
        refresh_token_id: mockTokens.refreshJwtid,
        fingerprint: mockTokens.fingerprint,
        access_token_expires_at: Date.now() + 3600000,
        refresh_token_expires_at: Date.now() + 86400000,
        created_at: Date.now(),
        last_used_at: Date.now(),
        is_active: true,
      };

      mockChallengeService.getChallenge.mockResolvedValue(mockChallenge);
      mockTokenService.generateTokens.mockReturnValue(mockTokens);
      mockTokenService.createSession.mockResolvedValue(mockSession);
      mockChallengeService.markChallengeUsed.mockResolvedValue(true);
      mockAuditService.log.mockResolvedValue();

      const response = await request(app)
        .get('/verify')
        .query({
          challenge_id: 'test-challenge-id',
          signature: 'test-signature',
          address: 'test-address',
          code_verifier: 'test-verifier',
          state: 'test-state',
        })
        .expect(302); // Redirect response

      // Verify endpoint returns a redirect, not JSON
      expect(response.headers.location).toContain('code=');
      expect(mockChallengeService.getChallenge).toHaveBeenCalledWith('test-challenge-id');
      expect(mockChallengeService.markChallengeUsed).toHaveBeenCalledWith('test-challenge-id');
    });

    it('should return 400 for missing challenge_id', async () => {
      const response = await request(app)
        .get('/verify')
        .query({
          signature: 'test-signature',
          address: 'test-address',
        })
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toBeDefined();
    });

    it('should return 400 for missing signature', async () => {
      const response = await request(app)
        .get('/verify')
        .query({
          challenge_id: 'test-challenge-id',
          address: 'test-address',
        })
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toBeDefined();
    });

    it('should return 400 for missing address', async () => {
      const response = await request(app)
        .get('/verify')
        .query({
          challenge_id: 'test-challenge-id',
          signature: 'test-signature',
        })
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toBeDefined();
    });

    it('should return 400 for invalid challenge', async () => {
      mockChallengeService.getChallenge.mockResolvedValue(null);

      const response = await request(app)
        .get('/verify')
        .query({
          challenge_id: 'invalid-challenge-id',
          signature: 'test-signature',
          address: 'test-address',
          code_verifier: 'test-verifier',
          state: 'test-state',
        })
        .expect(400);

      expect(response.text).toBe('Invalid challenge or state mismatch');
    });

    it('should return 400 for used challenge', async () => {
      const mockChallenge = {
        id: 'test-challenge-id',
        client_id: 'test-client',
        message: 'test-message',
        nonce: 'test-nonce',
        issued_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 300000).toISOString(),
        created_at: Date.now(),
        expires_at_timestamp: Date.now() + 300000,
        used: true,
        code_verifier: 'test-verifier',
        code_challenge: 'test-challenge',
        state: 'test-state',
      };

      mockChallengeService.getChallenge.mockResolvedValue(mockChallenge);

      const response = await request(app)
        .post('/auth/verify')
        .send({
          challenge_id: 'test-challenge-id',
          signature: 'test-signature',
          public_key: 'test-public-key',
        })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Challenge has already been used',
      });
    });
  });

  describe('POST /auth/signout', () => {
    it('should sign out a user', async () => {
      mockTokenService.invalidateSession.mockResolvedValue(true);
      mockAuditService.log.mockResolvedValue();

      const response = await request(app)
        .post('/auth/signout')
        .send({
          address: 'test-address',
          client_id: 'test-client',
        })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Successfully signed out',
      });

      expect(mockTokenService.invalidateSession).toHaveBeenCalledWith('test-access-token');
      expect(mockAuditService.log).toHaveBeenCalled();
    });

    it('should return 400 for missing address', async () => {
      const response = await request(app)
        .post('/auth/signout')
        .send({
          client_id: 'test-client',
        })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'address and client_id are required',
      });
    });

    it('should return 400 for missing client_id', async () => {
      const response = await request(app)
        .post('/auth/signout')
        .send({
          address: 'test-address',
        })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'address and client_id are required',
      });
    });
  });
});
