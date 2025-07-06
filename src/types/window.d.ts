interface InjectedExtension {
  enable: (appName: string) => Promise<{
    accounts: { get: () => Promise<{ address: string }[]> };
  }>;
  signer: unknown;
}

interface Window {
  injectedWeb3: {
    'polkadot-js': InjectedExtension;
  };
  polkadotExtensionDapp: {
    web3Enable: (name: string) => Promise<unknown[]>;
    web3FromAddress: (address: string) => Promise<{
      signer: {
        signRaw: (data: { address: string; data: string; type: 'bytes' }) => Promise<{ signature: string }>;
      };
    }>;
  };
  CHALLENGE_DATA: {
    address: string;
    message: string;
    challengeId: string;
    codeVerifier: string;
    state: string;
  };
  SSO_CONFIG: {
    clientId: string;
    appName: string;
  };
} 