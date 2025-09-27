import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TalismanMobileService } from '../../services/talismanMobileService.js';

// Mock qrcode
vi.mock('qrcode', () => ({
  default: {
    toString: vi.fn().mockResolvedValue('<svg>test-qr-code</svg>'),
  },
}));

describe('TalismanMobileService', () => {
  let talismanMobileService: TalismanMobileService;
  const testConfig = {
    deepLinkScheme: 'talisman://',
    callbackUrl: 'http://localhost:3001/api/auth/mobile/callback',
    qrCodePollingInterval: 2000,
    qrCodeTimeout: 300000,
  };
  const testJwtSecret = 'test-jwt-secret';

  beforeEach(() => {
    talismanMobileService = new TalismanMobileService(testConfig, testJwtSecret);
  });

  describe('generateChallenge', () => {
    it('should generate a valid challenge', () => {
      const testAddress = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
      const testClientId = 'demo-client';

      const challenge = talismanMobileService.generateChallenge(testAddress, testClientId);

      expect(challenge).toHaveProperty('challengeId');
      expect(challenge).toHaveProperty('deepLinkUrl');
      expect(challenge).toHaveProperty('qrCodeData');
      expect(challenge).toHaveProperty('pollingToken');
      expect(challenge).toHaveProperty('expiresAt');
      expect(challenge).toHaveProperty('nonce');

      expect(challenge.challengeId).toBeDefined();
      expect(challenge.deepLinkUrl).toContain('talisman://auth?payload=');
      expect(challenge.qrCodeData).toBeDefined();
      expect(challenge.pollingToken).toBeDefined();
      expect(challenge.expiresAt).toBeGreaterThan(Date.now());
      expect(challenge.nonce).toBeDefined();
    });

    it('should generate unique challenges', () => {
      const testAddress = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
      const testClientId = 'demo-client';

      const challenge1 = talismanMobileService.generateChallenge(testAddress, testClientId);
      const challenge2 = talismanMobileService.generateChallenge(testAddress, testClientId);

      expect(challenge1.challengeId).not.toBe(challenge2.challengeId);
      expect(challenge1.pollingToken).not.toBe(challenge2.pollingToken);
      expect(challenge1.nonce).not.toBe(challenge2.nonce);
    });

    it('should include address and client ID in challenge', () => {
      const testAddress = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
      const testClientId = 'demo-client';

      const challenge = talismanMobileService.generateChallenge(testAddress, testClientId);

      const qrCodeData = JSON.parse(challenge.qrCodeData);
      expect(qrCodeData.address).toBe(testAddress);
      expect(qrCodeData.clientId).toBe(testClientId);
    });
  });

  describe('generateQRCode', () => {
    it('should generate QR code as SVG', async () => {
      const testData = 'test-qr-data';

      const qrCode = await talismanMobileService.generateQRCode(testData);

      expect(qrCode).toBe('<svg>test-qr-code</svg>');
    });

    it('should throw error for invalid QR code generation', async () => {
      const { default: QRCode } = await import('qrcode');
      vi.mocked(QRCode.toString).mockRejectedValueOnce(new Error('QR code generation failed'));

      await expect(talismanMobileService.generateQRCode('test-data')).rejects.toThrow(
        'Failed to generate QR code'
      );
    });
  });

  describe('pollChallenge', () => {
    it('should return pending status for active challenge', () => {
      const testAddress = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
      const testClientId = 'demo-client';

      const challenge = talismanMobileService.generateChallenge(testAddress, testClientId);
      const result = talismanMobileService.pollChallenge(challenge.challengeId);

      expect(result.status).toBe('pending');
    });

    it('should return not_found for non-existent challenge', () => {
      const result = talismanMobileService.pollChallenge('non-existent-challenge-id');

      expect(result.status).toBe('not_found');
    });

    it('should return expired for expired challenge', () => {
      const testAddress = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
      const testClientId = 'demo-client';

      const challenge = talismanMobileService.generateChallenge(testAddress, testClientId);
      
      // Manually expire the challenge
      (challenge as any).expiresAt = Date.now() - 1000;

      const result = talismanMobileService.pollChallenge(challenge.challengeId);

      expect(result.status).toBe('expired');
    });
  });

  describe('verifySignature', () => {
    it('should verify signature successfully', async () => {
      const testAddress = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
      const testClientId = 'demo-client';
      const testSignature = 'test-signature';

      const challenge = talismanMobileService.generateChallenge(testAddress, testClientId);
      const result = await talismanMobileService.verifySignature(
        challenge.challengeId,
        testSignature,
        testAddress
      );

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('expiresIn');
      expect(result).toHaveProperty('user');

      expect(result.accessToken).toBeDefined();
      expect(result.expiresIn).toBe(3600);
      expect(result.user.address).toBe(testAddress);
      expect(result.user.chain).toBe('polkadot');
      expect(result.user.wallet).toBe('talisman-mobile');
    });

    it('should throw error for non-existent challenge', async () => {
      const testAddress = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
      const testSignature = 'test-signature';

      await expect(
        talismanMobileService.verifySignature('non-existent-challenge-id', testSignature, testAddress)
      ).rejects.toThrow('Challenge not found or expired');
    });

    it('should throw error for expired challenge', async () => {
      const testAddress = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
      const testClientId = 'demo-client';
      const testSignature = 'test-signature';

      const challenge = talismanMobileService.generateChallenge(testAddress, testClientId);
      
      // Manually expire the challenge
      (challenge as any).expiresAt = Date.now() - 1000;

      await expect(
        talismanMobileService.verifySignature(challenge.challengeId, testSignature, testAddress)
      ).rejects.toThrow('Challenge has expired');
    });
  });

  describe('getChallenge', () => {
    it('should return challenge if exists', () => {
      const testAddress = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
      const testClientId = 'demo-client';

      const challenge = talismanMobileService.generateChallenge(testAddress, testClientId);
      const retrievedChallenge = talismanMobileService.getChallenge(challenge.challengeId);

      expect(retrievedChallenge).toEqual(challenge);
    });

    it('should return null for non-existent challenge', () => {
      const result = talismanMobileService.getChallenge('non-existent-challenge-id');

      expect(result).toBeNull();
    });
  });

  describe('validateConfig', () => {
    it('should validate a complete config', () => {
      const validConfig = {
        deepLinkScheme: 'talisman://',
        callbackUrl: 'http://localhost:3001/api/auth/mobile/callback',
        qrCodePollingInterval: 2000,
        qrCodeTimeout: 300000,
      };

      const result = TalismanMobileService.validateConfig(validConfig);

      expect(result).toEqual(validConfig);
    });

    it('should throw error for missing deep link scheme', () => {
      const invalidConfig = {
        callbackUrl: 'http://localhost:3001/api/auth/mobile/callback',
      };

      expect(() => TalismanMobileService.validateConfig(invalidConfig)).toThrow(
        'Talisman Mobile deep link scheme is required'
      );
    });

    it('should throw error for missing callback URL', () => {
      const invalidConfig = {
        deepLinkScheme: 'talisman://',
      };

      expect(() => TalismanMobileService.validateConfig(invalidConfig)).toThrow(
        'Talisman Mobile callback URL is required'
      );
    });

    it('should use default values when not provided', () => {
      const configWithoutDefaults = {
        deepLinkScheme: 'talisman://',
        callbackUrl: 'http://localhost:3001/api/auth/mobile/callback',
      };

      const result = TalismanMobileService.validateConfig(configWithoutDefaults);

      expect(result.qrCodePollingInterval).toBe(2000);
      expect(result.qrCodeTimeout).toBe(300000);
    });
  });
});
