'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

interface AuthState {
  isAuthenticated: boolean;
  user?: {
    address: string;
    chain: string;
    sessionId: string;
  };
}

export default function ProtectedPage() {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check authentication status
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/session');
        if (response.ok) {
          const session = await response.json();
          setAuthState({
            isAuthenticated: true,
            user: session.user,
          });
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      }
    };

    checkAuth();
  }, []);

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await fetch('/api/auth/signout', {
        method: 'POST',
      });
      setAuthState({ isAuthenticated: false });
      window.location.href = '/';
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!authState.isAuthenticated) {
    return (
      <main className='min-h-screen p-8'>
        <div className='max-w-4xl mx-auto'>
          <div className='bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded'>
            <strong>Access Denied:</strong> Please sign in to access this page.
            <Link href='/' className='ml-4 text-blue-600 hover:text-blue-800'>
              Go to Home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className='min-h-screen p-8'>
      <div className='max-w-4xl mx-auto'>
        <h1 className='text-4xl font-bold mb-8'>Protected Content</h1>

        <div className='bg-white rounded-lg shadow-lg p-6 mb-8'>
          <h2 className='text-2xl font-semibold mb-4'>Welcome!</h2>
          <p className='mb-4'>This is a protected page that requires authentication.</p>

          <div className='bg-gray-100 p-4 rounded mb-4'>
            <h3 className='font-semibold mb-2'>User Information:</h3>
            <p>
              <strong>Address:</strong> {authState.user?.address}
            </p>
            <p>
              <strong>Chain:</strong> {authState.user?.chain}
            </p>
            <p>
              <strong>Session ID:</strong> {authState.user?.sessionId}
            </p>
          </div>

          <div className='flex gap-4'>
            <Link href='/' className='bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600'>
              Back to Home
            </Link>
            <button
              onClick={handleSignOut}
              disabled={isLoading}
              className='bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 disabled:bg-gray-400'
            >
              {isLoading ? 'Signing out...' : 'Sign Out'}
            </button>
          </div>
        </div>

        <div className='bg-white rounded-lg shadow-lg p-6'>
          <h2 className='text-2xl font-semibold mb-4'>Protected Features</h2>
          <ul className='space-y-2'>
            <li>🔒 This content is only visible to authenticated users</li>
            <li>🔐 Session management with automatic token handling</li>
            <li>🛡️ Route protection with middleware</li>
            <li>⚡ Real-time authentication state updates</li>
            <li>🎯 Type-safe user information</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
