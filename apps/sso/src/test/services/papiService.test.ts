import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PapiService } from '../../services/papiService.js';

// Mock @polkadot/api
vi.mock('@polkadot/api', () => ({
  ApiPromise: {
    create: vi.fn().mockResolvedValue({
      disconnect: vi.fn().mockResolvedValue(undefined),
      query: {
        system: {
          account: vi.fn().mockResolvedValue({
            toHuman: vi.fn().mockReturnValue({
              data: {
                free: '1000000000000',
                reserved: '0',
                frozen: '0',
              },
            }),
          }),
        },
      },
      rpc: {
        system: {
          properties: vi.fn().mockResolvedValue({
            toHuman: vi.fn().mockReturnValue({
              ss58Format: 0,
              tokenDecimals: 10,
              tokenSymbol: 'DOT',
            }),
          }),
        },
      },
    }),
  },
  WsProvider: vi.fn().mockImplementation(() => ({})),
}));

// Mock @polkadot/keyring
vi.mock('@polkadot/keyring', () => ({
  Keyring: vi.fn().mockImplementation(() => ({
    addFromAddress: vi.fn().mockReturnValue({
      verify: vi.fn().mockReturnValue(true),
      publicKey: new Uint8Array(32),
    }),
  })),
}));

// Mock @polkadot/util-crypto
vi.mock('@polkadot/util-crypto', () => ({
  cryptoWaitReady: vi.fn().mockResolvedValue(true),
}));

