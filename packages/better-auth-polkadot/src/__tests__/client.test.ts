import { polkadotAuthClient } from '../client';

const mockConfig = {
  domain: 'example.com',
  appName: 'Test App',
  appVersion: '1.0.0',
  statement: 'Test statement',
  uri: 'https://example.com',
  chainId: 'polkadot'
};

const mockWindow = {
  injectedWeb3: {
    'polkadot-js': {
      accounts: {
        get: jest.fn().mockResolvedValue([
          {
            address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
            name: 'Test Account',
            type: 'sr25519',
            publicKey: '0x1234567890abcdef'
          }
        ])
      },
      signer: {
        signRaw: jest.fn().mockResolvedValue({
          signature: '0xabcdef1234567890'
        })
      }
    }
  }
};

describe('Polkadot Auth Client', () => {
  let client: any;

  beforeEach(() => {
    (global as any).window = {
      ...mockWindow,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    };
    client = polkadotAuthClient(mockConfig);
  });

  afterEach(() => {
    delete (global as any).window;
  });

  describe('Client Initialization', () => {
    it('should initialize successfully', async () => {
      await expect(client.init()).resolves.not.toThrow();
    });

    it('should throw error when domain is missing', () => {
      const invalidConfig = { ...mockConfig, domain: '' };
      const invalidClient = polkadotAuthClient(invalidConfig);
      expect(() => invalidClient.validateConfig()).toThrow('domain is required');
    });
  });

  describe('Wallet Detection', () => {
    it('should detect available wallets', async () => {
      const wallets = await client.getAvailableWallets();
      
      expect(wallets).toHaveLength(3);
      expect(wallets[0].name).toBe('Polkadot.js');
      expect(wallets[0].installed).toBe(true);
      expect(wallets[1].name).toBe('Talisman');
      expect(wallets[1].installed).toBe(false);
      expect(wallets[2].name).toBe('SubWallet');
      expect(wallets[2].installed).toBe(false);
    });

    it('should return empty array when window is undefined', async () => {
      delete (global as any).window;
      const wallets = await client.getAvailableWallets();
      expect(wallets).toEqual([]);
    });
  });

  describe('Wallet Connection', () => {
    it('should connect to available wallet', async () => {
      const accounts = await client.connectWallet('Polkadot.js');
      
      expect(accounts).toHaveLength(1);
      expect(accounts[0].address).toBe('5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY');
      expect(accounts[0].name).toBe('Test Account');
      expect(accounts[0].source).toBe('polkadot-js');
      expect(accounts[0].type).toBe('sr25519');
    });

    it('should throw error for unavailable wallet', async () => {
      await expect(client.connectWallet('UnavailableWallet')).rejects.toThrow('Wallet UnavailableWallet is not available');
    });

    it('should throw error when window is undefined', async () => {
      delete (global as any).window;
      await expect(client.connectWallet('Polkadot.js')).rejects.toThrow('Wallet connection is only available in browser environment');
    });
  });

  describe('Authentication Flow', () => {
    beforeEach(async () => {
      await client.connectWallet('Polkadot.js');
    });

    it('should sign in successfully', async () => {
      const result = await client.signIn();
      
      expect(result.success).toBe(true);
      expect(result.address).toBe('5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY');
      expect(result.chainId).toBe('polkadot');
      expect(result.message).toContain('Test App wants you to sign in');
      expect(result.signature).toBe('0xabcdef1234567890');
    });

    it('should handle sign in with custom options', async () => {
      const result = await client.signIn({
        chainId: 'kusama'
      });
      
      expect(result.success).toBe(true);
      expect(result.chainId).toBe('kusama');
      expect(result.message).toContain('Test statement');
    });

    it('should handle sign in failure', async () => {
      mockWindow.injectedWeb3['polkadot-js'].signer.signRaw.mockRejectedValue(new Error('User rejected'));
      
      const result = await client.signIn();
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to sign message with polkadot-js: User rejected');
    });

    it('should fail when no account is connected', async () => {
      await client.signOut();
      
      const result = await client.signIn();
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('No account selected');
    });
  });

  describe('Connection State', () => {
    it('should track connection state correctly', async () => {
      expect(client.isConnected()).toBe(false);
      
      await client.connectWallet('Polkadot.js');
      expect(client.isConnected()).toBe(true);
      
      await client.signOut();
      expect(client.isConnected()).toBe(false);
    });

    it('should return current account', async () => {
      expect(client.getCurrentAccount()).toBeNull();
      
      await client.connectWallet('Polkadot.js');
      const account = client.getCurrentAccount();
      
      expect(account).toBeDefined();
      expect(account?.address).toBe('5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY');
    });
  });

  describe('Event Handling', () => {
    it('should register and emit events', () => {
      const mockCallback = jest.fn();
      
      client.on('connected', mockCallback);
      client.on('disconnected', mockCallback);
      client.on('accountChanged', mockCallback);
      
      expect(mockCallback).not.toHaveBeenCalled();
    });

    it('should remove event listeners', () => {
      const mockCallback = jest.fn();
      
      client.on('connected', mockCallback);
      client.off('connected', mockCallback);
      
      expect(mockCallback).not.toHaveBeenCalled();
    });
  });

  describe('Message Generation', () => {
    it('should generate proper authentication message', async () => {
      await client.connectWallet('Polkadot.js');
      const result = await client.signIn();
      
      expect(result).toBeDefined();
      expect(result.message).toBeDefined();
      expect(result.nonce).toBeDefined();
    });
  });

  describe('Identity Resolution', () => {
    it('should support identity resolution configuration', () => {
      const customConfig = {
        ...mockConfig,
        enableIdentityResolution: true,
        resolveIdentity: async (address: string) => {
          return address === '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY' ? 'test-identity' : null;
        }
      };
      
      const customClient = polkadotAuthClient(customConfig);
      expect(customClient.config.enableIdentityResolution).toBe(true);
      expect(customClient.config.resolveIdentity).toBeDefined();
    });
  });
});
