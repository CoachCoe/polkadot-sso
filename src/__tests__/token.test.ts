import { Database } from 'sqlite';
import { TokenService } from '../services/token';

describe('TokenService', () => {
  let tokenService: TokenService;
  let mockDb: jest.Mocked<Database>;

  beforeEach(() => {
    mockDb = {
      get: jest.fn(),
      run: jest.fn(),
    } as unknown as jest.Mocked<Database>;
    tokenService = new TokenService(mockDb);

    // Set up JWT secret for testing
    process.env.JWT_SECRET = 'test-secret-key-for-testing-only';
  });

  it('should generate valid tokens', () => {
    const { accessToken, refreshToken, fingerprint } = tokenService.generateTokens(
      'test-address',
      'test-client'
    );

    expect(accessToken).toBeDefined();
    expect(refreshToken).toBeDefined();
    expect(fingerprint).toBeDefined();
  });
});
