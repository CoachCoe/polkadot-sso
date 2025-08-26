import { RemixAuthContext } from '../types';

export function useAuth(): RemixAuthContext {
  console.warn(
    'useAuth: This is a placeholder hook. Please implement the actual React hook in your application.'
  );

  return {
    isAuthenticated: false,
    signIn: async () => {
      console.warn('signIn: Implement wallet connection and signature flow');
    },
    signOut: async () => {
      console.warn('signOut: Implement sign out logic');
    },
  };
}

export function useAuthState() {
  console.warn(
    'useAuthState: This is a placeholder hook. Please implement the actual React hook in your application.'
  );

  return {
    isAuthenticated: false,
    user: null,
    isLoading: false,
    error: null,
  };
}

export function useSignIn() {
  console.warn(
    'useSignIn: This is a placeholder hook. Please implement the actual React hook in your application.'
  );

  return {
    signIn: async (address: string, chain: string) => {
      console.warn('signIn: Implement wallet connection and signature flow');
    },
    isLoading: false,
    error: null,
  };
}

export function useSignOut() {
  console.warn(
    'useSignOut: This is a placeholder hook. Please implement the actual React hook in your application.'
  );

  return {
    signOut: async () => {
      console.warn('signOut: Implement sign out logic');
    },
    isLoading: false,
  };
}
