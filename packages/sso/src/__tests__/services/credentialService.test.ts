import { getCacheStrategies } from '../../services/cacheService';
import { CredentialService } from '../../services/credentialService';

jest.mock('../../services/cacheService');
jest.mock('../../config/db');

const mockCacheStrategies = {
  getUserProfile: jest.fn(),
  setUserProfile: jest.fn(),
  deleteUserProfile: jest.fn(),
};

(getCacheStrategies as jest.Mock).mockReturnValue(mockCacheStrategies);

describe('CredentialService', () => {
  let credentialService: CredentialService;

  beforeEach(() => {
    credentialService = new CredentialService();
    jest.clearAllMocks();
  });

  describe('createUserProfile', () => {
    it('should create a new user profile', async () => {
      const address = 'test-address';
      const profileData = {
        name: 'Test User',
        email: 'test@example.com',
        avatar_url: 'https://example.com/avatar.jpg',
      };

      const result = await credentialService.createUserProfile(address, profileData);

      expect(result).toBeDefined();
      expect(result?.address).toBe(address);
      expect(result?.name).toBe(profileData.name);
      expect(result?.email).toBe(profileData.email);
      expect(result?.avatar_url).toBe(profileData.avatar_url);
      expect(result?.created_at).toBeDefined();
      expect(result?.updated_at).toBeDefined();
    });
  });

  describe('getUserProfile', () => {
    it('should retrieve a user profile', async () => {
      const address = 'test-address';
      const mockProfile = {
        address,
        name: 'Test User',
        email: 'test@example.com',
        avatar_url: 'https://example.com/avatar.jpg',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockCacheStrategies.getUserProfile.mockResolvedValue(mockProfile);

      const result = await credentialService.getUserProfile(address);

      expect(result).toBeDefined();
      expect(result?.address).toBe(address);
      expect(mockCacheStrategies.getUserProfile).toHaveBeenCalledWith(address);
    });

    it('should return undefined for non-existent profile', async () => {
      const address = 'non-existent-address';

      mockCacheStrategies.getUserProfile.mockResolvedValue(null);

      const result = await credentialService.getUserProfile(address);

      expect(result).toBeUndefined();
    });
  });

  describe('updateUserProfile', () => {
    it('should update an existing user profile', async () => {
      const address = 'test-address';
      const updateData = {
        name: 'Updated User',
        email: 'updated@example.com',
      };

      const result = await credentialService.updateUserProfile(address, updateData);

      expect(result).toBeDefined();
      expect(result?.address).toBe(address);
      expect(result?.name).toBe(updateData.name);
      expect(result?.email).toBe(updateData.email);
      expect(result?.updated_at).toBeDefined();
    });
  });

  describe('createCredentialType', () => {
    it('should create a new credential type', async () => {
      const request = {
        name: 'Test Credential',
        description: 'A test credential type',
        schema: { type: 'object', properties: { name: { type: 'string' } } },
        issuer_address: 'test-issuer',
      };

      const result = await credentialService.createCredentialType(request);

      expect(result).toBeDefined();
      expect(result?.name).toBe(request.name);
      expect(result?.description).toBe(request.description);
      expect(result?.schema).toEqual(request.schema);
      expect(result?.issuer_address).toBe(request.issuer_address);
      expect(result?.created_at).toBeDefined();
    });
  });

  describe('createCredential', () => {
    it('should create a new credential', async () => {
      const userAddress = 'test-user';
      const issuerAddress = 'test-issuer';
      const request = {
        credential_type_id: 'test-type-id',
        credential_data: { name: 'Test User', age: 25 },
        metadata: { source: 'test' },
      };

      const result = await credentialService.createCredential(userAddress, issuerAddress, request);

      expect(result).toBeDefined();
      expect(result?.user_address).toBe(userAddress);
      expect(result?.issuer_address).toBe(issuerAddress);
      expect(result?.credential_type_id).toBe(request.credential_type_id);
      expect(result?.credential_data).toEqual(request.credential_data);
      expect(result?.metadata).toEqual(request.metadata);
      expect(result?.created_at).toBeDefined();
    });
  });

  describe('getUserCredentials', () => {
    it('should retrieve user credentials', async () => {
      const userAddress = 'test-user';

      const result = await credentialService.getUserCredentials(userAddress);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getCredentialById', () => {
    it('should retrieve a credential by ID', async () => {
      const credentialId = 'test-credential-id';

      const result = await credentialService.getCredentialById(credentialId);

      expect(result).toBeDefined();
      expect(result?.id).toBe(credentialId);
    });

    it('should return undefined for non-existent credential', async () => {
      const credentialId = 'non-existent-id';

      const result = await credentialService.getCredentialById(credentialId);

      expect(result).toBeUndefined();
    });
  });

  describe('shareCredential', () => {
    it('should share a credential', async () => {
      const credentialId = 'test-credential-id';
      const shareRequest = {
        recipient_address: 'test-recipient',
        permissions: ['read'],
        expires_at: new Date(Date.now() + 86400000).toISOString(), // 24 hours
      };

      const result = await credentialService.shareCredential(credentialId, shareRequest);

      expect(result).toBeDefined();
      expect(result?.credential_id).toBe(credentialId);
      expect(result?.recipient_address).toBe(shareRequest.recipient_address);
      expect(result?.permissions).toEqual(shareRequest.permissions);
      expect(result?.expires_at).toBe(shareRequest.expires_at);
      expect(result?.created_at).toBeDefined();
    });
  });

  describe('getSharedCredentials', () => {
    it('should retrieve shared credentials for a user', async () => {
      const userAddress = 'test-user';

      const result = await credentialService.getSharedCredentials(userAddress);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('verifyCredential', () => {
    it('should verify a credential', async () => {
      const credentialId = 'test-credential-id';
      const verificationRequest = {
        verifier_address: 'test-verifier',
        verification_data: { purpose: 'test' },
      };

      const result = await credentialService.verifyCredential(credentialId, verificationRequest);

      expect(result).toBeDefined();
      expect(result?.credential_id).toBe(credentialId);
      expect(result?.verifier_address).toBe(verificationRequest.verifier_address);
      expect(result?.verification_data).toEqual(verificationRequest.verification_data);
      expect(result?.created_at).toBeDefined();
    });
  });

  describe('getCredentialVerifications', () => {
    it('should retrieve credential verifications', async () => {
      const credentialId = 'test-credential-id';

      const result = await credentialService.getCredentialVerifications(credentialId);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('requestCredentialIssuance', () => {
    it('should request credential issuance', async () => {
      const request = {
        user_address: 'test-user',
        credential_type_id: 'test-type-id',
        request_data: { reason: 'test' },
        issuer_address: 'test-issuer',
      };

      const result = await credentialService.requestCredentialIssuance(request);

      expect(result).toBeDefined();
      expect(result?.user_address).toBe(request.user_address);
      expect(result?.credential_type_id).toBe(request.credential_type_id);
      expect(result?.request_data).toEqual(request.request_data);
      expect(result?.issuer_address).toBe(request.issuer_address);
      expect(result?.status).toBe('pending');
      expect(result?.created_at).toBeDefined();
    });
  });

  describe('getCredentialStats', () => {
    it('should return credential statistics', async () => {
      const stats = await credentialService.getCredentialStats();

      expect(stats).toBeDefined();
      expect(typeof stats.totalCredentials).toBe('number');
      expect(typeof stats.totalCredentialTypes).toBe('number');
      expect(typeof stats.totalShares).toBe('number');
      expect(typeof stats.totalVerifications).toBe('number');
    });
  });
});
