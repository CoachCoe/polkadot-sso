// React-specific exports for Remix adapter
// Note: These require React/Remix to be installed in the consuming application

export { useAuth, useAuthState, useSignIn, useSignOut } from './hooks/useAuth';
export { SignInButton } from './components/SignInButton';
export { AuthProvider, useAuthContext } from './components/AuthProvider';
