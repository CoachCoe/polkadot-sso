import { ChainConfig, Session, WalletProvider } from '@polkadot-auth/core';

export interface PolkadotAuthContextType {
  isConnected: boolean;
  address: string | null;
  session: Session | null;
  providers: WalletProvider[];
  chains: ChainConfig[];
  connect: (providerId: string) => Promise<void>;
  disconnect: () => Promise<void>;
  signMessage: (message: string) => Promise<string>;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

export interface PolkadotSignInButtonProps {
  onSignIn?: (address: string, session: Session) => void;
  onError?: (error: string) => void;
  className?: string;
  children?: React.ReactNode;
  disabled?: boolean;
}

export interface WalletSelectorProps {
  providers: WalletProvider[];
  onSelect: (providerId: string) => void;
  className?: string;
  disabled?: boolean;
}

export interface PolkadotProfileProps {
  address: string;
  session?: Session | null;
  onDisconnect?: () => void;
  className?: string;
  showBalance?: boolean;
  showChain?: boolean;
}

export interface PolkadotAuthProviderProps {
  children: React.ReactNode;
  config?: {
    defaultChain?: string;
    providers?: string[];
    autoConnect?: boolean;
  };
}

export interface UsePolkadotAuthReturn {
  isConnected: boolean;
  address: string | null;
  session: Session | null;
  providers: WalletProvider[];
  chains: ChainConfig[];
  connect: (providerId: string) => Promise<void>;
  disconnect: () => Promise<void>;
  signMessage: (message: string) => Promise<string>;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}
