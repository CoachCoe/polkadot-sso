import { TokenService } from '../services/token.js';
import { Database } from 'sqlite';

describe('TokenService', () => {
  let tokenService: TokenService;
  let mockDb: jest.Mocked<Database>;

  beforeEach(() => {
    mockDb = {
      get: jest.fn(),
      run: jest.fn(),
    } as any;
    tokenService = new TokenService(mockDb);
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