describe('PapiService', () => {
  let papiService: PapiService;
  const testConfig = {
    polkadotRpc: 'wss://test-polkadot-rpc',
    kusamaRpc: 'wss://test-kusama-rpc',
    lightClientEnabled: false,
    fallbackToPolkadotJs: true,
    typeDescriptors: {
      polkadot: '',
      kusama: '',
    },
  };

  beforeEach(async () => {
    papiService = new PapiService(testConfig);
    await papiService.initialize();
  });

  describe('initialize', () => {
    it('should initialize successfully', async () => {
      expect(papiService).toBeDefined();
    });

    it('should establish API connections', async () => {
      const availableChains = papiService.getAvailableChains();
      expect(availableChains).toContain('polkadot');
      expect(availableChains).toContain('kusama');
    });
  });

  describe('verifySignature', () => {
    it('should verify signature successfully', async () => {
      const testMessage = 'test message';
      const testSignature = 'test-signature';
      const testAddress = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
      const testChain = 'polkadot';

      const result = await papiService.verifySignature(testMessage, testSignature, testAddress, testChain);

      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('address');
      expect(result).toHaveProperty('chain');

      expect(result.isValid).toBe(true);
      expect(result.address).toBe(testAddress);
      expect(result.chain).toBe(testChain);
    });

    it('should return false for invalid signature', async () => {
      const testMessage = 'test message';
      const testSignature = 'invalid-signature';
      const testAddress = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
      const testChain = 'polkadot';

      // Mock the keyring pair's verify method to return false
      const mockPair = {
        verify: vi.fn().mockReturnValue(false),
        publicKey: new Uint8Array(32),
      };
      
      // Mock the keyring's addFromAddress method
      const mockKeyring = {
        addFromAddress: vi.fn().mockReturnValue(mockPair),
      };
      
      // Replace the keyring in the service
      (papiService as any).keyring = mockKeyring;

      const result = await papiService.verifySignature(testMessage, testSignature, testAddress, testChain);

      expect(result.isValid).toBe(false);
      expect(result.address).toBe(testAddress);
      expect(result.chain).toBe(testChain);
      expect(mockPair.verify).toHaveBeenCalledWith(
        new TextEncoder().encode(testMessage), 
        new TextEncoder().encode(testSignature), 
        mockPair.publicKey
      );
    });

    it('should handle error for unavailable chain', async () => {
      const testMessage = 'test message';
      const testSignature = 'test-signature';
      const testAddress = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
      const unavailableChain = 'unavailable-chain';

      const result = await papiService.verifySignature(testMessage, testSignature, testAddress, unavailableChain);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('API not available for chain');
    });
  });

  describe('getAccountInfo', () => {
    it('should get account info successfully', async () => {
      const testAddress = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
      const testChain = 'polkadot';

      const result = await papiService.getAccountInfo(testAddress, testChain);

      expect(result).toBeDefined();
      expect(result.toHuman).toBeDefined();
    });

    it('should throw error for unavailable chain', async () => {
      const testAddress = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
      const unavailableChain = 'unavailable-chain';

      await expect(papiService.getAccountInfo(testAddress, unavailableChain)).rejects.toThrow(
        'API not available for chain'
      );
    });
  });

  describe('getChainProperties', () => {
    it('should get chain properties successfully', async () => {
      const testChain = 'polkadot';

      const result = await papiService.getChainProperties(testChain);

      expect(result).toBeDefined();
      expect(result.toHuman).toBeDefined();
    });

    it('should throw error for unavailable chain', async () => {
      const unavailableChain = 'unavailable-chain';

      await expect(papiService.getChainProperties(unavailableChain)).rejects.toThrow(
        'API not available for chain'
      );
    });
  });

  describe('isChainAvailable', () => {
    it('should return true for available chains', () => {
      expect(papiService.isChainAvailable('polkadot')).toBe(true);
      expect(papiService.isChainAvailable('kusama')).toBe(true);
    });

    it('should return false for unavailable chains', () => {
      expect(papiService.isChainAvailable('unavailable-chain')).toBe(false);
    });
  });

  describe('getAvailableChains', () => {
    it('should return list of available chains', () => {
      const chains = papiService.getAvailableChains();

      expect(Array.isArray(chains)).toBe(true);
      expect(chains).toContain('polkadot');
      expect(chains).toContain('kusama');
    });
  });

  describe('disconnect', () => {
    it('should disconnect from all APIs', async () => {
      await papiService.disconnect();

      // After disconnect, no chains should be available
      const chains = papiService.getAvailableChains();
      expect(chains).toHaveLength(0);
    });
  });

  describe('validateConfig', () => {
    it('should validate a complete config', () => {
      const validConfig = {
        polkadotRpc: 'wss://polkadot-rpc.polkadot.io',
        kusamaRpc: 'wss://kusama-rpc.polkadot.io',
        lightClientEnabled: true,
        fallbackToPolkadotJs: true,
        typeDescriptors: {
          polkadot: 'polkadot-types',
          kusama: 'kusama-types',
        },
      };

      const result = PapiService.validateConfig(validConfig);

      expect(result).toEqual(validConfig);
    });

    it('should throw error for missing Polkadot RPC', () => {
      const invalidConfig = {
        kusamaRpc: 'wss://kusama-rpc.polkadot.io',
      };

      expect(() => PapiService.validateConfig(invalidConfig)).toThrow(
        'Polkadot RPC URL is required'
      );
    });

    it('should throw error for missing Kusama RPC', () => {
      const invalidConfig = {
        polkadotRpc: 'wss://polkadot-rpc.polkadot.io',
      };

      expect(() => PapiService.validateConfig(invalidConfig)).toThrow(
        'Kusama RPC URL is required'
      );
    });

    it('should use default values when not provided', () => {
      const configWithoutDefaults = {
        polkadotRpc: 'wss://polkadot-rpc.polkadot.io',
        kusamaRpc: 'wss://kusama-rpc.polkadot.io',
      };

      const result = PapiService.validateConfig(configWithoutDefaults);

      expect(result.lightClientEnabled).toBe(false);
      expect(result.fallbackToPolkadotJs).toBe(true);
      expect(result.typeDescriptors.polkadot).toBe('');
      expect(result.typeDescriptors.kusama).toBe('');
    });
  });
});
