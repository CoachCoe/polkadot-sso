import { Database } from 'sqlite';
import { AuditService } from '../services/auditService';
import { CredentialService } from '../services/credentialService';

describe('CredentialService', () => {
  let credentialService: CredentialService;
  let auditService: AuditService;
  let mockDb: jest.Mocked<Database>;

  const testAddress = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
  const testUserAddress = '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty';

  beforeEach(() => {
    mockDb = {
      get: jest.fn(),
      run: jest.fn(),
      all: jest.fn(),
    } as unknown as jest.Mocked<Database>;

    // Set up required environment variables for testing
    process.env.DATABASE_ENCRYPTION_KEY = 'test-encryption-key-32-chars-long';
    process.env.JWT_SECRET = 'test-jwt-secret-key';

    auditService = new AuditService(mockDb);
    credentialService = new CredentialService(mockDb);
  });

  describe('User Profiles', () => {
    it('should create a user profile', async () => {
      const profileData = {
        display_name: 'Test User',
        email: 'test@example.com',
        bio: 'Test bio',
      };

      mockDb.run.mockResolvedValue({ lastID: 1 } as any);
      mockDb.get.mockResolvedValue({ id: 1, address: testAddress, ...profileData } as any);

      const profile = await credentialService.createUserProfile(testAddress, profileData);

      expect(profile).toBeDefined();
      expect(profile.address).toBe(testAddress);
      expect(profile.display_name).toBe(profileData.display_name);
    });

    it('should get a user profile', async () => {
      const profileData = {
        id: 1,
        address: testAddress,
        display_name: 'Test User',
        email: 'test@example.com',
      };

      mockDb.get.mockResolvedValue(profileData as any);

      const profile = await credentialService.getUserProfile(testAddress);

      expect(profile).toBeDefined();
      expect(profile?.address).toBe(testAddress);
    });
  });

  describe('Credential Types', () => {
    it('should create a credential type', async () => {
      const typeData = {
        name: 'Test Credential',
        description: 'Test description',
        schema_version: '1.0.0',
        schema_definition: '{"type": "object"}',
        issuer_pattern: '^5.*$',
        required_fields: JSON.stringify(['field1']),
        optional_fields: JSON.stringify(['field2']),
        validation_rules: JSON.stringify({}),
        is_active: true,
      };

      mockDb.run.mockResolvedValue({ lastID: 1 } as any);
      mockDb.get.mockResolvedValue({ id: 'test-id', created_by: testAddress, ...typeData } as any);

      const credentialType = await credentialService.createCredentialType(testAddress, typeData);

      expect(credentialType).toBeDefined();
      expect(credentialType.name).toBe(typeData.name);
    });

    it('should get active credential types', async () => {
      const types = [
        { id: '1', name: 'Type 1', is_active: true },
        { id: '2', name: 'Type 2', is_active: true },
      ];

      mockDb.all.mockResolvedValue(types as any);

      const result = await credentialService.getActiveCredentialTypes();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Type 1');
    });
  });

  describe('Credentials', () => {
    it('should create a credential', async () => {
      const credentialData = {
        credential_type_id: 'test-type-id',
        credential_data: { field1: 'value1' },
        expires_at: Date.now() + 86400000,
      };

      mockDb.run.mockResolvedValue({ lastID: 1 } as any);
      mockDb.get.mockResolvedValue({
        id: 'test-credential-id',
        user_address: testUserAddress,
        issuer_address: testAddress,
        ...credentialData,
      } as any);

      const credential = await credentialService.createCredential(
        testAddress,
        testUserAddress,
        credentialData
      );

      expect(credential).toBeDefined();
      expect(credential.user_address).toBe(testUserAddress);
      expect(credential.issuer_address).toBe(testAddress);
    });

    it('should get user credentials', async () => {
      const credentials = [
        { id: '1', user_address: testUserAddress, status: 'active' },
        { id: '2', user_address: testUserAddress, status: 'active' },
      ];

      mockDb.all.mockResolvedValue(credentials as any);

      const result = await credentialService.getUserCredentials(testUserAddress);

      expect(result).toHaveLength(2);
      expect(result[0].user_address).toBe(testUserAddress);
    });
  });

  describe('Credential Sharing', () => {
    it('should share a credential', async () => {
      const shareData = {
        credential_id: 'test-credential-id',
        shared_with_address: '5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y',
        permissions: ['read', 'verify'],
        access_level: 'read' as const,
        expires_at: Date.now() + 86400000,
      };

      mockDb.run.mockResolvedValue({ lastID: 1 } as any);
      mockDb.get.mockResolvedValue({
        id: 'test-share-id',
        ...shareData,
      } as any);

      const share = await credentialService.shareCredential(testAddress, shareData);

      expect(share).toBeDefined();
      expect(share.credential_id).toBe(shareData.credential_id);
    });
  });

  describe('Credential Verification', () => {
    it('should verify a credential', async () => {
      const verificationData = {
        credential_id: 'test-credential-id',
        verification_type: 'manual' as const,
        verification_data: { verified_by: 'Test Verifier' },
        notes: 'Test verification',
      };

      mockDb.run.mockResolvedValue({ lastID: 1 } as any);
      mockDb.get.mockResolvedValue({
        id: 'test-verification-id',
        verifier_address: testAddress,
        status: 'verified',
        verified_at: new Date().toISOString(),
        ...verificationData,
      } as any);

      const verification = await credentialService.verifyCredential(testAddress, verificationData);

      expect(verification).toBeDefined();
      expect(verification.credential_id).toBe(verificationData.credential_id);
      expect(verification.status).toBe('verified');
    });
  });

  describe('Issuance Requests', () => {
    it('should create an issuance request', async () => {
      const requestData = {
        issuer_address: testAddress,
        credential_type_id: 'test-type-id',
        request_data: { field1: 'value1' },
        expires_at: Date.now() + 86400000,
      };

      mockDb.run.mockResolvedValue({ lastID: 1 } as any);
      mockDb.get.mockResolvedValue({
        id: 'test-request-id',
        requester_address: testUserAddress,
        status: 'pending',
        ...requestData,
      } as any);

      const request = await credentialService.createIssuanceRequest(testUserAddress, requestData);

      expect(request).toBeDefined();
      expect(request.requester_address).toBe(testUserAddress);
      expect(request.status).toBe('pending');
    });

    it('should approve an issuance request', async () => {
      mockDb.run.mockResolvedValue({} as any);
      mockDb.get.mockResolvedValue({
        id: 'test-request-id',
        status: 'approved',
      } as any);

      await expect(
        credentialService.approveIssuanceRequest('test-request-id', testAddress)
      ).resolves.not.toThrow();
    });
  });
});
