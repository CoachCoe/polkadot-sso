import { createContext, useContext } from 'react';
import { PolkadotAuthContextType } from '../types';

const PolkadotAuthContext = createContext<PolkadotAuthContextType | null>(null);

export { PolkadotAuthContext };

export function usePolkadotAuthContext() {
  const context = useContext(PolkadotAuthContext);
  if (!context) {
    throw new Error('usePolkadotAuthContext must be used within a PolkadotAuthProvider');
  }
  return context;
}
