declare global {
  interface Window {
    injectedWeb3: {
      'polkadot-js': {
        enable: (name: string) => Promise<any>;
        signer: any;
      };
    };
    polkadotExtensionDapp: {
      web3Enable: (name: string) => Promise<any[]>;
    };
    CHALLENGE_DATA: {
      address: string;
      message: string;
      challengeId: string;
    };
    SSO_CONFIG: {
      clientId: string;
      appName: string;
    };
  }
}

export {}; 