import express from 'express';
import request from 'supertest';
import { createAuthRouter } from '../../routes/auth';
import { AuditService } from '../../services/auditService';
import { ChallengeService } from '../../services/challengeService';
import { TokenService } from '../../services/token';

// Mock services
jest.mock('../../services/token');
jest.mock('../../services/challengeService');
jest.mock('../../services/auditService');
jest.mock('../../config/db');

const mockTokenService = {
  generateTokens: jest.fn(),
  verifyToken: jest.fn(),
  createSession: jest.fn(),
  invalidateSession: jest.fn(),
} as jest.Mocked<TokenService>;

const mockChallengeService = {
  generateChallenge: jest.fn(),
  getChallenge: jest.fn(),
  markChallengeUsed: jest.fn(),
} as jest.Mocked<ChallengeService>;

const mockAuditService = {
  logEvent: jest.fn(),
} as jest.Mocked<AuditService>;

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
      []
    );
    app.use('/auth', authRouter);

    jest.clearAllMocks();
  });

  describe('GET /auth/challenge', () => {
    it('should generate a challenge', async () => {
      const mockChallenge = {
        id: 'test-challenge-id',
        client_id: 'test-client',
        user_address: null,
        challenge: 'test-challenge-string',
        expires_at: new Date(Date.now() + 300000).toISOString(),
        is_used: false,
        created_at: new Date().toISOString(),
      };

      mockChallengeService.generateChallenge.mockResolvedValue(mockChallenge);

      const response = await request(app)
        .get('/auth/challenge')
        .query({ client_id: 'test-client' })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        challenge: mockChallenge,
      });
      expect(mockChallengeService.generateChallenge).toHaveBeenCalledWith('test-client', undefined);
    });

    it('should generate a challenge with user address', async () => {
      const mockChallenge = {
        id: 'test-challenge-id',
        client_id: 'test-client',
        user_address: 'test-address',
        challenge: 'test-challenge-string',
        expires_at: new Date(Date.now() + 300000).toISOString(),
        is_used: false,
        created_at: new Date().toISOString(),
      };

      mockChallengeService.generateChallenge.mockResolvedValue(mockChallenge);

      const response = await request(app)
        .get('/auth/challenge')
        .query({
          client_id: 'test-client',
          user_address: 'test-address',
        })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        challenge: mockChallenge,
      });
      expect(mockChallengeService.generateChallenge).toHaveBeenCalledWith(
        'test-client',
        'test-address'
      );
    });

    it('should return 400 for missing client_id', async () => {
      const response = await request(app).get('/auth/challenge').expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'client_id is required',
      });
    });
  });

  describe('POST /auth/verify', () => {
    it('should verify a valid signature', async () => {
      const mockTokens = {
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        fingerprint: 'test-fingerprint',
      };

      const mockChallenge = {
        id: 'test-challenge-id',
        client_id: 'test-client',
        user_address: 'test-address',
        challenge: 'test-challenge-string',
        expires_at: new Date(Date.now() + 300000).toISOString(),
        is_used: false,
        created_at: new Date().toISOString(),
      };

      const mockSession = {
        id: 'test-session-id',
        address: 'test-address',
        client_id: 'test-client',
        access_token: mockTokens.accessToken,
        refresh_token: mockTokens.refreshToken,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockChallengeService.getChallenge.mockResolvedValue(mockChallenge);
      mockTokenService.generateTokens.mockReturnValue(mockTokens);
      mockTokenService.createSession.mockResolvedValue(mockSession);
      mockChallengeService.markChallengeUsed.mockResolvedValue(true);
      mockAuditService.logEvent.mockResolvedValue({} as any);

      const response = await request(app)
        .post('/auth/verify')
        .send({
          challenge_id: 'test-challenge-id',
          signature: 'test-signature',
          public_key: 'test-public-key',
        })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        session: mockSession,
        tokens: mockTokens,
      });

      expect(mockChallengeService.getChallenge).toHaveBeenCalledWith('test-challenge-id');
      expect(mockTokenService.generateTokens).toHaveBeenCalledWith('test-address', 'test-client');
      expect(mockTokenService.createSession).toHaveBeenCalledWith(
        'test-address',
        'test-client',
        mockTokens.accessToken,
        mockTokens.refreshToken
      );
      expect(mockChallengeService.markChallengeUsed).toHaveBeenCalledWith('test-challenge-id');
      expect(mockAuditService.logEvent).toHaveBeenCalled();
    });

    it('should return 400 for missing challenge_id', async () => {
      const response = await request(app)
        .post('/auth/verify')
        .send({
          signature: 'test-signature',
          public_key: 'test-public-key',
        })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'challenge_id, signature, and public_key are required',
      });
    });

    it('should return 400 for missing signature', async () => {
      const response = await request(app)
        .post('/auth/verify')
        .send({
          challenge_id: 'test-challenge-id',
          public_key: 'test-public-key',
        })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'challenge_id, signature, and public_key are required',
      });
    });

    it('should return 400 for missing public_key', async () => {
      const response = await request(app)
        .post('/auth/verify')
        .send({
          challenge_id: 'test-challenge-id',
          signature: 'test-signature',
        })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'challenge_id, signature, and public_key are required',
      });
    });

    it('should return 400 for invalid challenge', async () => {
      mockChallengeService.getChallenge.mockResolvedValue(null);

      const response = await request(app)
        .post('/auth/verify')
        .send({
          challenge_id: 'invalid-challenge-id',
          signature: 'test-signature',
          public_key: 'test-public-key',
        })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Invalid or expired challenge',
      });
    });

    it('should return 400 for used challenge', async () => {
      const mockChallenge = {
        id: 'test-challenge-id',
        client_id: 'test-client',
        user_address: 'test-address',
        challenge: 'test-challenge-string',
        expires_at: new Date(Date.now() + 300000).toISOString(),
        is_used: true, // Already used
        created_at: new Date().toISOString(),
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
      mockAuditService.logEvent.mockResolvedValue({} as any);

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

      expect(mockTokenService.invalidateSession).toHaveBeenCalledWith(
        'test-address',
        'test-client'
      );
      expect(mockAuditService.logEvent).toHaveBeenCalled();
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
