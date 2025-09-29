import { PolkadotAuthConfig, PolkadotAuthResult, PolkadotWalletInfo, PolkadotAccount } from './types.js';

export interface PolkadotWallet {
  name: string;
  icon: string;
  url: string;
  extensionId?: string;
  installed: boolean;
  connect(): Promise<PolkadotAccount[]>;
  signMessage(message: string, account: PolkadotAccount): Promise<string>;
  disconnect(): Promise<void>;
}

export function polkadotAuthClient(config: PolkadotAuthConfig) {
  let currentAccount: PolkadotAccount | null = null;
  let currentWallet: PolkadotWallet | null = null;
  const eventListeners: Map<string, Set<Function>> = new Map();
  
  const validateConfig = () => {
    if (!config.domain) {
      throw new Error('PolkadotAuth: domain is required');
    }
  };
  
  const setupEventListeners = () => {
    if (typeof window === 'undefined') {
      return;
    }
    
    window.addEventListener('polkadot-wallet-connect', handleWalletConnect as EventListener);
    window.addEventListener('polkadot-wallet-disconnect', handleWalletDisconnect as EventListener);
    window.addEventListener('polkadot-account-change', handleAccountChange as EventListener);
  };
  
  const handleWalletConnect = (event: Event) => {
    const customEvent = event as CustomEvent;
    emit('connected', customEvent.detail);
  };
  
  const handleWalletDisconnect = (event: Event) => {
    const customEvent = event as CustomEvent;
    currentAccount = null;
    currentWallet = null;
    emit('disconnected', customEvent.detail);
  };
  
  const handleAccountChange = (event: Event) => {
    const customEvent = event as CustomEvent;
    currentAccount = customEvent.detail.account;
    emit('accountChanged', customEvent.detail);
  };
  
  const emit = (event: string, data: any) => {
    const listeners = eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  };
  
  const getAvailableWallets = async (): Promise<PolkadotWalletInfo[]> => {
    if (typeof window === 'undefined') {
      return [];
    }
    
    const isNovaWallet = (window as any).walletExtension?.isNovaWallet ?? false;
    
    const wallets: PolkadotWalletInfo[] = [
      {
        name: 'Polkadot.js',
        icon: 'https://polkadot.js.org/favicon.ico',
        url: 'https://polkadot.js.org/extension/',
        extensionId: 'nkbihfbeogaeaoehlefnkodbefgpgknn',
        installed: isWalletInstalled('polkadot-js')
      },
      {
        name: 'Nova Wallet',
        icon: 'https://novawallet.io/favicon.ico',
        url: 'https://novawallet.io/',
        extensionId: 'polkadot-js',
        installed: isNovaWallet || isWalletInstalled('polkadot-js')
      },
      {
        name: 'Talisman',
        icon: 'https://talisman.xyz/favicon.ico',
        url: 'https://talisman.xyz/',
        extensionId: 'bifkfkmjfkjfkjfkjfkjfkjfkjfkjfk',
        installed: isWalletInstalled('talisman')
      },
      {
        name: 'SubWallet',
        icon: 'https://subwallet.app/favicon.ico',
        url: 'https://subwallet.app/',
        extensionId: 'subwallet-extension',
        installed: isWalletInstalled('subwallet')
      }
    ];
    
    return wallets;
  };
  
  const isWalletInstalled = (walletName: string): boolean => {
    if (typeof window === 'undefined') {
      return false;
    }
    
    const walletMap: Record<string, string> = {
      'polkadot-js': 'polkadot-js',
      'talisman': 'talisman',
      'subwallet': 'subwallet'
    };
    
    const extensionName = walletMap[walletName];
    if (!extensionName) {
      return false;
    }
    
    return !!(window as any).injectedWeb3?.[extensionName];
  };
  
  const connectWallet = async (walletName: string): Promise<PolkadotAccount[]> => {
    if (typeof window === 'undefined') {
      throw new Error('Wallet connection is only available in browser environment');
    }
    
    const wallet = await getWallet(walletName);
    if (!wallet) {
      throw new Error(`Wallet ${walletName} is not available`);
    }
    
    const accounts = await wallet.connect();
    currentWallet = wallet;
    
    if (accounts.length > 0) {
      currentAccount = accounts[0];
    }
    
    return accounts;
  };
  
  const getWallet = async (walletName: string): Promise<PolkadotWallet | null> => {
    if (typeof window === 'undefined') {
      return null;
    }
    
    const isNovaWallet = (window as any).walletExtension?.isNovaWallet ?? false;
    
    const walletMap: Record<string, string> = {
      'Polkadot.js': 'polkadot-js',
      'Nova Wallet': isNovaWallet ? 'polkadot-js' : 'polkadot-js',
      'Talisman': 'talisman',
      'SubWallet': 'subwallet'
    };
    
    const extensionName = walletMap[walletName];
    if (!extensionName) {
      return null;
    }
    
    const extension = (window as any).injectedWeb3?.[extensionName];
    if (!extension) {
      return null;
    }
    
    return new PolkadotWalletImpl(extensionName, extension, walletName === 'Nova Wallet');
  };
  
  const signIn = async (options: {
    walletName?: string;
    account?: PolkadotAccount;
    statement?: string;
    chainId?: string;
  } = {}): Promise<PolkadotAuthResult> => {
    try {
      validateConfig();
      setupEventListeners();
      
      let account = options.account || currentAccount;
      let wallet = currentWallet;
      
      if (!account && options.walletName) {
        const accounts = await connectWallet(options.walletName);
        if (accounts.length === 0) {
          throw new Error('No accounts found in wallet');
        }
        account = accounts[0];
      }
      
      if (!account) {
        throw new Error('No account selected');
      }
      
      if (!wallet) {
        throw new Error('No wallet connected');
      }
      
      const nonce = generateNonce();
      const message = createMessage(account.address, nonce);
      const signature = await wallet.signMessage(message, account);
      
      const result: PolkadotAuthResult = {
        success: true,
        address: account.address,
        chainId: options.chainId || config.chainId || 'polkadot',
        nonce,
        message,
        signature
      };
      
      if (config.enableIdentityResolution) {
        try {
          const identity = await resolveIdentity(account.address);
          if (identity) {
            result.identity = identity;
          }
        } catch (error) {
          console.warn('Identity resolution failed:', error);
        }
      }
      
      return result;
    } catch (error) {
      return {
        success: false,
        address: '',
        chainId: options.chainId || config.chainId || 'polkadot',
        nonce: '',
        message: '',
        signature: '',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  };
  
  const signOut = async (): Promise<void> => {
    if (currentWallet) {
      await currentWallet.disconnect();
    }
    
    currentAccount = null;
    currentWallet = null;
  };
  
  const getCurrentAccount = (): PolkadotAccount | null => {
    return currentAccount;
  };
  
  const isConnected = (): boolean => {
    return currentAccount !== null && currentWallet !== null;
  };
  
  const on = (event: 'connected' | 'disconnected' | 'accountChanged', callback: (data: any) => void): void => {
    if (!eventListeners.has(event)) {
      eventListeners.set(event, new Set());
    }
    eventListeners.get(event)!.add(callback);
  };
  
  const off = (event: 'connected' | 'disconnected' | 'accountChanged', callback: (data: any) => void): void => {
    const listeners = eventListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  };
  
  const generateNonce = (): string => {
    if (config.generateNonce) {
      return config.generateNonce();
    }
    
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };
  
  const createMessage = (address: string, nonce: string): string => {
    const message = `${config.appName || 'Polkadot App'} wants you to sign in with your Polkadot account:

${address}

${config.statement || 'Sign in with Polkadot'}

URI: ${config.uri || `https://${config.domain}`}
Version: ${config.appVersion || '1.0.0'}
Chain ID: ${config.chainId || 'polkadot'}
Nonce: ${nonce}
Issued At: ${new Date().toISOString()}`;
    
    return message;
  };
  
  const resolveIdentity = async (address: string): Promise<string | null> => {
    if (config.resolveIdentity) {
      return await config.resolveIdentity(address);
    }
    
    return null;
  };
  
  return {
    config,
    
    validateConfig,
    
    async init() {
      validateConfig();
      setupEventListeners();
    },
    
    getAvailableWallets,
    connectWallet,
    signIn,
    signOut,
    getCurrentAccount,
    isConnected,
    on,
    off
  };
}

export async function signInWithPolkadot(config: PolkadotAuthConfig, walletName: string = 'Polkadot.js'): Promise<PolkadotAuthResult> {
  const client = polkadotAuthClient(config);
  return await client.signIn({ walletName });
}

class PolkadotWalletImpl implements PolkadotWallet {
  constructor(
    public name: string,
    private extension: any,
    private isNova: boolean = false
  ) {}
  
  get icon(): string {
    if (this.isNova) {
      return 'https://novawallet.io/favicon.ico';
    }
    
    const icons: Record<string, string> = {
      'polkadot-js': 'https://polkadot.js.org/favicon.ico',
      'talisman': 'https://talisman.xyz/favicon.ico',
      'subwallet': 'https://subwallet.app/favicon.ico'
    };
    
    return icons[this.name] || '';
  }
  
  get url(): string {
    if (this.isNova) {
      return 'https://novawallet.io/';
    }
    
    const urls: Record<string, string> = {
      'polkadot-js': 'https://polkadot.js.org/extension/',
      'talisman': 'https://talisman.xyz/',
      'subwallet': 'https://subwallet.app/'
    };
    
    return urls[this.name] || '';
  }
  
  get installed(): boolean {
    return !!this.extension;
  }
  
  async connect(): Promise<PolkadotAccount[]> {
    if (!this.extension) {
      throw new Error(`Wallet ${this.name} is not installed`);
    }
    
    try {
      const accounts = await this.extension.accounts.get();
      
      return accounts.map((account: any) => ({
        address: account.address,
        name: account.name,
        source: this.isNova ? 'Nova Wallet' : this.name,
        type: account.type,
        publicKey: account.publicKey
      }));
    } catch (error) {
      throw new Error(`Failed to connect to ${this.name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  async signMessage(message: string, account: PolkadotAccount): Promise<string> {
    if (!this.extension) {
      throw new Error(`Wallet ${this.name} is not installed`);
    }
    
    try {
      const signature = await this.extension.signer.signRaw({
        address: account.address,
        data: message,
        type: 'bytes'
      });
      
      return signature.signature;
    } catch (error) {
      throw new Error(`Failed to sign message with ${this.name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  async disconnect(): Promise<void> {
  }
}