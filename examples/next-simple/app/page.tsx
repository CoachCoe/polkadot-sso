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

export default function HomePage() {
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

  const handleSignIn = async () => {
    setIsLoading(true);
    try {
      // Mock sign-in for demo
      const address = '5EJP9eSB1HpzjpuCJrna8KMcA6mmgaT8W4gSmwHaVDn25gHQ';
      const chain = 'polkadot';

      // Get challenge
      const challengeResponse = await fetch(
        `/api/auth/challenge?client_id=next-client&address=${address}&chain_id=${chain}`
      );

      if (!challengeResponse.ok) {
        throw new Error('Failed to get challenge');
      }

      const challengeData = await challengeResponse.json();

      // Mock signature
      const mockSignature = '0x' + Math.random().toString(36).substring(2);

      // Verify signature
      const verifyResponse = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          signature: mockSignature,
          challenge_id: challengeData.challenge_id,
          address: address,
          message: challengeData.challenge,
        }),
      });

      if (!verifyResponse.ok) {
        throw new Error('Authentication failed');
      }

      const session = await verifyResponse.json();

      setAuthState({
        isAuthenticated: true,
        user: {
          address: address,
          chain: chain,
          sessionId: session.session.id,
        },
      });

      alert('Signed in successfully!');
    } catch (error) {
      console.error('Sign in failed:', error);
      alert('Sign in failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/signout', {
        method: 'POST',
      });
      setAuthState({ isAuthenticated: false });
      alert('Signed out successfully!');
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Polkadot Auth - Next.js Example</h1>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-4">Authentication Status</h2>

          {authState.isAuthenticated ? (
            <div className="space-y-4">
              <p className="text-green-600 font-medium">✅ Authenticated</p>
              <p><strong>Address:</strong> {authState.user?.address}</p>
              <p><strong>Chain:</strong> {authState.user?.chain}</p>
              <div className="flex gap-4">
                <Link
                  href="/protected"
                  className="inline-block bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                  View Protected Page
                </Link>
                <button
                  onClick={handleSignOut}
                  className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                >
                  Sign Out
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-red-600 font-medium">❌ Not Authenticated</p>
              <button
                onClick={handleSignIn}
                disabled={isLoading}
                className="bg-pink-600 text-white px-4 py-2 rounded hover:bg-pink-700 disabled:bg-gray-400"
              >
                {isLoading ? 'Signing in...' : 'Sign In with Polkadot'}
              </button>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Features</h2>
          <ul className="space-y-2">
            <li>✅ SIWE-style authentication messages</li>
            <li>✅ Multiple wallet support (Polkadot.js, Talisman, SubWallet)</li>
            <li>✅ Multi-chain support (Polkadot, Kusama, Westend, Rococo)</li>
            <li>✅ Nonce-based replay protection</li>
            <li>✅ Domain binding security</li>
            <li>✅ Next.js 14+ integration</li>
            <li>✅ TypeScript support</li>
            <li>✅ React hooks for state management</li>
            <li>✅ Ready-to-use UI components</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
