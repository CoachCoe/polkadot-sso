import { RemixAuthContext } from '../types';

export interface AuthProviderProps {
  children?: any;
  value?: RemixAuthContext;
}

export function AuthProvider(props: AuthProviderProps) {
  console.warn(
    'AuthProvider: This is a placeholder component. Please implement the actual React component in your application.'
  );

  return null;
}

export function useAuthContext() {
  console.warn(
    'useAuthContext: This is a placeholder hook. Please implement the actual React hook in your application.'
  );

  return {
    isAuthenticated: false,
    user: null,
    signIn: async () => {},
    signOut: async () => {},
  };
}
