import { polkadotAuth } from '../server';
import { randomBytes } from 'crypto';

describe('Polkadot Auth Server Plugin', () => {
  const mockConfig = {
    domain: 'example.com',
    appName: 'Test App',
    appVersion: '1.0.0',
    statement: 'Test statement',
    uri: 'https://example.com',
    chainId: 'polkadot'
  };

  let plugin: any;

  beforeEach(() => {
    plugin = polkadotAuth(mockConfig);
  });

  describe('Plugin Structure', () => {
    it('should have correct plugin properties', () => {
      expect(plugin.id).toBe('polkadot');
      expect(plugin.name).toBe('Sign in with Polkadot');
      expect(plugin.version).toBe('1.0.0');
      expect(plugin.config).toEqual(mockConfig);
    });

    it('should initialize successfully', async () => {
      await expect(plugin.init()).resolves.not.toThrow();
    });
  });

  describe('Configuration Validation', () => {
    it('should throw error when domain is missing', () => {
      const invalidConfig = { ...mockConfig, domain: '' };
      const invalidPlugin = polkadotAuth(invalidConfig);
      expect(() => invalidPlugin.validateConfig()).toThrow('domain is required');
    });

    it('should set default values for missing config', () => {
      const minimalConfig = { domain: 'test.com' };
      const plugin = polkadotAuth(minimalConfig);
      plugin.validateConfig();
      
      expect(plugin.config.appName).toBe('Polkadot App');
      expect(plugin.config.appVersion).toBe('1.0.0');
      expect(plugin.config.statement).toBe('Sign in with Polkadot to Polkadot App');
      expect(plugin.config.uri).toBe('https://test.com');
      expect(plugin.config.chainId).toBe('polkadot');
    });
  });

  describe('Nonce Generation', () => {
    it('should generate a nonce', () => {
      const nonce = plugin.generateNonce();
      expect(nonce).toBeDefined();
      expect(typeof nonce).toBe('string');
      expect(nonce.length).toBeGreaterThan(0);
    });

    it('should use custom nonce generator when provided', () => {
      const customNonce = 'custom-nonce-123';
      const customConfig = {
        ...mockConfig,
        generateNonce: () => customNonce
      };
      const customPlugin = polkadotAuth(customConfig);
      
      expect(customPlugin.generateNonce()).toBe(customNonce);
    });
  });

  describe('Message Creation', () => {
    it('should create a properly formatted message', () => {
      const address = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
      const nonce = 'test-nonce-123';
      
      const message = plugin.createMessage(address, nonce);
      
      expect(message).toContain('Test App wants you to sign in');
      expect(message).toContain(address);
      expect(message).toContain('Test statement');
      expect(message).toContain('URI: https://example.com');
      expect(message).toContain('Version: 1.0.0');
      expect(message).toContain('Chain ID: polkadot');
      expect(message).toContain('Nonce: test-nonce-123');
      expect(message).toContain('Issued At:');
    });

    it('should include optional fields when provided', () => {
      const address = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
      const nonce = 'test-nonce-123';
      
      const message = plugin.createMessage(address, nonce);
      
      expect(message).toContain('Request ID:');
    });
  });

  describe('Address Validation', () => {
    it('should validate correct Polkadot addresses', () => {
      const validAddresses = [
        '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        '1234567890123456789012345678901234567890123456789012345678901234'
      ];

      validAddresses.forEach(address => {
        expect(plugin.validateAddress(address)).toBe(true);
      });
    });

    it('should reject invalid addresses', () => {
      const invalidAddresses = [
        '',
        'invalid',
        '123',
        '0xinvalid',
        null as any,
        undefined as any
      ];

      invalidAddresses.forEach(address => {
        expect(plugin.validateAddress(address)).toBe(false);
      });
    });

    it('should use custom validator when provided', () => {
      const customConfig = {
        ...mockConfig,
        validateAddress: (addr: string) => addr === 'custom-address'
      };
      const customPlugin = polkadotAuth(customConfig);
      
      expect(customPlugin.validateAddress('custom-address')).toBe(true);
      expect(customPlugin.validateAddress('other-address')).toBe(false);
    });
  });

  describe('RPC URL Resolution', () => {
    it('should return correct RPC URLs for supported chains', () => {
      const chains = {
        'polkadot': 'wss://rpc.polkadot.io',
        'kusama': 'wss://kusama-rpc.polkadot.io',
        'westend': 'wss://westend-rpc.polkadot.io',
        'asset-hub': 'wss://polkadot-asset-hub-rpc.polkadot.io'
      };

      Object.entries(chains).forEach(([chainId, expectedUrl]) => {
        const chainPlugin = polkadotAuth({ ...mockConfig, chainId });
        expect(chainPlugin.getRpcUrl()).toBe(expectedUrl);
      });
    });

    it('should return null for unsupported chains', () => {
      const unsupportedPlugin = polkadotAuth({ ...mockConfig, chainId: 'unsupported' });
      expect(unsupportedPlugin.getRpcUrl()).toBeNull();
    });
  });

  describe('Message Verification', () => {
    it('should use custom verifier when provided', async () => {
      const customConfig = {
        ...mockConfig,
        verifyMessage: async (message: string, signature: string, address: string) => {
          return message === 'test-message' && signature === 'test-signature' && address === 'test-address';
        }
      };
      const customPlugin = polkadotAuth(customConfig);
      
      expect(await customPlugin.verifyMessage('test-message', 'test-signature', 'test-address')).toBe(true);
      expect(await customPlugin.verifyMessage('wrong-message', 'test-signature', 'test-address')).toBe(false);
    });
  });

  describe('Identity Resolution', () => {
    it('should return null when identity resolution is disabled', async () => {
      const result = await plugin.resolveIdentity('5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY');
      expect(result).toBeNull();
    });

    it('should use custom resolver when provided', async () => {
      const customConfig = {
        ...mockConfig,
        enableIdentityResolution: true,
        resolveIdentity: async (address: string) => {
          return address === '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY' ? 'test-identity' : null;
        }
      };
      const customPlugin = polkadotAuth(customConfig);
      
      const result = await customPlugin.resolveIdentity('5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY');
      expect(result).toBe('test-identity');
      
      const nullResult = await customPlugin.resolveIdentity('other-address');
      expect(nullResult).toBeNull();
    });
  });
});
